'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import { applyBasemapPalette } from './basemap-palette';
import { DEFAULT_VIEWPORT, useMapStore } from '@/lib/store/map-store';
import type { AiCampusCollection, AiCampusFeature } from './layers/datacenters-layer';
import type { CloudRegionCollection, CloudRegionFeature } from './layers/cloud-regions-layer';
import type { OppositionFightCollection, OppositionFightFeature } from './layers/opposition-layer';
import type { CableCollection, CableFeature } from './layers/cables-layer';
import { companyMatches, facilityBounds, visibleCompanyFeatures } from '@/lib/company-selection';
import { targetsForTicker } from '@/lib/ticker-map';
import {
  CLUSTERS_LAYER,
  COUNTS_LAYER,
  FACILITIES_SOURCE,
  POINTS_LAYER,
  pointPaint,
  prepareFacilities,
} from './native-facilities';

const ClusterBrowser = dynamic(() =>
  import('./cluster-browser').then((module) => module.ClusterBrowser),
);
type ClusterSelection = {
  id: number;
  count: number;
  center: [number, number];
  facilities: AiCampusFeature[] | null;
  error: string | null;
};

const BASEMAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
};
type SecondaryComponent = typeof import('./secondary-overlays').SecondaryOverlays;

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

/** Native clustered facilities; secondary rendering engine loads only on demand. */
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
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [cluster, setCluster] = useState<ClusterSelection | null>(null);
  const clusterRequest = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  const closeCluster = (): void => {
    clusterRequest.current += 1;
    setCluster(null);
  };
  const loadCluster = async (map: maplibregl.Map, selection: ClusterSelection): Promise<void> => {
    const request = ++clusterRequest.current;
    setCluster({ ...selection, facilities: null, error: null });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const source = map.getSource(FACILITIES_SOURCE) as GeoJSONSource;
      const leaves = await Promise.race([
        source.getClusterLeaves(selection.id, selection.count, 0),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Cluster lookup timed out')), 10000);
        }),
      ]);
      if (clusterRequest.current !== request || mapRef.current !== map) return;
      const ids = new Set(
        leaves
          .map((leaf) => leaf.properties?.id)
          .filter((id): id is string => typeof id === 'string'),
      );
      const facilities =
        dataRef.current?.features.filter((feature) => ids.has(feature.properties.id)) ?? [];
      if (facilities.length !== selection.count) throw new Error('Cluster membership changed');
      setCluster({ ...selection, facilities, error: null });
    } catch {
      if (clusterRequest.current === request && mapRef.current === map)
        setCluster({ ...selection, facilities: null, error: 'Could not load this cluster.' });
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  };
  const basemap = useMapStore((s) => s.basemap);
  const onlyMatches = useMapStore((s) => s.onlyCompanyMatches);
  const fitRequest = useMapStore((s) => s.fitCompanyRequest);
  const lastFit = useRef(fitRequest);
  const activeBasemap = useRef(basemap);
  const [styleRevision, setStyleRevision] = useState(0);
  const [styleError, setStyleError] = useState(false);
  const [styleRetry, setStyleRetry] = useState(0);
  const [ready, setReady] = useState<maplibregl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [Secondary, setSecondary] = useState<SecondaryComponent | null>(null);
  const [overlayError, setOverlayError] = useState(false);
  const [retry, setRetry] = useState(0);
  const setViewport = useMapStore((s) => s.setViewport);
  const setVisibleBbox = useMapStore((s) => s.setVisibleBbox);
  const layers = useMapStore((s) => s.layers);
  const ticker = useMapStore((s) => s.tickerFilter);
  const operator = useMapStore((s) => s.operatorFilter);
  const targets = useMemo(() => {
    const base = targetsForTicker(ticker);
    return !ticker && operator ? { ...base, operators: new Set([operator]) } : base;
  }, [ticker, operator]);
  const renderData = useMemo(
    () =>
      data
        ? prepareFacilities(
            {
              ...data,
              features: visibleCompanyFeatures(data.features, targets.operators, onlyMatches),
            },
            targets.operators,
          )
        : null,
    [data, targets, onlyMatches],
  );
  const secondaryActive = layers.cloud_regions || layers.opposition || layers.cables;

  useEffect(() => {
    if (!secondaryActive || Secondary) return;
    let cancelled = false;
    setOverlayError(false);
    void (async () => {
      try {
        const module = await import('./secondary-overlays');
        if (!cancelled) setSecondary(() => module.SecondaryOverlays);
      } catch {
        if (!cancelled) setOverlayError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [secondaryActive, Secondary, retry]);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLES[activeBasemap.current],
        center: [DEFAULT_VIEWPORT.longitude, DEFAULT_VIEWPORT.latitude],
        zoom: DEFAULT_VIEWPORT.zoom,
        bearing: DEFAULT_VIEWPORT.bearing,
        pitch: DEFAULT_VIEWPORT.pitch,
        attributionControl: { compact: true },
      });
    } catch {
      setError('The map could not start. Check WebGL support and reload.');
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    const updateViewport = (): void => {
      const center = map.getCenter(),
        bounds = map.getBounds();
      setViewport({
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
      setVisibleBbox([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
    };
    map.on('moveend', updateViewport);
    map.on('style.load', () => {
      applyBasemapPalette(map, useMapStore.getState().basemap);
      setStyleRevision((value) => value + 1);
    });
    const observer = new ResizeObserver(() => {
      map.resize();
      updateViewport();
    });
    observer.observe(containerRef.current);

    map.once('load', () => {
      map.addSource(FACILITIES_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 9,
        clusterProperties: { matched: ['+', ['get', 'matched']] },
      });
      map.addLayer({
        id: CLUSTERS_LAYER,
        type: 'circle',
        source: FACILITIES_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#18333e',
          'circle-radius': ['step', ['get', 'point_count'], 16, 100, 21, 1000, 27],
          'circle-stroke-color': '#67bfc9',
          'circle-stroke-width': 1,
          'circle-opacity': ['case', ['>', ['get', 'matched'], 0], 0.95, 0.2],
        },
      });
      map.addLayer({
        id: COUNTS_LAYER,
        type: 'symbol',
        source: FACILITIES_SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-opacity': ['case', ['>', ['get', 'matched'], 0], 1, 0.3],
        },
      });
      map.addLayer({
        id: POINTS_LAYER,
        type: 'circle',
        source: FACILITIES_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: pointPaint(null),
      });
      map.on('click', POINTS_LAYER, (event) => {
        const id: unknown = event.features?.[0]?.properties.id;
        if (typeof id === 'string') selectRef.current(id);
      });
      map.on('click', CLUSTERS_LAYER, (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const id: unknown = feature.properties.cluster_id;
        const coordinates = feature.geometry.coordinates;
        const count: unknown = feature.properties.point_count;
        if (
          typeof id !== 'number' ||
          typeof count !== 'number' ||
          !Number.isSafeInteger(count) ||
          count < 1 ||
          coordinates.length < 2
        )
          return;
        void loadCluster(map, {
          id,
          count,
          center: [coordinates[0]!, coordinates[1]!],
          facilities: null,
          error: null,
        });
      });
      for (const id of [POINTS_LAYER, CLUSTERS_LAYER]) {
        map.on('mouseenter', id, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', id, () => {
          map.getCanvas().style.cursor = '';
        });
      }
      updateViewport();
      setReady(map);
    });
    return () => {
      clusterRequest.current += 1;
      mapRef.current = null;
      setReady(null);
      observer.disconnect();
      map.remove();
    };
  }, [setViewport, setVisibleBbox]);

  useEffect(() => {
    closeCluster();
    if (ready && renderData && ready.getSource(FACILITIES_SOURCE))
      (ready.getSource(FACILITIES_SOURCE) as GeoJSONSource).setData(renderData);
  }, [ready, renderData, styleRevision]);
  useEffect(() => {
    if (!ready || !ready.getLayer(POINTS_LAYER)) return;
    closeCluster();
    for (const id of [POINTS_LAYER, CLUSTERS_LAYER, COUNTS_LAYER])
      ready.setLayoutProperty(id, 'visibility', layers.datacenters ? 'visible' : 'none');
    for (const [key, value] of Object.entries(pointPaint(selectedId) ?? {}))
      ready.setPaintProperty(POINTS_LAYER, key, value);
  }, [ready, selectedId, layers.datacenters, styleRevision]);
  useEffect(() => {
    if (!ready || !selectedId || !data) return;
    const feature = data.features.find((item) => item.properties.id === selectedId);
    if (!feature) return;
    const [lon, lat] = feature.geometry.coordinates;
    if (typeof lon === 'number' && typeof lat === 'number')
      ready.flyTo({
        center: [lon, lat],
        zoom: Math.max(ready.getZoom(), 12),
        speed: 1.2,
        essential: false,
      });
  }, [ready, selectedId, data]);

  useEffect(() => {
    if (!ready || !data || fitRequest === lastFit.current) return;
    lastFit.current = fitRequest;
    const bounds = facilityBounds(
      data.features.filter((feature) => companyMatches(feature, targets.operators)),
    );
    if (bounds)
      ready.fitBounds(bounds, { padding: 55, maxZoom: 12, duration: 700, essential: false });
  }, [ready, data, fitRequest, targets]);

  useEffect(() => {
    if (!ready || activeBasemap.current === basemap) return;
    closeCluster();
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setStyleError(false);
    void (async () => {
      try {
        const response = await fetch(BASEMAP_STYLES[basemap], { signal: controller.signal });
        if (!response.ok) throw new Error('Basemap request failed');
        const payload: unknown = await response.json();
        if (
          !payload ||
          typeof payload !== 'object' ||
          !('version' in payload) ||
          payload.version !== 8 ||
          !('layers' in payload) ||
          !Array.isArray(payload.layers) ||
          !('sources' in payload)
        )
          throw new Error('Invalid basemap style');
        if (cancelled || mapRef.current !== ready) return;
        ready.setStyle(payload as StyleSpecification, {
          transformStyle: (previous, next) => ({
            ...next,
            sources: {
              ...next.sources,
              ...(previous?.sources[FACILITIES_SOURCE]
                ? { [FACILITIES_SOURCE]: previous.sources[FACILITIES_SOURCE] }
                : {}),
            },
            layers: [
              ...next.layers,
              ...(previous?.layers.filter((layer) =>
                [POINTS_LAYER, CLUSTERS_LAYER, COUNTS_LAYER].includes(layer.id),
              ) ?? []),
            ],
          }),
        });
        activeBasemap.current = basemap;
      } catch {
        if (!cancelled) setStyleError(true);
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [ready, basemap, styleRetry]);

  return (
    <>
      <div
        ref={containerRef}
        className="h-full w-full [&_.maplibregl-canvas]:cursor-grab [&_.maplibregl-canvas:active]:cursor-grabbing"
        role="region"
        aria-label="World datacenter map"
      />
      {cluster && ready && (
        <ClusterBrowser
          key={cluster.id}
          count={cluster.count}
          facilities={cluster.facilities}
          error={cluster.error}
          operators={targets.operators}
          onClose={closeCluster}
          onRestoreFocus={() => ready.getCanvas().focus()}
          onSelect={(id) => {
            closeCluster();
            selectRef.current(id);
          }}
          onRetry={() => {
            void loadCluster(ready, cluster);
          }}
          onZoom={() => {
            const selection = cluster;
            closeCluster();
            void (async () => {
              try {
                const zoom = await (
                  ready.getSource(FACILITIES_SOURCE) as GeoJSONSource
                ).getClusterExpansionZoom(selection.id);
                if (mapRef.current === ready) ready.easeTo({ center: selection.center, zoom });
              } catch {
                if (mapRef.current === ready)
                  setError('Could not zoom into this cluster. Use the map zoom controls.');
              }
            })();
          }}
        />
      )}
      {styleError && (
        <p role="alert" className="absolute bottom-28 left-3 z-20 rounded bg-bg-panel p-3 text-xs">
          Basemap could not switch. The previous map is still available.{' '}
          <button className="underline" onClick={() => setStyleRetry((value) => value + 1)}>
            Retry basemap
          </button>
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="absolute left-3 top-48 z-20 max-w-xs rounded bg-[var(--bg-panel)] p-3 text-xs"
        >
          {error}
        </p>
      )}
      {secondaryActive && !Secondary && (
        <p
          role="status"
          className="absolute left-3 top-48 z-20 rounded bg-[var(--bg-panel)] p-3 text-xs"
        >
          {overlayError ? (
            <>
              Layer renderer could not load.{' '}
              <button className="underline" onClick={() => setRetry((n) => n + 1)}>
                Retry
              </button>
            </>
          ) : (
            'Loading layer renderer…'
          )}
        </p>
      )}
      {ready && secondaryActive && Secondary && (
        <Secondary
          map={ready}
          cloudRegions={layers.cloud_regions ? cloudRegions : null}
          oppositionData={layers.opposition ? oppositionData : null}
          cablesData={layers.cables ? cablesData : null}
          cloudProviders={targets.cloudProviders}
          onCloud={onSelectCloudRegion}
          onOpposition={onSelectOpposition}
          onCable={onSelectCable}
        />
      )}
    </>
  );
}
