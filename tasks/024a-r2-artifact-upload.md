# 024a — R2 artifact upload pipeline

**Status:** done
**Depends on:** 002, 023
**Estimate:** 2 hours

## Context

Task 024 (downloads + public API) assumes pre-built artifacts live in R2. Today the pipeline writes to `data-pipeline/out/` (gitignored) with no upload step, so the API has nothing to read and the downloads page has nothing to link to. This card adds the upload + manifest layer that 024b (API) and 024c (downloads UI) both depend on.

This is infrastructure plumbing only — no user-visible feature ships from this card alone. The acceptance criteria are: a CLI command uploads, a manifest is correct, the API can read it back.

## Acceptance criteria

- [ ] `data-pipeline/opendc/cli.py` gains a `publish` subcommand that uploads every artifact in `out/` to R2 under `v1/downloads/<filename>`
- [ ] Uses `boto3` against the R2 S3-compatible endpoint; credentials from env (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`)
- [ ] `.env.example` documents the four required vars (no real values)
- [ ] `out/manifest.json` (already produced by the pipeline) is augmented with per-artifact `size_bytes`, `sha256`, `r2_url`, `license`, `attribution`, and `feature_count` — schema lives in `opendc/schemas.py` as `ArtifactManifest`
- [ ] Per-source ODbL artifacts (OSM-derived) listed separately in the manifest with `requires_attribution: true` and `share_alike: true` flags so the downloads UI can render the correct warning
- [ ] TeleGeography cables artifact carries `commercial_use: false` flag
- [ ] `apps/api/src/lib/r2.ts` — small typed helper to fetch an artifact or the manifest by key from the R2 binding; returns `null` on 404, throws on other errors
- [ ] `apps/api/wrangler.toml` declares the R2 bucket binding as `ARTIFACTS`
- [ ] In dev, `r2.ts` falls back to reading from `data-pipeline/out/` on disk so local API work doesn't need real R2 credentials
- [ ] Pipeline pytest covers: manifest schema, sha256 stability, license-flag propagation
- [ ] API vitest covers: `r2.ts` dev-mode fallback returns the right bytes

## Files to touch

- `data-pipeline/opendc/cli.py` (add `publish` command)
- `data-pipeline/opendc/publish.py` (new — boto3 upload + manifest enrichment)
- `data-pipeline/opendc/schemas.py` (add `ArtifactManifest`)
- `data-pipeline/tests/test_publish.py`
- `apps/api/src/lib/r2.ts`
- `apps/api/src/lib/r2.test.ts`
- `apps/api/wrangler.toml`
- `.env.example`

## Notes

- R2 is S3-compatible: endpoint is `https://<account_id>.r2.cloudflarestorage.com`, region `auto`. We do not depend on Cloudflare-specific SDK features so the upload script stays portable.
- Manifest is the contract between pipeline and API. Once published, an artifact's row in the manifest is the source of truth for everything the downloads UI shows.
- Do not commit any artifact ≥10 MB (per AGENTS.md). The pipeline `out/` directory is and stays gitignored.
- 024b and 024c block on this card. Once shipped, they can proceed in parallel against the same manifest.
