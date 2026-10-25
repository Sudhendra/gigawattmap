# 043 — Connect and refresh the full map dataset

**Status:** in-progress
**Depends on:** 028
**Estimate:** 1 day

## Context

MapView always loads the bundled AI-campus seed even though task 028 published
4,255 facilities. Wiring the existing full dataset is the first priority for improving coverage.

## Acceptance criteria

- [ ] Production renders the published full datacenter dataset; seeds remain available for local development only.
- [ ] A regression test fails on the current seed-only production selection and passes after the fix.
- [ ] Facility selection, deep links, operator filters, search, and viewport counts work with non-curated facilities; missing values are shown honestly.
- [ ] Fetches validate payloads, time out, and expose loading/error states instead of an unexplained empty map.
- [ ] Weekly and manually triggered workflows refresh OSM, merge curated sites, rebuild required map/search artifacts, and publish a consistent release with counts and timestamps.
- [ ] Failed or suspiciously incomplete refreshes retain the previous public release; tests verify the publication guard.
- [ ] One live refresh succeeds and the browser loads the full published count; map click/share E2E, relevant unit tests, typecheck, and documented performance checks pass against repository budgets.

## Files to touch

- `apps/web/src/app/_components/map-view.tsx`
- `apps/web/src/components/map/`
- `apps/web/src/lib/env.ts`
- `apps/web/src/lib/hooks/use-search-index.ts`
- `data-pipeline/opendc/publish.py`
- `data-pipeline/opendc/cli.py`
- `data-pipeline/tests/test_publish.py`
- `.github/workflows/refresh-map.yml` (new)
- `tests/e2e/`
- `docs/operations/data-refresh.md` (new/shared)

## Notes

Scope proposed for confirmation per AGENTS.md. Start with existing sources and full facility coverage, without inventing pins or adding unrelated layers. Preserve per-source licensing and downloads. Choose the rendering approach after measuring the published data and current renderer.

Scope confirmed by owner. Full point snapshots reuse the existing renderer; search derives from the same snapshot rather than separate PMTiles/index publication. A primary Overpass refresh on October 25 produced 5,008 facilities from 4,973 OSM records; source timestamp 2026-10-25T05:18:51Z. Mirror responses dated May/July were detected; regression tests now reject partial responses and upstream timestamps older than seven days. Pending: hosted workflow, browser flow/performance checks, and deployment.
