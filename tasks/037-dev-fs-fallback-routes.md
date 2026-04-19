# 037 — Wire dev fs-fallback into all R2 artifact route handlers

**Status:** in-progress
**Depends on:** none
**Estimate:** 45 min

## Context

`apps/api/src/lib/r2.ts::readArtifact` already supports a `devReader` injection that lets `wrangler dev` serve fresh pipeline output from `DEV_ARTIFACT_DIR` when the local R2 binding is empty. But none of the four route handlers (`og`, `datacenters`, `powerplants`, `announcements`) actually pass `devReader`, so every dev request returns 404 / `artifact_unavailable`.

Discovered while smoke-testing the 025b share-modal "Download PNG" action — every dc lookup 404s in dev because `loadDcs()` in `og.ts` never reaches the fs fallback.

Additionally, R2 keys are namespaced under `v1/downloads/...` while the pipeline writes to `data-pipeline/out/<filename>` directly. The dev path resolver must strip the `v1/downloads/` prefix so existing pipeline output is reachable without a separate publish step.

## Acceptance criteria

- [ ] `apps/api/src/lib/r2.ts` exports a default node-fs `devReader` factory (only used by the worker entry / route handlers, not by tests).
- [ ] Dev path resolution strips a leading `v1/downloads/` segment so `<DEV_ARTIFACT_DIR>/<basename>` is checked. Documented in code.
- [ ] All four route handlers (`og`, `datacenters`, `powerplants`, `announcements`) inject the dev reader.
- [ ] `apps/api/wrangler.toml` documents `DEV_ARTIFACT_DIR` with an example pointing at `../../data-pipeline/out`.
- [ ] `pnpm --filter api test` passes (existing r2 tests + any new path-stripping coverage).
- [ ] Live verify: `curl http://localhost:8787/api/v1/og?dc=amazon-rainier-ms` returns 200 image/png.
- [ ] Live verify: `curl http://localhost:8787/api/v1/datacenters?bbox=...` returns geojson, not `{"error":"artifact_unavailable"}`.

## Files to touch

- `apps/api/src/lib/r2.ts` — add default node devReader, key-prefix stripping
- `apps/api/src/lib/r2.test.ts` — cover prefix stripping
- `apps/api/src/routes/og.ts` — inject devReader
- `apps/api/src/routes/datacenters.ts` — inject devReader
- `apps/api/src/routes/powerplants.ts` — inject devReader
- `apps/api/src/routes/announcements.ts` — inject devReader
- `apps/api/wrangler.toml` — document `DEV_ARTIFACT_DIR`
- `apps/api/.dev.vars.example` — if exists, add example

## Notes

- Cloudflare Workers don't have `node:fs` at runtime, so the fs reader must be loaded via dynamic import gated on `env.DEV_ARTIFACT_DIR` truthy. Same pattern as `workers-og` dynamic import in `og.ts`.
- nodejs_compat is already enabled in wrangler.toml, so dynamic `node:fs/promises` import works under wrangler dev.
- Production: `env.DEV_ARTIFACT_DIR` is empty → dynamic import never executes → no impact on Worker bundle behavior.
