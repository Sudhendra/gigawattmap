'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { DEFAULT_VIEWPORT, useMapStore } from '@/lib/store/map-store';

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

/**
 * Full-bleed MapLibre map. Owns the maplibregl.Map instance and pushes
 * viewport changes into the Zustand store on `moveend`.
 */
export function Map(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
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

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setViewport]);

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-3rem)] w-full"
      role="region"
      aria-label="World datacenter map"
    />
  );
}
