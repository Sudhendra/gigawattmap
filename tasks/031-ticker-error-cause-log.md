# 031 — Surface upstream cause in ticker error logs

**Status:** todo
**Depends on:** 030
**Estimate:** 15m

## Context
When a ticker fetch fails, `apps/api/src/routes/tickers.ts:82` logs only
the wrapper message (`Finnhub fetch failed for NVDA`) and drops the
underlying `err.cause`. In dev this makes it impossible to tell whether
the failure is a DNS error, TLS handshake, Miniflare networking quirk,
or a genuine upstream HTTP error. This is also useful in production
logs.

## Acceptance criteria
- [ ] Failing test in `apps/api/src/routes/tickers.test.ts` asserts that
      when a provider throws `TickerProviderError(msg, cause)`, the
      console.warn line includes a stringified form of `cause`.
- [ ] Implementation in `tickers.ts` logs `err.cause` (with safe
      stringification) alongside the wrapper message.
- [ ] All existing vitest @api tests still pass (53/53 \u2192 54/54).

## Files to touch
- `apps/api/src/routes/tickers.ts`
- `apps/api/src/routes/tickers.test.ts`

## Notes
- `cause` may be an `Error`, a `DOMException` (AbortError), a plain
  object, or undefined \u2014 handle all four.
- Keep the log on a single line to stay grep-friendly.
- This unblocks debugging the current local-dev "all tickers fail in
  11ms" symptom.
