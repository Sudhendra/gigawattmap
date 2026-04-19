# 037 — Local R2 seed script for `wrangler dev`

**Status:** done
**Depends on:** none
**Estimate:** 45 min

## Context

Discovered while smoke-testing the 025b share-modal "Download PNG" action: every `wrangler dev` request to `/api/v1/og`, `/datacenters`, `/powerplants`, `/announcements`, `/manifest` returns 404 / `artifact_unavailable` because the local R2 binding is empty. There is no dev-time path that publishes pipeline output into the simulated bucket.

### What did NOT work (recorded so we don't try it again)

The original 037 attempt wired a `node:fs/promises` "dev fallback" into `lib/r2.ts` so that when `DEV_ARTIFACT_DIR` was set the route handlers would read straight from `data-pipeline/out/`. That approach is impossible: `workerd` (the runtime miniflare runs) has a fully sandboxed filesystem. A diagnostic probe showed `fs.readdir('/')` returns only `['bundle','tmp','dev']` — no host paths exist inside the sandbox even with `nodejs_compat`. `import('node:fs/promises')` succeeds; reads fail with ENOENT for any real host path.

All `lib/r2.ts` / route-handler / wrangler.toml edits from that attempt were reverted (see `git log` for the chore-start commit).

### What this task does instead

Provide a one-shot `pnpm --filter api dev:seed-r2` script that mirrors the canonical `data-pipeline/opendc/publish.py` mapping into the local Miniflare R2 simulator using `wrangler r2 object put --local`. Same R2 keys, same binding (`ARTIFACTS`), same code path as production. No changes to runtime code — dev and prod take identical paths through `readArtifact`.

## Acceptance criteria

- [ ] `apps/api/scripts/seed-local-r2.mjs` exists and uploads every artifact in `data-pipeline/out/` to the local Miniflare R2 bucket using `wrangler r2 object put --local`. Uses the same (key → source-path) mapping as `data-pipeline/opendc/publish.py`. Skips files that don't exist on disk and prints a clear summary.
- [ ] `apps/api/package.json` exposes `dev:seed-r2` script.
- [ ] Live verify (with `wrangler dev` running from a fresh start):
  - `pnpm --filter api dev:seed-r2` exits 0 and reports N files uploaded
  - `curl -fsSI http://localhost:8787/api/v1/datacenters?bbox=-180,-85,180,85` returns 200 with `content-type: application/json`
  - `curl -fsSI http://localhost:8787/api/v1/powerplants?bbox=-180,-85,180,85` returns 200
  - `curl -fsSI http://localhost:8787/api/v1/announcements` returns 200
  - `curl -fsSI "http://localhost:8787/api/v1/og?dc=amazon-rainier-ms"` returns 200 with `content-type: image/png`
  - `curl -fsS http://localhost:8787/api/v1/manifest` (if route exists) returns the manifest JSON
- [ ] `apps/api/README.md` (or `tasks/037-...` notes) document the dev workflow: `pnpm --filter api dev` in one terminal, `pnpm --filter api dev:seed-r2` in another (after the dev server is up so the local bucket exists).
- [ ] `pnpm --filter api test` and `pnpm --filter api typecheck` still pass (no source code changes, but verify nothing was left dangling from the reverted attempt).

## Files to touch

- `apps/api/scripts/seed-local-r2.mjs` — new
- `apps/api/package.json` — add `dev:seed-r2` script
- `tasks/037-dev-fs-fallback-routes.md` — this card
- (optional) `apps/api/README.md` — dev workflow note

## Notes

- The script is intentionally JS (not TS) so it can run with bare `node` without a build step. Keep it small, no deps beyond `node:child_process` and `node:fs`.
- `wrangler r2 object put --local <bucket>/<key> --file <path>` writes to the same Miniflare-managed bucket that the dev server reads from. The `--local` flag is critical — without it the command would target real Cloudflare R2.
- The bucket name comes from `apps/api/wrangler.toml` `[[r2_buckets]] bucket_name = "gigawattapp"`. Hard-code in the script with a comment pointing back at wrangler.toml; keeping it in sync is a one-line edit if it ever changes.
- Re-running the script overwrites existing objects, so it doubles as a "refresh after re-running the pipeline" command.
- The dev server caches parsed artifacts inside the Worker isolate — restart `wrangler dev` after seeding for the first time, OR add cache-busting in 025c if dev DX matters more.
