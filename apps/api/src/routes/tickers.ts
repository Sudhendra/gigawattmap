import { Hono } from 'hono';
import { TICKERS, TICKER_SYMBOLS } from '../config/tickers';
import { FinnhubProvider } from '../providers/finnhub';
import {
  TickerProviderError,
  type TickerProvider,
  type TickerQuote,
} from '../providers/types';

/** Worker bindings — extend as we add features. */
export type Env = {
  FINNHUB_TOKEN: string;
  TICKERS_CACHE: KVNamespace;
  /** Public download artifacts bucket (populated by `opendc publish`). */
  ARTIFACTS: R2Bucket;
  /** Dev-only: when set, the API reads artifacts from disk under this path. */
  DEV_ARTIFACT_DIR?: string;
};

/** Cache TTL. KV stores at edge for 10 minutes; clients refresh every 5. */
const CACHE_TTL_SECONDS = 600;
const CACHE_KEY = 'tickers:v1:all';

/**
 * Cached payload schema. We embed `cachedAt` so the response can advertise
 * staleness honestly without re-deriving from KV metadata.
 */
type CachedPayload = {
  cachedAt: string;
  quotes: TickerQuote[];
};

export type TickersHandlerOptions = {
  /** Override the provider for tests. Defaults to FinnhubProvider. */
  providerFactory?: (env: Env) => TickerProvider;
};

/**
 * Build the tickers sub-router. Factory-style so tests can inject a fake
 * provider without touching the global Hono app.
 */
export function createTickersRouter(
  options: TickersHandlerOptions = {},
): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const cache = c.env.TICKERS_CACHE;

    // 1. Cache hit — serve immediately.
    const cached = await cache.get(CACHE_KEY, 'json');
    if (cached && isCachedPayload(cached)) {
      return c.json(cached.quotes, 200, {
        'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
        'x-cache': 'HIT',
        'x-cached-at': cached.cachedAt,
      });
    }

    // 2. Cache miss — fan out to upstream.
    const provider =
      options.providerFactory?.(c.env) ??
      new FinnhubProvider({ token: c.env.FINNHUB_TOKEN });

    const settled = await Promise.allSettled(
      TICKERS.map((t) => provider.fetchQuote(t.symbol)),
    );
    const quotes: TickerQuote[] = [];
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const ticker = TICKERS[i];
      if (!result || !ticker) continue;
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
        continue;
      }
      // We log+drop instead of failing the whole response: a single 5xx
      // ticker shouldn't take down the whole panel.
      if (result.status === 'rejected') {
        const err = result.reason;
        const msg = err instanceof Error ? err.message : String(err);
        const cause =
          err instanceof Error && 'cause' in err ? (err as { cause?: unknown }).cause : undefined;
        const causeMsg =
          cause instanceof Error
            ? `${cause.name}: ${cause.message}`
            : cause === undefined
              ? ''
              : (() => {
                  try {
                    return JSON.stringify(cause);
                  } catch {
                    return String(cause);
                  }
                })();
        console.warn(
          causeMsg
            ? `ticker ${ticker.symbol} failed: ${msg} | cause: ${causeMsg}`
            : `ticker ${ticker.symbol} failed: ${msg}`,
        );
      }
    }

    if (quotes.length === 0) {
      // Total upstream failure — emit a 502 so the client can show an error
      // state instead of an empty panel.
      return c.json(
        { error: 'upstream_unavailable', provider: provider.name },
        502,
      );
    }

    const payload: CachedPayload = {
      cachedAt: new Date().toISOString(),
      quotes,
    };
    // `expirationTtl` is the only TTL flavor that survives across colos
    // and counts from `put` time. 600 s = the spec's 10-minute window.
    await cache.put(CACHE_KEY, JSON.stringify(payload), {
      expirationTtl: CACHE_TTL_SECONDS,
    });

    return c.json(quotes, 200, {
      'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
      'x-cache': 'MISS',
      'x-cached-at': payload.cachedAt,
    });
  });

  // Onboarding helper for the about page; not security-sensitive.
  router.get('/symbols', (c) =>
    c.json([...TICKER_SYMBOLS].sort(), 200, {
      'cache-control': `public, max-age=86400`,
    }),
  );

  router.onError((err, c) => {
    if (err instanceof TickerProviderError) {
      console.error('TickerProviderError', err.message, err.cause);
      return c.json({ error: 'provider_error' }, 502);
    }
    console.error('tickers route error', err);
    return c.json({ error: 'internal_error' }, 500);
  });

  return router;
}

function isCachedPayload(value: unknown): value is CachedPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.cachedAt === 'string' && Array.isArray(v.quotes);
}
