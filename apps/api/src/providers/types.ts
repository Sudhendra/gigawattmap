/**
 * Wire format returned by `GET /api/v1/tickers`. Numbers are deliberately
 * raw — the UI is responsible for formatting (locale, sign, color).
 */
export type TickerQuote = {
  symbol: string;
  /** Last trade price, USD. */
  price: number;
  /** Absolute change vs. previous close, USD. */
  change_abs: number;
  /** Percent change vs. previous close. `1.5` means +1.5 %. */
  change_pct: number;
  /** ISO-8601 UTC timestamp from the upstream provider. */
  as_of: string;
};

/**
 * Provider-agnostic interface so we can swap Finnhub for Yahoo, Alpha Vantage,
 * or a paid feed without touching the route handler. Each implementation
 * deals with its own auth, rate-limiting, and timestamp normalization.
 */
export type TickerProvider = {
  /** Stable provider name for logs and cache namespacing. */
  readonly name: string;
  /**
   * Fetch a single quote. Implementations must reject (throw) on transport
   * errors and return `null` only when the symbol is genuinely unknown.
   * Implementations should set their own timeout via AbortController.
   */
  fetchQuote(symbol: string): Promise<TickerQuote | null>;
};

export class TickerProviderError extends Error {
  override readonly name = 'TickerProviderError';
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}
