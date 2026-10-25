# 046 — Recent dataset changes

**Status:** in-progress
**Depends on:** 043
**Estimate:** 1 day

## Context

Visitors need to see what changed between successful facility snapshots. Dataset additions are discoveries in our coverage, not claims that a facility was newly built.

## Acceptance criteria

- [ ] First publication establishes a baseline without generating additions for existing facilities.
- [ ] Subsequent snapshots record additions and operator, status, and midpoint capacity changes with before/after values, detection time, and source attribution.
- [ ] History is part of the same atomic map object; rejected refreshes and failed publication cannot advance public history.
- [ ] Tests cover baseline, unchanged/reordered input, additions, null values, repeated runs, retention, invalid input, and failed publication.
- [ ] A compact accessible panel labels dataset changes, distinguishes loading/error/baseline/no-change states, and links to current facilities. History is limited to 90 days and the latest 500 events.
- [ ] Python checks, frontend tests/typecheck/build, mobile browser checks, and production verification pass.

## Files to touch

- `data-pipeline/opendc/schemas.py`
- `data-pipeline/opendc/map_changes.py`
- `data-pipeline/opendc/map_refresh.py`
- `data-pipeline/opendc/releases.py`
- `data-pipeline/tests/test_map_changes.py`
- `packages/types/src/`
- `apps/web/src/lib/live-release.ts`
- `apps/web/src/lib/map-data.ts`
- `apps/web/src/components/map/recent-changes.tsx`
- `apps/web/src/app/_components/map-view.tsx`
- `.github/workflows/refresh-map.yml`
- `docs/operations/data-refresh.md`

## Notes

Owner approved this bounded release. Keep removed facilities out of the panel so all links resolve; absence is not evidence of closure. Existing map performance investigation and interaction checks remain in task 043. No additional data sources or dependencies.
