import { describe, expect, it } from 'vitest';
import { FinnhubProvider } from './finnhub';

/**
 * Simulates the Cloudflare Workers runtime guard: native `fetch` throws
 * `TypeError: Illegal invocation` when invoked with anything other than
 * `globalThis` as its `this` receiver. Node's undici fetch does not do
 * this, so without an explicit test the bug is invisible until deploy.
 */
function makeWorkersStyleFetch(): typeof fetch {
  return function (this: unknown, _input: RequestInfo | URL, _init?: RequestInit) {
    if (this !== globalThis && this !== undefined) {
      throw new TypeError('Illegal invocation');
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({ c: 100, d: 1, dp: 1, h: 101, l: 99, o: 99.5, pc: 99, t: 1_700_000_000 }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
  } as typeof fetch;
}

describe('FinnhubProvider', () => {
  it('invokes the captured fetch with the correct receiver (Workers semantics)', async () => {
    const provider = new FinnhubProvider({
      token: 'test-token',
      fetchImpl: makeWorkersStyleFetch(),
    });
    const quote = await provider.fetchQuote('NVDA');
    expect(quote).not.toBeNull();
    expect(quote?.symbol).toBe('NVDA');
    expect(quote?.price).toBe(100);
  });
});
