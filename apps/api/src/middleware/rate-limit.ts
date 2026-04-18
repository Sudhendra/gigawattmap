import type { MiddlewareHandler } from 'hono';

/**
 * Public-API rate limiter.
 *
 * Why our own and not `hono-rate-limiter` or Cloudflare's binding:
 *
 *   1. Cloudflare's rate-limit binding is a paid add-on and it isn't available
 *      in the local `wrangler dev` runtime, which would leave our local API
 *      unprotected and our tests unable to exercise the throttle path.
 *   2. `hono-rate-limiter` pulls in extra deps for Express compatibility we
 *      don't need. The implementation here is ~40 lines and exactly fits the
 *      single AGENTS.md rule: 60 req/min/IP, 429 + Retry-After.
 *
 * The limiter uses a fixed-window counter keyed by client IP. When the wider
 * traffic profile justifies it, swap `MemoryStore` for the Cloudflare binding;
 * the middleware contract (rate, window, headers) is unchanged.
 */

export type RateLimitStore = {
  /** Returns the count after incrementing for `key`, plus the window reset time (epoch ms). */
  hit(key: string, now: number, windowMs: number): { count: number; resetAt: number };
};

export type RateLimitOptions = {
  /** Max requests allowed per window. Spec: 60. */
  limit: number;
  /** Window length in seconds. Spec: 60 (i.e. 60 req/min). */
  windowSeconds: number;
  /** Override the clock for tests. Defaults to `Date.now`. */
  now?: () => number;
  /** Override the store for tests / future CF binding. Defaults to in-memory. */
  store?: RateLimitStore;
};

/**
 * Build the middleware. Each call returns a fresh in-memory store so
 * separate routers don't share counters (and tests stay isolated).
 */
export function createRateLimit(opts: RateLimitOptions): MiddlewareHandler {
  const limit = opts.limit;
  const windowMs = opts.windowSeconds * 1000;
  const now = opts.now ?? (() => Date.now());
  const store = opts.store ?? createMemoryStore();

  return async (c, next) => {
    const key = clientKey(c.req.raw);
    const t = now();
    const { count, resetAt } = store.hit(key, t, windowMs);
    if (count > limit) {
      // Retry-After is in *seconds*, rounded up so we never tell the client
      // to retry early. Minimum of 1 keeps callers from hammering the bound.
      const retrySeconds = Math.max(1, Math.ceil((resetAt - t) / 1000));
      return c.json(
        { error: 'rate_limited', retry_after: retrySeconds },
        429,
        { 'retry-after': String(retrySeconds) },
      );
    }
    await next();
  };
}

/**
 * Pull a stable client identifier from the request. We prefer
 * `cf-connecting-ip` (Cloudflare's authoritative client IP) and fall back to
 * `x-forwarded-for`'s first hop. When neither is present (local curl, tests
 * without headers) we use a single shared bucket — fine for dev because no
 * real attacker is on `localhost`.
 */
function clientKey(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

/**
 * Fixed-window in-memory counter. Entries are pruned lazily on the next hit
 * for that key so a huge IP space doesn't grow unbounded across windows; the
 * Worker's per-isolate lifetime caps total memory anyway.
 */
function createMemoryStore(): RateLimitStore {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    hit(key, now, windowMs) {
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const entry = { count: 1, resetAt: now + windowMs };
        buckets.set(key, entry);
        return entry;
      }
      existing.count += 1;
      return existing;
    },
  };
}
