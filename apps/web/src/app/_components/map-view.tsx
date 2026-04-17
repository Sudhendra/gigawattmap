'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';
import { Map } from '@/components/map/map';
import { ViewportHud } from '@/components/map/viewport-hud';
import { IntelligenceCard } from '@/components/intelligence-card/intelligence-card';
import { useSelectedDcUrlSync } from '@/lib/hooks/use-selected-dc-url-sync';
import { useMapStore } from '@/lib/store/map-store';
import type {
  AiCampusCollection,
  AiCampusFeature,
} from '@/components/map/layers/datacenters-layer';

/** Path is relative to /public, served at /seed/ai-campuses.geojson. */
const SEED_URL = '/seed/ai-campuses.geojson';

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

  const selectedFeature = useMemo<AiCampusFeature | null>(() => {
    if (!data || !selectedId) return null;
    return data.features.find((f) => f.properties.id === selectedId) ?? null;
  }, [data, selectedId]);

  const handleSelect = useCallback(
    (id: string | null) => setSelectedDcId(id),
    [setSelectedDcId],
  );
  const handleClose = useCallback(() => setSelectedDcId(null), [setSelectedDcId]);

  return (
    <>
      <div className="relative h-[calc(100vh-3rem)] w-full">
        <Map data={data} selectedId={selectedId} onSelect={handleSelect} />
        <ViewportHud data={data} />
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
