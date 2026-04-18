'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMapStore } from '@/lib/store/map-store';

const PARAM = 'operator';

/**
 * Two-way bind the `?operator=<id>` query parameter and the `operatorFilter`
 * slice of the map store. Mirrors `useSelectedDcUrlSync`: URL is the source
 * of truth so deep-links restore the filter on page load and back/forward.
 *
 * Returns a setter that updates both sides in one call. Always use it from
 * UI handlers (e.g. the Cmd+K palette); never write the slice directly.
 */
export function useOperatorFilterUrlSync(): (id: string | null) => void {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const setOperatorFilter = useMapStore((s) => s.setOperatorFilter);

  const urlId = params.get(PARAM);
  useEffect(() => {
    setOperatorFilter(urlId);
  }, [urlId, setOperatorFilter]);

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
