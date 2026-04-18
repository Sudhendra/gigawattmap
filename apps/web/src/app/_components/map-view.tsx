'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';
import { Map } from '@/components/map/map';
import { LayerControls } from '@/components/map/layer-controls';
import { ViewportHud } from '@/components/map/viewport-hud';
import { CloudRegionCard } from '@/components/map/cloud-region-card';
import { IntelligenceCard } from '@/components/intelligence-card/intelligence-card';
import { useSelectedDcUrlSync } from '@/lib/hooks/use-selected-dc-url-sync';
import { useMapStore } from '@/lib/store/map-store';
import type {
  AiCampusCollection,
  AiCampusFeature,
} from '@/components/map/layers/datacenters-layer';
import type {
  CloudRegionCollection,
  CloudRegionFeature,
} from '@/components/map/layers/cloud-regions-layer';

/** Path is relative to /public, served at /seed/*.geojson. */
const SEED_URL = '/seed/ai-campuses.geojson';
const CLOUD_REGIONS_URL = '/seed/cloud-regions.geojson';

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
  const [cloudRegions, setCloudRegions] = useState<CloudRegionCollection | null>(null);
  const [selectedCloudRegion, setSelectedCloudRegion] = useState<CloudRegionFeature | null>(null);
  const setSelectedDcId = useSelectedDcUrlSync();
  // The store mirrors the URL — read it here so the drawer + map both
  // observe the same single source of truth.
  const selectedId = useMapStore((s) => s.selectedDcId);

  // --- Seed fetch (one-shot). -----------------------------------------------
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(SEED_URL);
        if (!res.ok) throw new Error(`Seed fetch failed: ${res.status}`);
        const next = (await res.json()) as AiCampusCollection;
        if (!cancelled) setData(next);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load AI-campus seed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cloud regions live in their own seed; failure here is non-fatal —
  // the rest of the map still renders.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(CLOUD_REGIONS_URL);
        if (!res.ok) throw new Error(`Cloud-regions fetch failed: ${res.status}`);
        const next = (await res.json()) as CloudRegionCollection;
        if (!cancelled) setCloudRegions(next);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load cloud-regions seed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedFeature = useMemo<AiCampusFeature | null>(() => {
    if (!data || !selectedId) return null;
    return data.features.find((f) => f.properties.id === selectedId) ?? null;
  }, [data, selectedId]);

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedDcId(id);
      // Selecting a campus closes any open cloud-region card so we never
      // show two stacked panels on the right side of the map.
      if (id) setSelectedCloudRegion(null);
    },
    [setSelectedDcId],
  );
  const handleClose = useCallback(() => setSelectedDcId(null), [setSelectedDcId]);
  const handleSelectCloudRegion = useCallback(
    (feature: CloudRegionFeature | null) => {
      setSelectedCloudRegion(feature);
      // Mutually exclusive with the campus drawer for the same reason.
      if (feature) setSelectedDcId(null);
    },
    [setSelectedDcId],
  );
  const handleCloseCloudRegion = useCallback(() => setSelectedCloudRegion(null), []);

  return (
    <>
      <div className="relative h-[calc(100vh-3rem)] w-full">
        <Map
          data={data}
          cloudRegions={cloudRegions}
          selectedId={selectedId}
          onSelect={handleSelect}
          onSelectCloudRegion={handleSelectCloudRegion}
        />
        <LayerControls />
        <ViewportHud data={data} />
        <CloudRegionCard feature={selectedCloudRegion} onClose={handleCloseCloudRegion} />
      </div>
      <IntelligenceCard feature={selectedFeature} onClose={handleClose} />
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
