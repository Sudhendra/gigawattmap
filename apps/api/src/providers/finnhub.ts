import { TickerProviderError, type TickerProvider, type TickerQuote } from './types';

/**
 * Finnhub `/quote` response — only the fields we use. See
 * https://finnhub.io/docs/api/quote. Finnhub returns `0` for every numeric
 * field on an unknown ticker, which is how we detect the null case.
 */
type FinnhubQuoteResponse = {
  /** Current price. */
  c: number;
  /** Change. */
  d: number | null;
  /** Percent change. */
  dp: number | null;
  /** High of day. */
  h: number;
  /** Low of day. */
  l: number;
  /** Previous close. */
  pc: number;
  /** Open. */
  o: number;
  /** UNIX timestamp (seconds). */
  t: number;
};

/** 5 s upstream timeout. The Worker route adds its own 6 s outer timeout. */
const FETCH_TIMEOUT_MS = 5_000;

export type FinnhubProviderOptions = {
  token: string;
  /** Optional fetch override for tests. */
  fetchImpl?: typeof fetch;
};

/**
 * Finnhub free-tier `/quote` adapter. Free tier allows 60 req/min — well
 * above what the Worker actually issues thanks to a 10-minute KV cache.
 */
export class FinnhubProvider implements TickerProvider {
  readonly name = 'finnhub';
  readonly #token: string;
  readonly #fetch: typeof fetch;

  constructor({ token, fetchImpl }: FinnhubProviderOptions) {
    if (!token) throw new TickerProviderError('FINNHUB_TOKEN is required');
    this.#token = token;
    this.#fetch = fetchImpl ?? fetch;
  }

  async fetchQuote(symbol: string): Promise<TickerQuote | null> {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(this.#token)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await this.#fetch(url, { signal: controller.signal });
    } catch (err) {
      throw new TickerProviderError(`Finnhub fetch failed for ${symbol}`, err);
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 429) {
      throw new TickerProviderError(`Finnhub rate-limited (${symbol})`);
    }
    if (!res.ok) {
      throw new TickerProviderError(
        `Finnhub returned ${res.status} for ${symbol}`,
      );
    }
    const body = (await res.json()) as FinnhubQuoteResponse;
    // Finnhub returns all-zero on unknown symbols. We treat that as `null`
    // rather than emit a misleading $0.00 quote into the UI.
    if (body.c === 0 && body.pc === 0 && body.t === 0) return null;
    return {
      symbol,
      price: body.c,
      change_abs: body.d ?? 0,
      change_pct: body.dp ?? 0,
      as_of: new Date(body.t * 1000).toISOString(),
    };
  }
}
