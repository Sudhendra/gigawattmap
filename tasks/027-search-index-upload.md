# 027 — Upload search-index.json to R2

**Status:** done
**Depends on:** 020 (Cmd+K palette), 024b (R2 wiring)
**Estimate:** 20m

## Context

The Cmd+K command palette reads from `NEXT_PUBLIC_SEARCH_INDEX_URL` and falls back to the
bundled `apps/web/public/seed/search-index.json`. The R2-hosted copy doesn't exist yet
(404 at `https://pub-f870d3776f47481494c1c9936733d6c1.r2.dev/v1/search-index.json`),
so production users get the stale seed file.

`opendc data upload --artifact <path>` already supports uploading any JSON artifact at
`v1/<filename>`. Use it directly — no new code required, just a fresh build + upload +
env wiring.

## Acceptance criteria

- [x] `~/.local/bin/uv run python -m opendc.cli data build-index` regenerates the index
- [x] Upload via `opendc data upload --artifact out/interim/search-index.json`
- [x] `curl -sI https://pub-f870d3776f47481494c1c9936733d6c1.r2.dev/v1/search-index.json`
      returns HTTP 200
- [x] `apps/web/.env.local` `NEXT_PUBLIC_SEARCH_INDEX_URL` set to live URL
- [x] `pnpm --filter web build` clean

## Files to touch

- `apps/web/.env.local` (gitignored)

## Notes

- R2 secrets in `data-pipeline/.env.local`. Load with `set -a && source .env.local && set +a`.
- `data upload` uses `content_type="application/json"` and lands at `v1/<filename>`.
- No code change needed; if a future task wants a dedicated `search upload` subcommand for
  discoverability, add it then — YAGNI for now.
