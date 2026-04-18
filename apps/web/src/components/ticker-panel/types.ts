/** Wire format for `GET /api/v1/tickers`. Mirrors `apps/api/src/providers/types.ts`. */
export type TickerQuote = {
  symbol: string;
  price: number;
  change_abs: number;
  change_pct: number;
  as_of: string;
};
