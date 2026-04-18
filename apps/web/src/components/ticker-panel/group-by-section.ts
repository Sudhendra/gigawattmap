import { TICKERS, type TickerSection } from '@/lib/ticker-map';

type TickerList = typeof TICKERS;
type TickerMutable = TickerList[number][];

/**
 * Group tickers by section *once*, in a deterministic order matching
 * `TICKER_SECTIONS`. Pure helper so the panel re-renders are pure DOM
 * updates rather than reshuffling.
 */
export function groupBySection(): Record<TickerSection, TickerList> {
  const out = {
    reits: [] as TickerList,
    picks_and_shovels: [] as TickerList,
    silicon: [] as TickerList,
    power_and_neoclouds: [] as TickerList,
  } satisfies Record<TickerSection, TickerList>;
  for (const t of TICKERS) {
    // Cast: TICKERS is typed against TickerSection so the bucket exists.
    (out[t.section] as TickerMutable).push(t);
  }
  return out;
}
