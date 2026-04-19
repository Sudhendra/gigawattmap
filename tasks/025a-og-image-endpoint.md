# 025a — OG image endpoint

**Status:** done
**Depends on:** none
**Estimate:** 60m

## Context

Every shared link should produce a beautiful 1200×630 social card. Workers
runtime supports OG card generation (Satori under the hood) which generates
PNGs without a headless browser. Three variants:

1. `/api/v1/og` — default "Gigawatt Map" splash
2. `/api/v1/og?dc=<id>` — datacenter-specific (name, operator, location, MW)
3. `/api/v1/og?market=<slug>` — market-specific

Map thumbnails are deferred to a later iteration — initial cards are
typographic on the dark palette.

## Acceptance criteria

- [x] New file `apps/api/src/routes/og.ts` exporting `createOgRouter()`
- [x] Route registered in `apps/api/src/index.ts` as `GET /api/v1/og`
- [x] Response is `image/png`, 1200×630, with `cache-control` advertising `max-age=86400, s-maxage=3600`
- [x] Default variant renders "GIGAWATT MAP" wordmark + tagline on `--bg-base`
- [x] `?dc=<id>` looks up the facility from the datacenters artifact and renders name, operator, ~MW, country
- [x] `?market=<slug>` accepted (returns titled card with the slug; full market data wiring deferred to 025b/025c)
- [x] Unknown `?dc=<id>` returns 404 JSON, NOT a broken image
- [x] Vitest tests cover the routing/lookup contract via the pure `resolveOgRequest` helper (default, market, valid dc, unknown dc, missing artifact, dc-over-market precedence)
- [x] `pnpm --filter api test` passes (61/61); `pnpm --filter api typecheck` passes
- [x] Live verification via `wrangler dev` — default + market return valid PNGs (signature `89 50 4e 47`, 17–28 KB), unknown dc returns `{"error":"not_found",...}`

## Files to touch

- `apps/api/src/routes/og.ts` (new)
- `apps/api/src/routes/og.test.ts` (new)
- `apps/api/src/index.ts` (register route)
- `apps/api/package.json` (add `workers-og` + `react` + `@types/react`, justify per AGENTS.md)

## Notes

- **Dependency choice:** `@vercel/og` was tried first and rejected — its edge
  build calls `new URL("index_bg.wasm", undefined)` which throws on workerd
  ("Invalid URL string"). Switched to `workers-og@0.0.27` — it's a smaller
  package and a single-maintainer project, but it's the de-facto Workers
  fork (uses Satori + `@resvg/resvg-wasm` directly, properly initialised
  for the Workers runtime). React is needed for the element tree;
  `createElement` used directly so apps/api stays JSX-runtime-free.
- **Test isolation:** `workers-og` loads a wasm module at top-level import,
  which Node's vitest cannot resolve. The renderer is dynamic-imported
  inside the request handler, and routing is split into a pure
  `resolveOgRequest(query, loadDcs)` that returns a discriminated union.
  Tests cover the routing/404 contract; PNG synthesis is verified via
  `wrangler dev` curl smoke (saved samples in `~/Desktop/og-{default,market}.png`).
- System font stack only on v1 — custom font fetch is the largest cold-start
  hit and we haven't picked a brand face yet.
- Cache-Control advertised by our route is `public, max-age=86400, s-maxage=3600`;
  workers-og also prepends its own `public, immutable, max-age=31536000`.
  Intermediate caches honour the most restrictive directives. Revisit if
  this causes any CDN edge-case issues — easy follow-up to strip workers-og's
  default before responding.
