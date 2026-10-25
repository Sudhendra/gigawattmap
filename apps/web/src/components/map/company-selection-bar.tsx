'use client';

import { useMemo } from 'react';
import { Crosshair, X } from 'lucide-react';
import { useMapStore } from '@/lib/store/map-store';
import { useTickerSelection } from '@/lib/hooks/use-ticker-selection';
import { companyMatches, selectedOperators } from '@/lib/company-selection';
import { TICKER_META_BY_SYMBOL } from '@/lib/ticker-map';
import type { AiCampusCollection } from './layers/datacenters-layer';

export function CompanySelectionBar({
  data,
}: {
  data: AiCampusCollection | null;
}): React.JSX.Element | null {
  const ticker = useMapStore((s) => s.tickerFilter);
  const operator = useMapStore((s) => s.operatorFilter);
  const only = useMapStore((s) => s.onlyCompanyMatches);
  const setOnly = useMapStore((s) => s.setOnlyCompanyMatches);
  const fit = useMapStore((s) => s.requestCompanyFit);
  const clear = useTickerSelection();
  const operators = useMemo(() => selectedOperators(ticker, operator), [ticker, operator]);
  const count = useMemo(
    () => data?.features.filter((f) => companyMatches(f, operators)).length ?? 0,
    [data, operators],
  );
  if (!ticker && !operator) return null;
  const name = ticker
    ? (TICKER_META_BY_SYMBOL.get(ticker)?.name ?? ticker)
    : (data?.features.find((f) => companyMatches(f, operators))?.properties.operator ?? operator);
  return (
    <section aria-label="Company selection" className="company-selection">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-focus)]" />
        <strong className="truncate text-sm">{name}</strong>
        {ticker && <span className="font-mono text-[10px] text-text-muted">{ticker}</span>}
        <button
          type="button"
          onClick={() => clear(null)}
          aria-label="Clear company selection"
          className="ml-auto rounded p-1.5 hover:bg-bg-elevated"
        >
          <X size={14} />
        </button>
      </div>
      <p className="mb-2 text-xs text-text-muted">
        {!data
          ? 'Loading facilities…'
          : operators.size === 0
            ? 'No facility links yet'
            : `${count.toLocaleString()} linked facilities`}
      </p>
      <div className="flex flex-wrap items-center gap-1" aria-label="Company display controls">
        <button
          className="workspace-button"
          aria-pressed={!only}
          disabled={!count}
          onClick={() => setOnly(false)}
        >
          Highlight
        </button>
        <button
          className="workspace-button"
          aria-pressed={only}
          title="Show only matching datacenter facilities; other enabled layers remain visible."
          disabled={!count}
          onClick={() => setOnly(true)}
        >
          Only matches
        </button>
        <button
          className="workspace-button inline-flex items-center gap-1"
          disabled={!count}
          onClick={fit}
        >
          <Crosshair size={12} />
          Fit to facilities
        </button>
      </div>
    </section>
  );
}
