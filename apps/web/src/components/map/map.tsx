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
  /** Currently selected feature id, or null. Drives flyTo + layer highlight. */
  selectedId: string | null;
  /** Click handler for a campus dot. Pass `null` to clear. */
  onSelect: (id: string | null) => void;
};

/**
 * Full-bleed MapLibre + deck.gl map. Stateless wrt selection — the parent
 * owns it. The map reacts to `selectedId` by flying to the feature and
 * re-renders the layer so the selected dot can be highlighted.
 */
export function Map({ data, selectedId, onSelect }: MapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const setViewport = useMapStore((s) => s.setViewport);
  const setVisibleBbox = useMapStore((s) => s.setVisibleBbox);
  const datacentersVisible = useMapStore((s) => s.layers.datacenters);

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
    if (!overlay || !data) return;
    overlay.setProps({
      layers: [
        createDatacentersLayer(data, {
          selectedId,
          visible: datacentersVisible,
          onClick: (feature) => onSelect(feature.properties.id),
        }),
      ],
    });
  }, [data, selectedId, onSelect, datacentersVisible]);

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
