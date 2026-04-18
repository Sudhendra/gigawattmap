import type { CloudProvider } from '@/lib/colors';

/**
 * Editorial section grouping for the ticker panel. Mirrors the API's
 * `TickerSection` (`apps/api/src/config/tickers.ts`). Kept in sync by hand
 * — both sides are tiny, and the duplication keeps the API self-contained.
 */
export const TICKER_SECTIONS = [
  'reits',
  'picks_and_shovels',
  'silicon',
  'power_and_neoclouds',
] as const;

export type TickerSection = (typeof TICKER_SECTIONS)[number];

export type TickerMeta = {
  symbol: string;
  section: TickerSection;
  name: string;
  /** Human-readable label for the section header. */
};

/** Display label per section. Lowercase to match the editorial dark theme. */
export const SECTION_LABEL: Record<TickerSection, string> = {
  reits: 'datacenter REITs',
  picks_and_shovels: 'picks & shovels',
  silicon: 'silicon',
  power_and_neoclouds: 'power & neoclouds',
};

/**
 * Canonical ticker list. Same 25 symbols as the API config; we duplicate
 * intentionally so the panel can render before the network round-trip
 * resolves (skeleton rows in section order).
 */
export const TICKERS: readonly TickerMeta[] = [
  { symbol: 'EQIX', section: 'reits', name: 'Equinix' },
  { symbol: 'DLR', section: 'reits', name: 'Digital Realty' },
  { symbol: 'IRM', section: 'reits', name: 'Iron Mountain' },
  { symbol: 'VRT', section: 'picks_and_shovels', name: 'Vertiv' },
  { symbol: 'ETN', section: 'picks_and_shovels', name: 'Eaton' },
  { symbol: 'NVT', section: 'picks_and_shovels', name: 'nVent' },
  { symbol: 'SU', section: 'picks_and_shovels', name: 'Schneider' },
  { symbol: 'MOD', section: 'picks_and_shovels', name: 'Modine' },
  { symbol: 'JCI', section: 'picks_and_shovels', name: 'Johnson Controls' },
  { symbol: 'NVDA', section: 'silicon', name: 'NVIDIA' },
  { symbol: 'AVGO', section: 'silicon', name: 'Broadcom' },
  { symbol: 'AMD', section: 'silicon', name: 'AMD' },
  { symbol: 'MRVL', section: 'silicon', name: 'Marvell' },
  { symbol: 'MU', section: 'silicon', name: 'Micron' },
  { symbol: 'TLN', section: 'power_and_neoclouds', name: 'Talen' },
  { symbol: 'VST', section: 'power_and_neoclouds', name: 'Vistra' },
  { symbol: 'CEG', section: 'power_and_neoclouds', name: 'Constellation' },
  { symbol: 'NRG', section: 'power_and_neoclouds', name: 'NRG' },
  { symbol: 'CRWV', section: 'power_and_neoclouds', name: 'CoreWeave' },
  { symbol: 'NBIS', section: 'power_and_neoclouds', name: 'Nebius' },
  { symbol: 'MSFT', section: 'power_and_neoclouds', name: 'Microsoft' },
  { symbol: 'GOOGL', section: 'power_and_neoclouds', name: 'Alphabet' },
  { symbol: 'AMZN', section: 'power_and_neoclouds', name: 'Amazon' },
  { symbol: 'META', section: 'power_and_neoclouds', name: 'Meta' },
  { symbol: 'ORCL', section: 'power_and_neoclouds', name: 'Oracle' },
];

/** O(1) section lookup. */
export const TICKER_META_BY_SYMBOL: ReadonlyMap<string, TickerMeta> = new Map(
  TICKERS.map((t) => [t.symbol, t]),
);

// ---------------------------------------------------------------------------
// Ticker -> map-feature linkage
// ---------------------------------------------------------------------------
//
// This mapping is editorial. We deliberately keep it conservative: only
// link a ticker to a feature when there is an obvious, defensible
// connection (a hyperscaler operating its own campuses; a power producer
// with publicly-disclosed AI offtakes). When a ticker has no link we
// return an empty filter and the UI shows a "no specific facilities
// linked" caption rather than dimming the whole map.
//
// Methodology is documented on /about (task 023).

/**
 * Operator names from the AI-campus seed that are owned/operated by a
 * given ticker. Match keys are exact `properties.operator` strings — the
 * pipeline normalizes operator names to a controlled list in task 014.
 */
const OPERATORS_BY_TICKER: Readonly<Record<string, readonly string[]>> = {
  // Hyperscaler campuses
  MSFT: ['Microsoft'],
  GOOGL: ['Google'],
  AMZN: ['Amazon'],
  META: ['Meta'],
  ORCL: ['Oracle'],
  // Neoclouds + AI labs
  CRWV: ['CoreWeave'],
  NBIS: ['Nebius'],
  // REITs whose campuses appear in the seed
  EQIX: ['Equinix'],
  DLR: ['Digital Realty'],
  // Power producers known to host or serve AI offtakes
  TLN: ['Talen', 'Amazon'], // Susquehanna campus + AWS Cumulus offtake
  // Pure-play silicon doesn't operate datacenters; left empty so the
  // filter is a no-op and we don't pretend.
};

/**
 * Cloud-region providers reachable from a given ticker. Mirrors the
 * `CloudProvider` enum used by the cloud-regions layer.
 */
const CLOUD_PROVIDERS_BY_TICKER: Readonly<
  Record<string, readonly CloudProvider[]>
> = {
  MSFT: ['azure'],
  GOOGL: ['gcp'],
  AMZN: ['aws'],
  ORCL: ['oracle'],
  // (Alibaba is private; no ticker maps to it.)
};

/**
 * Resolve which campus operators and cloud providers should remain fully
 * lit when the user clicks a ticker. Empty arrays signal "no editorial
 * link" — callers should treat that as "do not dim anything".
 */
export type TickerFilterTargets = {
  operators: ReadonlySet<string>;
  cloudProviders: ReadonlySet<CloudProvider>;
};

export function targetsForTicker(symbol: string | null): TickerFilterTargets {
  if (!symbol) return EMPTY_TARGETS;
  const ops = OPERATORS_BY_TICKER[symbol] ?? [];
  const clouds = CLOUD_PROVIDERS_BY_TICKER[symbol] ?? [];
  return {
    operators: new Set(ops),
    cloudProviders: new Set(clouds),
  };
}

/** True iff the ticker has at least one editorial link in either dimension. */
export function tickerHasLinks(symbol: string): boolean {
  const t = targetsForTicker(symbol);
  return t.operators.size > 0 || t.cloudProviders.size > 0;
}

const EMPTY_TARGETS: TickerFilterTargets = {
  operators: new Set<string>(),
  cloudProviders: new Set<CloudProvider>(),
};
