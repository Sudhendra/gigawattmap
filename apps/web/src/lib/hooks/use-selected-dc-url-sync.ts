'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const setSelectedDcId = useMapStore((s) => s.setSelectedDcId);

  // URL → store. Runs on every navigation, including the initial mount,
  // so deep links like /?dc=meta-hyperion-la hydrate the store correctly.
  const urlId = params.get(PARAM);
  useEffect(() => {
    setSelectedDcId(urlId);
  }, [urlId, setSelectedDcId]);

  // Caller-facing setter: writes URL, lets the effect above update the store.
  // `replace` (not push) keeps the back button useful for actual navigation,
  // and `scroll: false` prevents Next.js from yanking the viewport on update.
  return useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set(PARAM, id);
      else next.delete(PARAM);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
}
