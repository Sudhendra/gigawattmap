'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  SECTION_LABEL,
  TICKER_SECTIONS,
  tickerHasLinks,
  countLinkedFacilities,
  TICKER_META_BY_SYMBOL,
} from '@/lib/ticker-map';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';
import { useTickerSelection } from '@/lib/hooks/use-ticker-selection';
import { useMapStore } from '@/lib/store/map-store';
import { groupBySection } from './group-by-section';
import { nextTickerFilter } from './toggle';
import type { TickerQuote } from './types';

import { fetchTickers } from './ticker-query';

/**
 * Top-right floating market panel. Tracks 25 AI-infra equities, refreshes
 * every 5 minutes (the Worker caches upstream for 10), and lets the user
 * filter the map by clicking a row. Clicking the active ticker again
 * clears the filter.
 */
export function TickerPanel({
  facilities,
  onSelection,
}: {
  facilities: AiCampusCollection | null;
  onSelection?: () => void;
}): React.JSX.Element {
  const tickerFilter = useMapStore((s) => s.tickerFilter);
  const setTickerFilter = useTickerSelection();
  const [query, setQuery] = useState('');

  const { data, isError, isLoading } = useQuery({
    queryKey: ['tickers'],
    queryFn: fetchTickers,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => groupBySection(), []);

  const quotesBySymbol = useMemo(() => {
    const m = new Map<string, TickerQuote>();
    if (data) for (const q of data) m.set(q.symbol, q);
    return m;
  }, [data]);

  function handleTickerClick(symbol: string): void {
    setTickerFilter(nextTickerFilter(tickerFilter, symbol));
    onSelection?.();
  }

  return (
    <aside
      className="flex min-h-0 flex-col text-xs"
      style={{
        background: 'color-mix(in oklab, var(--bg-panel) 92%, transparent)',
        borderColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
      aria-label="Market intelligence panel"
    >
      <header
        className="flex items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <div className="flex flex-col">
          <span
            className="text-[10px] uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Listed companies
          </span>
          <span className="text-[10px] normal-case" style={{ color: 'var(--text-subtle)' }}>
            Show linked facilities
          </span>
        </div>
      </header>

      <div className="px-4 py-3">
        <input
          aria-label="Search companies"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company or ticker…"
          className="workspace-input w-full"
        />
      </div>
      {tickerFilter && (
        <div
          className="border-b border-[var(--bg-elevated)] px-3 py-2 text-[11px]"
          aria-live="polite"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <strong>{TICKER_META_BY_SYMBOL.get(tickerFilter)?.name ?? tickerFilter}</strong>
            <button
              type="button"
              onClick={() => setTickerFilter(null)}
              aria-label="Clear linked facilities"
              className="rounded px-2 py-1 text-[var(--accent-focus)] focus-visible:ring-2"
            >
              Clear ×
            </button>
          </div>
          {!tickerHasLinks(tickerFilter) ? (
            <p>No facility links yet. Showing all facilities without company highlighting.</p>
          ) : (
            <>
              <p>
                {facilities
                  ? `${countLinkedFacilities(facilities.features, tickerFilter).toLocaleString()} linked facilities in this dataset`
                  : 'Loading facility count…'}
              </p>
              <details className="mt-2 text-[var(--text-muted)]">
                <summary className="cursor-pointer">How company links work</summary>
                <p className="mt-2 leading-relaxed">
                  Links match recorded facility operators, not supplier contracts or revenue
                  exposure. Highlight keeps other facilities dimmed; Only matches hides them.
                  Cluster numbers count the facilities currently shown.
                </p>
              </details>
            </>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.trim() &&
          !TICKER_SECTIONS.some((section) =>
            grouped[section].some((ticker) =>
              `${ticker.name} ${ticker.symbol}`.toLowerCase().includes(query.toLowerCase().trim()),
            ),
          ) && <p className="px-4 py-5 text-sm text-text-muted">No companies match your search.</p>}
        {TICKER_SECTIONS.filter((section) =>
          grouped[section].some((ticker) =>
            `${ticker.name} ${ticker.symbol}`.toLowerCase().includes(query.toLowerCase().trim()),
          ),
        ).map((section) => (
          <section key={section}>
            <h3
              className="sticky top-0 z-10 px-3 py-1.5 text-[10px] uppercase tracking-wide backdrop-blur"
              style={{
                background: 'color-mix(in oklab, var(--bg-panel) 95%, transparent)',
                color: 'var(--text-subtle)',
              }}
            >
              {SECTION_LABEL[section]}
            </h3>
            <ul>
              {grouped[section]
                .filter((ticker) =>
                  `${ticker.name} ${ticker.symbol}`
                    .toLowerCase()
                    .includes(query.toLowerCase().trim()),
                )
                .map((ticker) => {
                  const quote = quotesBySymbol.get(ticker.symbol);
                  const active = tickerFilter === ticker.symbol;
                  const dimmable = !tickerHasLinks(ticker.symbol);
                  return (
                    <li key={ticker.symbol}>
                      <button
                        type="button"
                        onClick={() => handleTickerClick(ticker.symbol)}
                        className="grid w-full grid-cols-[1fr_4.5rem_4.5rem] items-baseline gap-x-2 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-focus)]"
                        style={{
                          background: active ? 'var(--bg-elevated)' : 'transparent',
                        }}
                        aria-pressed={active}
                        aria-label={`${ticker.symbol} — ${ticker.name}: ${dimmable ? 'No facility links yet' : 'Show linked facilities'}`}
                        title={
                          dimmable ? `${ticker.name} — no facilities directly mapped` : ticker.name
                        }
                      >
                        <span
                          className="font-mono font-medium tabular-nums"
                          style={{
                            color: active
                              ? 'var(--accent-focus)'
                              : dimmable
                                ? 'var(--text-muted)'
                                : 'var(--text-primary)',
                          }}
                        >
                          <span aria-hidden className="inline-block w-2.5">
                            {active ? '●' : dimmable && !active ? '–' : ''}
                          </span>{' '}
                          {ticker.symbol}
                        </span>
                        <PriceCell quote={quote} loading={isLoading} error={isError} />
                        <ChangeCell quote={quote} />
                        <span className="col-span-3 text-[11px] text-[var(--text-muted)]">
                          <span className="mb-1 block text-xs text-[var(--text-primary)]">
                            {ticker.name}
                          </span>
                          {dimmable
                            ? 'No facility links yet'
                            : facilities
                              ? `${countLinkedFacilities(facilities.features, ticker.symbol)} linked facilities`
                              : 'Loading facilities…'}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>

      <footer
        className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[10px]"
        style={{
          borderColor: 'var(--bg-elevated)',
          color: 'var(--text-subtle)',
        }}
      >
        <span>15-min delayed</span>
        <a
          href="https://finnhub.io"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          via Finnhub
        </a>
      </footer>
    </aside>
  );
}

function PriceCell({
  quote,
  loading,
  error,
}: {
  quote: TickerQuote | undefined;
  loading: boolean;
  error: boolean;
}): React.JSX.Element {
  if (quote) {
    return (
      <span className="font-mono text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {quote.price.toFixed(2)}
      </span>
    );
  }
  if (error) {
    return (
      <span className="text-right" style={{ color: 'var(--status-blocked)' }}>
        —
      </span>
    );
  }
  return (
    <span
      aria-hidden={loading}
      className="text-right text-[10px]"
      style={{ color: 'var(--text-subtle)' }}
    >
      …
    </span>
  );
}

function ChangeCell({ quote }: { quote: TickerQuote | undefined }): React.JSX.Element {
  if (!quote) return <span aria-hidden />;
  const positive = quote.change_pct >= 0;
  const color = positive ? 'var(--status-operational)' : 'var(--status-blocked)';
  const Arrow = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className="flex items-center gap-1 font-mono tabular-nums"
      style={{ color }}
      aria-label={`${positive ? 'up' : 'down'} ${Math.abs(quote.change_pct).toFixed(2)} percent`}
    >
      <Arrow size={10} aria-hidden />
      {Math.abs(quote.change_pct).toFixed(2)}%
    </span>
  );
}

// end of file
