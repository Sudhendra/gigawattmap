'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, TrendingDown, TrendingUp } from 'lucide-react';
import {
  SECTION_LABEL,
  TICKER_SECTIONS,
  tickerHasLinks,
} from '@/lib/ticker-map';
import { useMapStore } from '@/lib/store/map-store';
import { groupBySection } from './group-by-section';
import type { TickerQuote } from './types';

/**
 * Endpoint for the Worker. Override for staging via
 * `NEXT_PUBLIC_API_BASE` (e.g. `https://api.gigawattmap.com`); same-origin
 * default works in dev when the Worker runs behind a Pages function.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';
const TICKERS_URL = `${API_BASE}/api/v1/tickers`;

async function fetchTickers(): Promise<TickerQuote[]> {
  const res = await fetch(TICKERS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`tickers ${res.status}`);
  return (await res.json()) as TickerQuote[];
}

/**
 * Top-right floating market panel. Tracks 25 AI-infra equities, refreshes
 * every 5 minutes (the Worker caches upstream for 10), and lets the user
 * filter the map by clicking a row. Clicking the active ticker again
 * clears the filter.
 */
export function TickerPanel(): React.JSX.Element {
  const tickerFilter = useMapStore((s) => s.tickerFilter);
  const setTickerFilter = useMapStore((s) => s.setTickerFilter);
  const collapsed = useMapStore((s) => s.tickerPanelCollapsed);
  const setCollapsed = useMapStore((s) => s.setTickerPanelCollapsed);

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
    // Toggle: clicking the active filter clears it.
    setTickerFilter(tickerFilter === symbol ? null : symbol);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute right-4 top-4 z-10 flex flex-col items-center gap-1 rounded-md border px-2 py-3 font-mono text-[10px] uppercase tracking-wide shadow-lg backdrop-blur transition-colors hover:bg-[var(--bg-elevated)]"
        style={{
          background: 'color-mix(in oklab, var(--bg-panel) 88%, transparent)',
          borderColor: 'var(--bg-elevated)',
          color: 'var(--text-muted)',
        }}
        aria-label="Show market panel"
      >
        <ChevronLeft size={12} aria-hidden />
        <span className="[writing-mode:vertical-rl] [transform:rotate(180deg)]">
          markets
        </span>
      </button>
    );
  }

  return (
    <aside
      className="absolute right-4 top-4 z-10 flex w-64 flex-col rounded-md border font-mono text-xs shadow-lg backdrop-blur"
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
        <span
          className="text-[10px] uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          markets
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-1 transition-colors hover:bg-[var(--bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
          aria-label="Collapse market panel"
        >
          <ChevronRight size={12} aria-hidden />
        </button>
      </header>

      <div className="max-h-[60vh] overflow-y-auto">
        {TICKER_SECTIONS.map((section) => (
          <section key={section}>
            <h3
              className="sticky top-0 z-10 px-3 py-1.5 text-[10px] uppercase tracking-wide backdrop-blur"
              style={{
                background:
                  'color-mix(in oklab, var(--bg-panel) 95%, transparent)',
                color: 'var(--text-subtle)',
              }}
            >
              {SECTION_LABEL[section]}
            </h3>
            <ul>
              {grouped[section].map((ticker) => {
                const quote = quotesBySymbol.get(ticker.symbol);
                const active = tickerFilter === ticker.symbol;
                const dimmable = !tickerHasLinks(ticker.symbol);
                return (
                  <li key={ticker.symbol}>
                    <button
                      type="button"
                      onClick={() => handleTickerClick(ticker.symbol)}
                      className="grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-2 px-3 py-1 text-left transition-colors hover:bg-[var(--bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-focus)]"
                      style={{
                        background: active
                          ? 'var(--bg-elevated)'
                          : 'transparent',
                      }}
                      aria-pressed={active}
                      title={
                        dimmable
                          ? `${ticker.name} — no facilities directly mapped`
                          : ticker.name
                      }
                    >
                      <span
                        className="font-medium tabular-nums"
                        style={{
                          color: active
                            ? 'var(--accent-focus)'
                            : dimmable
                              ? 'var(--text-muted)'
                              : 'var(--text-primary)',
                        }}
                      >
                        {ticker.symbol}
                      </span>
                      <PriceCell quote={quote} loading={isLoading} error={isError} />
                      <ChangeCell quote={quote} />
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
      <span className="text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
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
      className="flex items-center gap-1 tabular-nums"
      style={{ color }}
      aria-label={`${positive ? 'up' : 'down'} ${Math.abs(quote.change_pct).toFixed(2)} percent`}
    >
      <Arrow size={10} aria-hidden />
      {Math.abs(quote.change_pct).toFixed(2)}%
    </span>
  );
}

// end of file
