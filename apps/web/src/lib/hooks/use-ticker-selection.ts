'use client';

import { useCallback } from 'react';
import { useMapStore } from '@/lib/store/map-store';
import { useOperatorFilterUrlSync } from './use-operator-filter-url-sync';

/** A ticker selection replaces an operator search, rather than silently combining them. */
export function useTickerSelection(): (symbol: string | null) => void {
  const clearOperator = useOperatorFilterUrlSync();
  const setTicker = useMapStore((state) => state.setTickerFilter);
  return useCallback(
    (symbol: string | null) => {
      clearOperator(null);
      setTicker(symbol);
    },
    [clearOperator, setTicker],
  );
}
