'use client';

import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { DEFAULT_VIEWPORT, useMapStore } from '@/lib/store/map-store';
import {
  createDatacentersLayer,
  type AiCampusCollection,
  type AiCampusFeature,
} from './layers/datacenters-layer';
import {
  createCloudRegionsLayer,
  type CloudRegionCollection,
  type CloudRegionFeature,
} from './layers/cloud-regions-layer';
import {
  createOppositionLayer,
  type OppositionFightCollection,
  type OppositionFightFeature,
} from './layers/opposition-layer';
import {
  createCablesLayers,
  type CableCollection,
  type CableFeature,
} from './layers/cables-layer';
import {
  useAnimationClock,
  usePrefersReducedMotion,
} from '@/lib/hooks/use-animation-clock';
import { targetsForTicker } from '@/lib/ticker-map';

// Register the pmtiles:// protocol once per module load. Idempotent across HMR.
let protocolRegistered = false;
function ensurePmtilesProtocol(): void {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

/**
 * Temporary basemap URL. Swapped for our own Protomaps-built dark style in a
 * later card; OpenFreeMap's `liberty` is acceptable as a placeholder per the
 * card's note. It is dark-leaning by default in the Liberty style.
 */
const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export type MapProps = {
  /** AI-campus seed collection. Owner is responsible for fetching it. */
  data: AiCampusCollection | null;
  /** Cloud-region seed collection. Optional; layer is hidden when absent. */
  cloudRegions?: CloudRegionCollection | null;
  /** Opposition-fight seed collection. Optional; layer is hidden when absent. */
  oppositionData?: OppositionFightCollection | null;
  /** Submarine-cable seed collection. Optional; layer is hidden when absent. */
  cablesData?: CableCollection | null;
  /** Currently selected feature id, or null. Drives flyTo + layer highlight. */
  selectedId: string | null;
  /** Click handler for a campus dot. Pass `null` to clear. */
  onSelect: (id: string | null) => void;
  /** Click handler for a cloud-region buffer. Receives the GeoJSON feature. */
  onSelectCloudRegion?: (feature: CloudRegionFeature | null) => void;
  /** Click handler for an opposition fight. Receives the GeoJSON feature. */
  onSelectOpposition?: (feature: OppositionFightFeature | null) => void;
  /** Click handler for a submarine cable. Receives the GeoJSON feature. */
  onSelectCable?: (feature: CableFeature | null) => void;
};

/**
 * Full-bleed MapLibre + deck.gl map. Stateless wrt selection — the parent
 * owns it. The map reacts to `selectedId` by flying to the feature and
 * re-renders the layer so the selected dot can be highlighted.
 */
export function Map({
  data,
  cloudRegions = null,
  oppositionData = null,
  cablesData = null,
  selectedId,
  onSelect,
  onSelectCloudRegion,
  onSelectOpposition,
  onSelectCable,
}: MapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const setViewport = useMapStore((s) => s.setViewport);
  const setVisibleBbox = useMapStore((s) => s.setVisibleBbox);
  const datacentersVisible = useMapStore((s) => s.layers.datacenters);
  const cloudRegionsVisible = useMapStore((s) => s.layers.cloud_regions);
  const oppositionVisible = useMapStore((s) => s.layers.opposition);
  const cablesVisible = useMapStore((s) => s.layers.cables);
  const tickerFilter = useMapStore((s) => s.tickerFilter);

  // Resolve the ticker filter into highlight sets once per render. Pure
  // derivation; cheap enough not to bother memoising.
  const highlightTargets = useMemo(
    () => targetsForTicker(tickerFilter),
    [tickerFilter],
  );

  // Animation clock for the cables TripsLayer. Disabled when the user
  // prefers reduced motion or the cables layer itself is off — no point
  // burning a rAF loop for a hidden layer.
  const reducedMotion = usePrefersReducedMotion();
  const animationEnabled = cablesVisible && !!cablesData && !reducedMotion;
  const animationClockMs = useAnimationClock(animationEnabled);

  // Stable lookup for flyTo. Recomputed only when data identity changes.
  const featureById = useMemo(() => {
    // Disambiguate from the React component named `Map` in this module.
    const m = new globalThis.Map<string, AiCampusFeature>();
    if (data) for (const f of data.features) m.set(f.properties.id, f);
    return m;
  }, [data]);

  // --- Map lifecycle: create once, destroy on unmount. -----------------------
  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [DEFAULT_VIEWPORT.longitude, DEFAULT_VIEWPORT.latitude],
      zoom: DEFAULT_VIEWPORT.zoom,
      bearing: DEFAULT_VIEWPORT.bearing,
      pitch: DEFAULT_VIEWPORT.pitch,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('moveend', () => {
      const c = map.getCenter();
      setViewport({
        longitude: c.lng,
        latitude: c.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
      // Push the visible bounds for the HUD's stat reducer. MapLibre may
      // return west > east when the view wraps the antimeridian; the stats
      // helper handles that case directly.
      const b = map.getBounds();
      setVisibleBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    // Seed the bbox once the style has loaded so the HUD can render before
    // the user's first interaction.
    map.once('load', () => {
      const b = map.getBounds();
      setVisibleBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      overlay.finalize();
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [setViewport, setVisibleBbox]);

  // --- Layer: rebuild when data or selection changes. ------------------------
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const layers = [];
    // Cloud-region buffers render below the campus dots so they read as
    // background context rather than competing for clicks. deck.gl draws
    // earlier-indexed layers first, so this ordering is intentional.
    if (cloudRegions) {
      layers.push(
        createCloudRegionsLayer(cloudRegions, {
          visible: cloudRegionsVisible,
          highlightProviders: highlightTargets.cloudProviders,
          onClick: (feature) => onSelectCloudRegion?.(feature),
        }),
      );
    }
    // Cables render after cloud regions but before datacenters so the
    // animated trails pass behind campus dots — the dots are the
    // primary subject; cables are connective tissue.
    if (cablesData) {
      layers.push(
        ...createCablesLayers(cablesData, {
          visible: cablesVisible,
          currentTimeMs: animationClockMs,
          onClick: (feature) => onSelectCable?.(feature),
        }),
      );
    }
    if (data) {
      layers.push(
        createDatacentersLayer(data, {
          selectedId,
          visible: datacentersVisible,
          highlightOperators: highlightTargets.operators,
          onClick: (feature) => onSelect(feature.properties.id),
        }),
      );
    }
    // Opposition glyphs render on top of campus dots so the red ✕ overlays
    // any conflicting project — that visual stacking is the point.
    if (oppositionData) {
      layers.push(
        createOppositionLayer(oppositionData, {
          visible: oppositionVisible,
          onClick: (feature) => onSelectOpposition?.(feature),
        }),
      );
    }
    overlay.setProps({ layers });
  }, [
    data,
    cloudRegions,
    oppositionData,
    cablesData,
    selectedId,
    onSelect,
    onSelectCloudRegion,
    onSelectOpposition,
    onSelectCable,
    datacentersVisible,
    cloudRegionsVisible,
    oppositionVisible,
    cablesVisible,
    animationClockMs,
    highlightTargets,
  ]);

  // --- Fly-to when selection changes externally (URL load, deep link). ------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const f = featureById.get(selectedId);
    if (!f) return;
    const [lon, lat] = f.geometry.coordinates;
    if (typeof lon !== 'number' || typeof lat !== 'number') return;
    map.flyTo({
      center: [lon, lat],
      zoom: Math.max(map.getZoom(), 7),
      speed: 1.2,
      curve: 1.4,
      essential: true, // honors prefers-reduced-motion at the maplibre level
    });
  }, [selectedId, featureById]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full [&_.maplibregl-canvas]:cursor-grab [&_.maplibregl-canvas:active]:cursor-grabbing"
      role="region"
      aria-label="World datacenter map"
    />
  );
}
