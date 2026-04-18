# 032 — Fix FinnhubProvider 'Illegal invocation' on Workers fetch

**Status:** todo
**Depends on:** 031
**Estimate:** 15m

## Context
Every `/api/v1/tickers` call against `wrangler dev` returns 502. The
underlying cause (now visible thanks to task 031) is:

> TypeError: Illegal invocation: function called with incorrect `this`
> reference.

Workers' `fetch` global must be invoked with `globalThis` as the
receiver. `apps/api/src/providers/finnhub.ts:48` stores
`fetchImpl ?? fetch` on the instance and calls `this.#fetch(url, ...)`,
which rebinds `this` to the `FinnhubProvider` and trips the runtime
guard.

Reference: https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors

## Acceptance criteria
- [ ] Failing vitest reproduces the bug: a fetch impl that throws when
      called without `globalThis` as receiver causes
      `FinnhubProvider.fetchQuote` to fail (RED).
- [ ] Fix in `finnhub.ts` binds the captured fetch to `globalThis` so
      the receiver is correct under Workers semantics (GREEN).
- [ ] All vitest @api tests pass (54 \u2192 55).
- [ ] Manual smoke: `curl http://localhost:8787/api/v1/tickers` returns
      `200` with a JSON quote array against the live Finnhub API.

## Files to touch
- `apps/api/src/providers/finnhub.ts`
- `apps/api/src/providers/finnhub.test.ts` (or new file if not present)

## Notes
- Equivalent fix patterns: `fetchImpl ?? fetch.bind(globalThis)`, or
  wrap in an arrow `(input, init) => (fetchImpl ?? fetch)(input, init)`.
  Bind is simpler and preserves the option for tests to inject their own
  fetch unbound.
- The vitest suite was passing because Node's undici `fetch` does not
  enforce the receiver check; only the Workers runtime does. The test
  must explicitly assert the binding to catch the regression.
