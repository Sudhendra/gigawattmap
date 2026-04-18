import { describe, expect, it } from 'vitest';
import { createTickersRouter, type Env } from './tickers';
import type { TickerProvider, TickerQuote } from '../providers/types';
import { TICKERS } from '../config/tickers';

/**
 * Minimal in-memory KV stand-in. Workers KV is async-only and `get(json)`
 * returns the parsed value, so we mirror that shape here.
 */
function createKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string, type?: 'json' | 'text' | 'arrayBuffer' | 'stream') {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

function makeEnv(provider: TickerProvider): Env {
  return {
    FINNHUB_TOKEN: 'unused-in-tests',
    TICKERS_CACHE: createKv(),
    ARTIFACTS: {} as unknown as R2Bucket,
  };
}

function fakeQuote(symbol: string): TickerQuote {
  return {
    symbol,
    price: 100,
    change_abs: 1,
    change_pct: 1,
    as_of: '2025-01-01T00:00:00.000Z',
  };
}

describe('GET /api/v1/tickers', () => {
  it('returns one quote per configured ticker on cache miss', async () => {
    const calls: string[] = [];
    const provider: TickerProvider = {
      name: 'fake',
      async fetchQuote(symbol) {
        calls.push(symbol);
        return fakeQuote(symbol);
      },
    };
    const env = makeEnv(provider);
    const router = createTickersRouter({ providerFactory: () => provider });
    const res = await router.request('/', {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-cache')).toBe('MISS');
    const body = (await res.json()) as TickerQuote[];
    expect(body).toHaveLength(TICKERS.length);
    expect(calls).toHaveLength(TICKERS.length);
  });

  it('serves from KV on the second request', async () => {
    let callCount = 0;
    const provider: TickerProvider = {
      name: 'fake',
      async fetchQuote(symbol) {
        callCount++;
        return fakeQuote(symbol);
      },
    };
    const env = makeEnv(provider);
    const router = createTickersRouter({ providerFactory: () => provider });

    const first = await router.request('/', {}, env);
    expect(first.headers.get('x-cache')).toBe('MISS');

    const second = await router.request('/', {}, env);
    expect(second.status).toBe(200);
    expect(second.headers.get('x-cache')).toBe('HIT');
    // Provider was only hit during the cache-miss request.
    expect(callCount).toBe(TICKERS.length);
  });

  it('drops failed tickers but keeps the rest', async () => {
    const provider: TickerProvider = {
      name: 'fake',
      async fetchQuote(symbol) {
        if (symbol === 'NVDA') throw new Error('upstream 503');
        return fakeQuote(symbol);
      },
    };
    const env = makeEnv(provider);
    const router = createTickersRouter({ providerFactory: () => provider });
    const res = await router.request('/', {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as TickerQuote[];
    expect(body.find((q) => q.symbol === 'NVDA')).toBeUndefined();
    expect(body).toHaveLength(TICKERS.length - 1);
  });

  it('returns 502 when every ticker fails', async () => {
    const provider: TickerProvider = {
      name: 'fake',
      async fetchQuote() {
        throw new Error('upstream down');
      },
    };
    const env = makeEnv(provider);
    const router = createTickersRouter({ providerFactory: () => provider });
    const res = await router.request('/', {}, env);
    expect(res.status).toBe(502);
  });
});
