'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { Map } from '@/components/map/map';
import { LayerControls } from '@/components/map/layer-controls';
import { ViewportHud } from '@/components/map/viewport-hud';
import { CloudRegionCard } from '@/components/map/cloud-region-card';
import { OppositionCard } from '@/components/intelligence-card/opposition-card';
import { CableCard } from '@/components/intelligence-card/cable-card';
import { IntelligenceCard } from '@/components/intelligence-card/intelligence-card';
import { AnnouncementsFeed } from '@/components/announcements-feed/announcements-feed';
import { TickerPanel } from '@/components/ticker-panel/ticker-panel';
import { CommandPalette } from '@/components/search/command-palette';
import { useSelectedDcUrlSync } from '@/lib/hooks/use-selected-dc-url-sync';
import { useOperatorFilterUrlSync } from '@/lib/hooks/use-operator-filter-url-sync';
import { useSearchIndex } from '@/lib/hooks/use-search-index';
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
import type {
  CableCollection,
  CableFeature,
} from '@/components/map/layers/cables-layer';

/** Path is relative to /public, served at /seed/*.geojson. */
const SEED_URL = '/seed/ai-campuses.geojson';
const CLOUD_REGIONS_URL = '/seed/cloud-regions.geojson';
const OPPOSITION_URL = '/seed/opposition.geojson';
const CABLES_URL = '/seed/cables.geojson';

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
  const searchIndex = useSearchIndex();
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

  // Opposition fights — same non-fatal pattern.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(OPPOSITION_URL);
        if (!res.ok) throw new Error(`Opposition fetch failed: ${res.status}`);
        const next = (await res.json()) as OppositionFightCollection;
        if (!cancelled) setOppositionData(next);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load opposition seed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Submarine cables — same non-fatal pattern. The 2 MB payload is
  // accepted in dev mode; production swaps in PMTiles per task 013.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(CABLES_URL);
        if (!res.ok) throw new Error(`Cables fetch failed: ${res.status}`);
        const next = (await res.json()) as CableCollection;
        if (!cancelled) setCablesData(next);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load cables seed', err);
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
        setOperatorFilter(id);
        setSelectedDcId(null);
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
      <div className="relative h-[calc(100vh-3rem)] w-full">
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
        <LayerControls />
        <TickerPanel />
        <AnnouncementsFeed datacenters={data} onSelectDatacenter={handleSelect} />
        <ViewportHud data={data} />
        <CloudRegionCard feature={selectedCloudRegion} onClose={handleCloseCloudRegion} />
        <OppositionCard feature={selectedOpposition} onClose={handleCloseOpposition} />
        <CableCard feature={selectedCable} onClose={handleCloseCable} />
      </div>
      <IntelligenceCard feature={selectedFeature} onClose={handleClose} />
      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        index={searchIndex}
        actions={cmdkActions}
      />
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
