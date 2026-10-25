# 043 — Connect and refresh the full map dataset

**Status:** in-progress
**Depends on:** 028
**Estimate:** 1 day

## Context

MapView always loads the bundled AI-campus seed even though task 028 published
4,255 facilities. Wiring the existing full dataset is the first priority for improving coverage.

## Acceptance criteria

- [x] Production renders the published full datacenter dataset; seeds remain available for local development only.
- [x] A regression test fails on the current seed-only production selection and passes after the fix.
- [x] Facility selection, deep links, operator filters, search, and viewport counts work with non-curated facilities; missing values are shown honestly.
- [x] Fetches validate payloads, time out, and expose loading/error states instead of an unexplained empty map.
- [x] Weekly and manually triggered workflows refresh OSM, merge curated sites, rebuild required map/search artifacts, and publish a consistent release with counts and timestamps.
- [x] Failed or suspiciously incomplete refreshes retain the previous public release; tests verify the publication guard.
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

Scope confirmed by owner. Full point snapshots reuse the existing renderer; search derives from the same snapshot rather than separate PMTiles/index publication. A primary Overpass refresh on October 25 produced 5,008 facilities from 4,973 OSM records; source timestamp 2026-10-25T05:18:51Z. Mirror responses dated May/July were detected; regression tests now reject partial responses and upstream timestamps older than seven days. Hosted run 40166513014 succeeded. Deployed Pages release a469498c on October 25; public browser verified 5,008 facilities, non-curated OSM search/card, share dialog, and direct URL restoration. Mobile overflow regression reproduced at 571px on a 390px viewport and fixed; public width now 390px. No localhost API requests. Remaining: direct marker click/operator-filter checks and performance acceptance. Existing dynamically loaded map chunks alone gzip to 472,358 bytes, exceeding the 350KB total-page budget before shared application code; the Next build’s 209KB first-load figure excludes these chunks. Do not mark performance complete; a separate rendering optimization is required.

October 25 follow-up: direct canvas click selected OSM NTT node 12192863704 and opened the correct card/URL. Operator search revealed competing URL replacements; fixed by setting the operator and clearing dc atomically. Public Equinix selection/reload now preserves ?operator=equinix, and viewport counts settle correctly. Search dialog accessibility warning fixed with regression coverage. Optional cloud/cable toggles checked after performance cleanup.

Removed unused PMTiles protocol initialization and skipped construction of hidden overlays. The measured dynamic map chunks fell from 472,358 to 465,451 gzip bytes (6,907 bytes saved). This still exceeds the 350KB entire-page budget before shared application code. Full cold-4G FCP and 10k-feature frame-rate acceptance remain unverified. A larger renderer/code-loading optimization is outside this bounded release; task remains in-progress, not falsely completed.
