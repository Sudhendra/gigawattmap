# 025a — OG image endpoint

**Status:** in-progress
**Depends on:** none
**Estimate:** 60m

## Context

Every shared link should produce a beautiful 1200×630 social card. Workers
runtime supports `@vercel/og` (Satori under the hood) which generates PNGs
without a headless browser. Three variants:

1. `/api/v1/og` — default "Gigawatt Map" splash
2. `/api/v1/og?dc=<id>` — datacenter-specific (name, operator, location, MW)
3. `/api/v1/og?market=<slug>` — market-specific

Map thumbnails are deferred to a later iteration — initial cards are
typographic on the dark palette.

## Acceptance criteria

- [ ] New file `apps/api/src/routes/og.ts` exporting `og(c)` handler
- [ ] Route registered in `apps/api/src/index.ts` as `GET /api/v1/og`
- [ ] Response is `image/png`, 1200×630, with `cache-control: public, max-age=86400, s-maxage=3600`
- [ ] Default variant renders "Gigawatt Map" wordmark + tagline on `--bg-base`
- [ ] `?dc=<id>` looks up the facility from the datacenters artifact and renders name, operator, ~MW, country
- [ ] `?market=<slug>` accepted (returns titled card with the slug, full market data wiring deferred to 025c)
- [ ] Unknown `?dc=<id>` returns 404 JSON, NOT a broken image
- [ ] Vitest tests cover: default returns PNG headers, missing dc returns 404, valid dc returns 200 with PNG content-type
- [ ] `pnpm --filter api test` passes; `pnpm --filter api typecheck` passes

## Files to touch

- `apps/api/src/routes/og.ts` (new)
- `apps/api/src/routes/og.test.ts` (new)
- `apps/api/src/index.ts` (register route)
- `apps/api/package.json` (add `@vercel/og` dependency, justify per AGENTS.md)

## Notes

- Per AGENTS.md dependency policy: `@vercel/og` is the standard for Workers OG
  generation, ~1M weekly downloads, official Vercel package, ships TS types.
  Bundle stays in api worker (not web). Document in commit body.
- Use a system font stack (no custom font fetch on first iteration).
- Keep template SIMPLE for v1: dark bg, large mono name, smaller serif metadata.
- Lookup uses the same R2 datacenters artifact already wired into other routes.
