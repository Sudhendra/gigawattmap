'use client';

import type { MapChanges } from '@gigawattmap/types';
import { ResearchPanel } from '@/components/map/research-panel';
import { CompanySelectionBar } from '@/components/map/company-selection-bar';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { validateSecondaryDataset } from '@/lib/secondary-data';
import { fetchMapData } from '@/lib/map-data';
import { ViewportHud } from '@/components/map/viewport-hud';
const CloudRegionCard = dynamic(async () => {
  const module = await import('@/components/map/cloud-region-card');
  return module.CloudRegionCard;
});
const OppositionCard = dynamic(async () => {
  const module = await import('@/components/intelligence-card/opposition-card');
  return module.OppositionCard;
});
const CableCard = dynamic(async () => {
  const module = await import('@/components/intelligence-card/cable-card');
  return module.CableCard;
});
const IntelligenceCard = dynamic(async () => {
  const module = await import('@/components/intelligence-card/intelligence-card');
  return module.IntelligenceCard;
});
const MapSearch = dynamic(async () => {
  const module = await import('@/components/search/map-search');
  return module.MapSearch;
});
import { useSelectedDcUrlSync } from '@/lib/hooks/use-selected-dc-url-sync';
import { useOperatorFilterUrlSync } from '@/lib/hooks/use-operator-filter-url-sync';
import { useMapStore } from '@/lib/store/map-store';
import type {
  AiCampusCollection,
  AiCampusFeature,
} from '@/components/map/layers/datacenters-layer';
import type {
  CloudRegionCollection,
  CloudRegionFeature,
} from '@/components/map/layers/cloud-regions-layer';
import type {
  OppositionFightCollection,
  OppositionFightFeature,
} from '@/components/map/layers/opposition-layer';
import type { CableCollection, CableFeature } from '@/components/map/layers/cables-layer';

/** Path is relative to /public, served at /seed/*.geojson. */
const CLOUD_REGIONS_URL = '/seed/cloud-regions.geojson';
const OPPOSITION_URL = '/seed/opposition.geojson';
const CABLES_URL = '/seed/cables.geojson';

/** MapLibre loads after the initial UI; secondary renderers load only on demand. */
const Map = dynamic(() => import('@/components/map/map').then((m) => ({ default: m.Map })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[var(--bg-base)]" aria-hidden role="presentation" />
  ),
});

/**
 * Orchestrator that owns the AI-campus dataset and wires map clicks ↔ URL ↔
 * Intelligence Card drawer. Kept client-only because it depends on
 * `useSearchParams`. The Suspense boundary is required by Next.js 15 when
 * using search params in a client component.
 */
export function MapView(): React.JSX.Element {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <MapViewInner />
    </Suspense>
  );
}

function MapViewInner(): React.JSX.Element {
  const [data, setData] = useState<AiCampusCollection | null>(null);
  const [changes, setChanges] = useState<MapChanges | null>(null);
  const [changesUnavailable, setChangesUnavailable] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const layers = useMapStore((state) => state.layers);
  const [layerErrors, setLayerErrors] = useState<Record<string, boolean>>({});
  const [layerRetry, setLayerRetry] = useState(0);
  const [cloudRegions, setCloudRegions] = useState<CloudRegionCollection | null>(null);
  const [oppositionData, setOppositionData] = useState<OppositionFightCollection | null>(null);
  const [cablesData, setCablesData] = useState<CableCollection | null>(null);
  const [selectedCloudRegion, setSelectedCloudRegion] = useState<CloudRegionFeature | null>(null);
  const [selectedOpposition, setSelectedOpposition] = useState<OppositionFightFeature | null>(null);
  const [selectedCable, setSelectedCable] = useState<CableFeature | null>(null);
  const setSelectedDcId = useSelectedDcUrlSync();
  const setOperatorFilter = useOperatorFilterUrlSync();
  const router = useRouter();
  const cmdkOpen = useMapStore((s) => s.cmdkOpen);
  const setCmdkOpen = useMapStore((s) => s.setCmdkOpen);
  // The store mirrors the URL — read it here so the drawer + map both
  // observe the same single source of truth.
  const selectedId = useMapStore((s) => s.selectedDcId);

  // Cmd/Ctrl+K toggles the palette. We attach to window so the binding fires
  // regardless of focus (matching Spotlight / Linear / VS Code conventions).
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen(!useMapStore.getState().cmdkOpen);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCmdkOpen]);

  // --- Seed fetch (one-shot). -----------------------------------------------
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchMapData();
        if (!cancelled) {
          setData(next.data);
          setUpdatedAt(next.updatedAt);
          setChanges(next.changes);
          setChangesUnavailable(next.changesUnavailable);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load map data', err);
        if (!cancelled) setMapError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cloud regions live in their own seed; failure here is non-fatal —
  // the rest of the map still renders.
  useEffect(() => {
    if (!layers.cloud_regions || cloudRegions) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(CLOUD_REGIONS_URL, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`Cloud-regions fetch failed: ${res.status}`);
        const payload: unknown = await res.json();
        validateSecondaryDataset(payload, 'cloud_regions');
        const next = payload as CloudRegionCollection;
        if (!cancelled) setCloudRegions(next);
      } catch (err) {
        if (!cancelled) setLayerErrors((previous) => ({ ...previous, cloud_regions: true }));
        // eslint-disable-next-line no-console
        console.error('Failed to load cloud-regions seed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layers.cloud_regions, cloudRegions, layerRetry]);

  // Opposition fights — same non-fatal pattern.
  useEffect(() => {
    if (!layers.opposition || oppositionData) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(OPPOSITION_URL, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`Opposition fetch failed: ${res.status}`);
        const payload: unknown = await res.json();
        validateSecondaryDataset(payload, 'opposition');
        const next = payload as OppositionFightCollection;
        if (!cancelled) setOppositionData(next);
      } catch (err) {
        if (!cancelled) setLayerErrors((previous) => ({ ...previous, opposition: true }));
        // eslint-disable-next-line no-console
        console.error('Failed to load opposition seed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layers.opposition, oppositionData, layerRetry]);

  // Submarine cables — same non-fatal pattern. The 2 MB payload is
  // accepted in dev mode; production swaps in PMTiles per task 013.
  useEffect(() => {
    if (!layers.cables || cablesData) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(CABLES_URL, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`Cables fetch failed: ${res.status}`);
        const payload: unknown = await res.json();
        validateSecondaryDataset(payload, 'cables');
        const next = payload as CableCollection;
        if (!cancelled) setCablesData(next);
      } catch (err) {
        if (!cancelled) setLayerErrors((previous) => ({ ...previous, cables: true }));
        // eslint-disable-next-line no-console
        console.error('Failed to load cables seed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layers.cables, cablesData, layerRetry]);

  const selectedFeature = useMemo<AiCampusFeature | null>(() => {
    if (!data || !selectedId) return null;
    return data.features.find((f) => f.properties.id === selectedId) ?? null;
  }, [data, selectedId]);

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedDcId(id);
      // Selecting a campus closes any other right-side card so we never
      // show two stacked panels.
      if (id) {
        setSelectedCloudRegion(null);
        setSelectedOpposition(null);
        setSelectedCable(null);
      }
    },
    [setSelectedDcId],
  );
  const handleClose = useCallback(() => setSelectedDcId(null), [setSelectedDcId]);
  const handleSelectCloudRegion = useCallback(
    (feature: CloudRegionFeature | null) => {
      setSelectedCloudRegion(feature);
      // Mutually exclusive with the campus + opposition + cable cards.
      if (feature) {
        setSelectedDcId(null);
        setSelectedOpposition(null);
        setSelectedCable(null);
      }
    },
    [setSelectedDcId],
  );
  const handleCloseCloudRegion = useCallback(() => setSelectedCloudRegion(null), []);
  const handleSelectOpposition = useCallback(
    (feature: OppositionFightFeature | null) => {
      setSelectedOpposition(feature);
      if (feature) {
        setSelectedDcId(null);
        setSelectedCloudRegion(null);
        setSelectedCable(null);
      }
    },
    [setSelectedDcId],
  );
  const handleCloseOpposition = useCallback(() => setSelectedOpposition(null), []);
  const handleSelectCable = useCallback(
    (feature: CableFeature | null) => {
      setSelectedCable(feature);
      if (feature) {
        setSelectedDcId(null);
        setSelectedCloudRegion(null);
        setSelectedOpposition(null);
      }
    },
    [setSelectedDcId],
  );
  const handleCloseCable = useCallback(() => setSelectedCable(null), []);

  // Cmd+K actions. Selecting a result closes any other right-side card so
  // the user lands on a clean view of the chosen entity.
  const cmdkActions = useMemo(
    () => ({
      onSelectDatacenter: (id: string) => {
        setSelectedDcId(id);
        setSelectedCloudRegion(null);
        setSelectedOpposition(null);
        setSelectedCable(null);
      },
      onSelectOperator: (id: string) => {
        useMapStore.getState().setTickerFilter(null);
        setOperatorFilter(id);
        setSelectedCloudRegion(null);
        setSelectedOpposition(null);
        setSelectedCable(null);
      },
      // Announcements live on /news today; navigating there lets the user
      // read the full card with its source link without inventing a new
      // single-announcement modal.
      onSelectAnnouncement: (_id: string) => {
        router.push('/news');
      },
    }),
    [router, setOperatorFilter, setSelectedDcId],
  );

  return (
    <>
      <div className="research-workspace">
        <div className="map-workspace-canvas">
          <div className="map-heading">
            <span className="workspace-eyebrow">THE INFRASTRUCTURE ATLAS</span>
            <h1>Follow the buildout.</h1>
            <p>Explore facilities. Connect the companies.</p>
          </div>
          <CompanySelectionBar data={data} />
          <Map
            data={data}
            cloudRegions={cloudRegions}
            oppositionData={oppositionData}
            cablesData={cablesData}
            selectedId={selectedId}
            onSelect={handleSelect}
            onSelectCloudRegion={handleSelectCloudRegion}
            onSelectOpposition={handleSelectOpposition}
            onSelectCable={handleSelectCable}
          />
          <div role="status" className="map-data-status">
            {mapError
              ? 'Map data could not be loaded. Reload to retry.'
              : !data
                ? 'Loading facilities…'
                : `${data.features.length.toLocaleString()} facilities · ${updatedAt ? `Dataset published ${new Date(updatedAt).toLocaleDateString()}` : 'Development sample'}`}
            {updatedAt && Date.now() - Date.parse(updatedAt) > 14 * 86400_000
              ? ' · Refresh overdue'
              : ''}
          </div>
          {((layers.cloud_regions && !cloudRegions) ||
            (layers.cables && !cablesData) ||
            (layers.opposition && !oppositionData)) && (
            <p
              role="status"
              className="absolute left-3 top-60 z-20 max-w-xs rounded bg-[var(--bg-panel)] p-3 text-xs"
            >
              {Object.keys(layerErrors).some(
                (key) => layerErrors[key] && layers[key as keyof typeof layers],
              ) ? (
                <>
                  A layer could not load.{' '}
                  <button
                    className="underline"
                    onClick={() => {
                      setLayerErrors({});
                      setLayerRetry((n) => n + 1);
                    }}
                  >
                    Retry
                  </button>
                </>
              ) : (
                'Loading layer data…'
              )}
            </p>
          )}

          <ViewportHud data={data} />
          {selectedCloudRegion && (
            <CloudRegionCard feature={selectedCloudRegion} onClose={handleCloseCloudRegion} />
          )}
          {selectedOpposition && (
            <OppositionCard feature={selectedOpposition} onClose={handleCloseOpposition} />
          )}
          {selectedCable && <CableCard feature={selectedCable} onClose={handleCloseCable} />}
        </div>
        <ResearchPanel
          publishedAt={updatedAt}
          data={data}
          changes={changes}
          changesUnavailable={mapError || changesUnavailable}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCloseDetail={handleClose}
          detail={
            selectedFeature ? (
              <IntelligenceCard
                key={selectedId}
                feature={selectedFeature}
                onClose={handleClose}
                publishedAt={updatedAt}
                embedded
              />
            ) : null
          }
        />
      </div>
      {cmdkOpen && <MapSearch data={data} onOpenChange={setCmdkOpen} actions={cmdkActions} />}
      <Toaster
        theme="dark"
        position="bottom-left"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--bg-elevated)',
          },
        }}
      />
    </>
  );
}

function MapSkeleton(): React.JSX.Element {
  return (
    <div
      className="h-[calc(100vh-3rem)] w-full bg-[var(--bg-base)]"
      aria-hidden
      role="presentation"
    />
  );
}
