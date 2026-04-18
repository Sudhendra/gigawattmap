/**
 * Hard-coded list of public companies that drive AI-infrastructure economics.
 * Order within each section matters — it's the order they render in the panel.
 *
 * Sections are editorial groupings, not GICS sectors. They reflect how an
 * investor reasoning about AI capex actually slices the universe.
 */

/** Allowed ticker section ids — `as const` so consumers can switch exhaustively. */
export const TICKER_SECTIONS = [
  'reits',
  'picks_and_shovels',
  'silicon',
  'power_and_neoclouds',
] as const;

export type TickerSection = (typeof TICKER_SECTIONS)[number];

export type TickerConfig = {
  /** Ticker symbol as listed on its primary US exchange. */
  symbol: string;
  /** Editorial section the ticker belongs to. Drives panel grouping. */
  section: TickerSection;
  /** Short company name shown in the panel. */
  name: string;
};

/**
 * Canonical ticker list for v1. Twenty-five symbols across four sections,
 * matching `tasks/020-ticker-panel.md`. Adding or removing a ticker is a
 * one-line change here; downstream consumers iterate this list.
 */
export const TICKERS: readonly TickerConfig[] = [
  // REITs — datacenter landlords.
  { symbol: 'EQIX', section: 'reits', name: 'Equinix' },
  { symbol: 'DLR', section: 'reits', name: 'Digital Realty' },
  { symbol: 'IRM', section: 'reits', name: 'Iron Mountain' },

  // Picks & shovels — power, cooling, switchgear suppliers.
  { symbol: 'VRT', section: 'picks_and_shovels', name: 'Vertiv (cooling)' },
  { symbol: 'ETN', section: 'picks_and_shovels', name: 'Eaton (electrical)' },
  { symbol: 'NVT', section: 'picks_and_shovels', name: 'nVent' },
  { symbol: 'SU', section: 'picks_and_shovels', name: 'Schneider Electric ADR' },
  { symbol: 'MOD', section: 'picks_and_shovels', name: 'Modine' },
  { symbol: 'JCI', section: 'picks_and_shovels', name: 'Johnson Controls' },

  // Silicon — accelerators, networking, memory.
  { symbol: 'NVDA', section: 'silicon', name: 'NVIDIA' },
  { symbol: 'AVGO', section: 'silicon', name: 'Broadcom' },
  { symbol: 'AMD', section: 'silicon', name: 'AMD' },
  { symbol: 'MRVL', section: 'silicon', name: 'Marvell' },
  { symbol: 'MU', section: 'silicon', name: 'Micron' },

  // Power & neoclouds — generation, hyperscalers, GPU clouds.
  { symbol: 'TLN', section: 'power_and_neoclouds', name: 'Talen Energy' },
  { symbol: 'VST', section: 'power_and_neoclouds', name: 'Vistra' },
  { symbol: 'CEG', section: 'power_and_neoclouds', name: 'Constellation Energy' },
  { symbol: 'NRG', section: 'power_and_neoclouds', name: 'NRG Energy' },
  { symbol: 'CRWV', section: 'power_and_neoclouds', name: 'CoreWeave' },
  { symbol: 'NBIS', section: 'power_and_neoclouds', name: 'Nebius' },
  { symbol: 'MSFT', section: 'power_and_neoclouds', name: 'Microsoft' },
  { symbol: 'GOOGL', section: 'power_and_neoclouds', name: 'Alphabet' },
  { symbol: 'AMZN', section: 'power_and_neoclouds', name: 'Amazon' },
  { symbol: 'META', section: 'power_and_neoclouds', name: 'Meta' },
  { symbol: 'ORCL', section: 'power_and_neoclouds', name: 'Oracle' },
];

/** Symbol set for cheap O(1) validation in the route handler. */
export const TICKER_SYMBOLS: ReadonlySet<string> = new Set(
  TICKERS.map((t) => t.symbol),
);
