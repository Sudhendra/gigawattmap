'use client';

import { useEffect, useRef } from 'react';
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

/** Path is relative to /public, served at /seed/ai-campuses.geojson. */
const SEED_URL = '/seed/ai-campuses.geojson';

/**
 * Full-bleed MapLibre map. Owns the maplibregl.Map instance, hosts a
 * deck.gl MapboxOverlay in interleaved mode for the AI-campus layer, and
 * pushes viewport changes into the Zustand store on `moveend`.
 */
export function Map(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const setViewport = useMapStore((s) => s.setViewport);

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
    });

    // Interleaved mode: deck.gl draws into MapLibre's WebGL context so layer
    // ordering with native style layers is correct (e.g. labels stay on top
    // of dots later if we want them to). Empty layers array up front; we
    // populate after the seed fetch resolves.
    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);

    mapRef.current = map;
    overlayRef.current = overlay;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(SEED_URL);
        if (!res.ok) throw new Error(`Seed fetch failed: ${res.status}`);
        const data = (await res.json()) as AiCampusCollection;
        if (cancelled) return;
        const handleClick = (feature: AiCampusFeature): void => {
          // Drawer integration lands in task 006. Logging is the contract
          // declared by the 005 acceptance criteria.
          // eslint-disable-next-line no-console
          console.log('campus clicked', feature);
        };
        overlay.setProps({ layers: [createDatacentersLayer(data, { onClick: handleClick })] });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load AI-campus seed', err);
      }
    })();

    return () => {
      cancelled = true;
      overlay.finalize();
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [setViewport]);

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-3rem)] w-full [&_.maplibregl-canvas]:cursor-grab [&_.maplibregl-canvas:active]:cursor-grabbing"
      role="region"
      aria-label="World datacenter map"
    />
  );
}
