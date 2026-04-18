# 030 — Wire FINNHUB_TOKEN into Worker dev env

**Status:** done
**Depends on:** 029
**Estimate:** 10m

## Context
`wrangler dev` returns 502 on `/api/v1/tickers` because the Worker can't
find `FINNHUB_TOKEN`. The token value exists in `data-pipeline/.env.local`
but (a) it's misspelled `FINHUB_TOKEN` and (b) the Python pipeline env file
is not read by `wrangler dev` (which loads `apps/api/.dev.vars`).

## Acceptance criteria
- [ ] Typo `FINHUB_TOKEN` corrected to `FINNHUB_TOKEN` in
      `data-pipeline/.env.local` (gitignored; user-side change).
- [ ] `apps/api/.dev.vars` created (gitignored) with the working
      `FINNHUB_TOKEN` value so `wrangler dev` picks it up.
- [ ] After restart, `curl http://localhost:8787/api/v1/tickers` returns
      `200` with a JSON body containing a `groups` array.
- [ ] No code changes; secret-only fix.

## Files to touch
- `data-pipeline/.env.local` (gitignored, manual rename)
- `apps/api/.dev.vars` (gitignored, new)

## Notes
- `apps/api/.dev.vars.example` already documents the correct shape.
- `.dev.vars` is gitignored at repo root.
- `apps/api/src/providers/finnhub.ts:46` throws `TickerProviderError` if
  `token` is empty/undefined, surfaced as `502 Bad Gateway` by the route.
- Production secret stays managed via `wrangler secret put FINNHUB_TOKEN`;
  this only fixes local dev.
