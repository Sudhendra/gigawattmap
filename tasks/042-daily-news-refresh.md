# 042 — Daily news refresh

**Status:** in-progress
**Depends on:** 021
**Estimate:** 1 day

## Context

The feed currently reads hand-curated announcements and has no scheduled ingestion.
Visitors need current, attributed news without daily manual maintenance.

## Acceptance criteria

- [ ] A CLI command ingests permitted publisher RSS/Atom feeds, validates dates and URLs, deduplicates entries, and preserves curated announcements.
- [ ] Automated entries have source attribution and are distinguishable from curated announcements; no inferred amounts, facility links, or generated factual claims are presented as verified.
- [ ] Tests cover duplicate entries, malformed responses, timeouts, partial source failures, and retaining the last good feed when all sources fail.
- [ ] A daily GitHub Actions schedule and manual trigger publish the validated feed to the URL consumed by production; required secrets and recovery steps are documented.
- [ ] News UI displays refresh status and a stale/error state; failed refreshes do not erase existing news.
- [ ] A manual workflow run succeeds and the public feed contains current source entries; frontend typecheck and relevant tests pass.

## Files to touch

- `data-pipeline/opendc/sources/news.py` (new)
- `data-pipeline/opendc/sources/announcements.py`
- `data-pipeline/opendc/cli.py`
- `data-pipeline/opendc/schemas.py`
- `data-pipeline/tests/test_news.py` (new)
- `.github/workflows/refresh-news.yml` (new)
- `apps/web/src/components/announcements-feed/`
- `packages/types/src/`
- `apps/web/src/app/about/_components/sources-table.tsx`
- `data-pipeline/.env.example`
- `docs/operations/data-refresh.md` (new)

## Notes

Scope proposed for confirmation per AGENTS.md. Check publisher feed permissions before selecting sources. Daily means checking every day; do not invent entries when publishers have no new relevant news. Use existing R2 hosting and no paid services.

Scope confirmed by owner. Initial deployment enables Converge Digest only; partial-source behavior applies when additional permitted feeds are enabled in the subsequent coverage stage. Core tests cover malformed feeds, deduplication, timeouts, empty releases, and failures before live publication. R2 credentials are configured as encrypted GitHub secrets. Pending: hosted workflow execution and public UI verification.
