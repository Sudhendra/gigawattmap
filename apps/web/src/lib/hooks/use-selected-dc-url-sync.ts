'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { replaceMapSelection } from '@/lib/map-selection-url';
import { useMapStore } from '@/lib/store/map-store';

const PARAM = 'dc';

/**
 * Two-way bind the `?dc=<id>` query parameter and the `selectedDcId` slice
 * of the map store. URL is the source of truth — it must round-trip on
 * direct loads, browser back/forward, and link sharing. The store mirror
 * exists so non-React consumers (the WebGL layer) can read it cheaply.
 *
 * Returns a setter that updates BOTH sides in one call. Always use it from
 * UI handlers; never write to the store slice directly.
 */
export function useSelectedDcUrlSync(): (id: string | null) => void {
  const params = useSearchParams();
  const setSelectedDcId = useMapStore((s) => s.setSelectedDcId);

  // URL → store. Runs on every navigation, including the initial mount,
  // so deep links like /?dc=meta-hyperion-la hydrate the store correctly.
  const urlId = params.get(PARAM);
  useEffect(() => {
    setSelectedDcId(urlId);
  }, [urlId, setSelectedDcId]);

  // Selection is local UI state. Preserve the document, camera and history entry.
  return useCallback(
    (id: string | null) => {
      replaceMapSelection(PARAM, id);
      setSelectedDcId(id);
    },
    [setSelectedDcId],
  );
}
