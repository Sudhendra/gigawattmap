# 051 — Facility evidence and freshness

**Status:** in-progress
**Depends on:** 050
**Estimate:** 1 day

## Context

Dataset publication does not verify each facility's operational status or capacity. Existing snapshots lack per-facility verification dates and capacity-method metadata; the UI must make those gaps explicit.

## Acceptance criteria

- [ ] Facility cards distinguish recorded operator/status, estimated capacity and unknown values without manufacturing verification scores/dates.
- [ ] Show dataset publication time separately from facility verification (Not recorded); explain refresh versus verification, including older snapshot indication.
- [ ] Show safe source links from the recorded citation and exact OSM record ID where available; absent attribution never defaults to curated/verified.
- [ ] Existing status/capacity/source displays remain consistent with the evidence section; missing capacity is Unknown, not zero.
- [ ] Unit tests, typecheck/build, desktop/mobile browser checks and public deployment verification pass.

## Files to touch

- `apps/web/src/components/intelligence-card/`
- `apps/web/src/app/_components/map-view.tsx`

## Notes

Owner approved this next increment. Use the current published snapshot honestly; enriching per-field provenance and verification dates requires future source work. No pipeline refresh should fabricate such evidence. Comparison follows after 051/052; saved views/watchlists are deferred.
