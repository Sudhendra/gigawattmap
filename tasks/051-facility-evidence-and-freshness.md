# 051 — Facility evidence and freshness

**Status:** done
**Depends on:** 050
**Estimate:** 1 day

## Context

Dataset publication does not verify each facility's operational status or capacity. Existing snapshots lack per-facility verification dates and capacity-method metadata; the UI must make those gaps explicit.

## Acceptance criteria

- [x] Facility cards distinguish recorded operator/status, estimated capacity and unknown values without manufacturing verification scores/dates.
- [x] Show dataset publication time separately from facility verification (Not recorded); explain refresh versus verification, including older snapshot indication.
- [x] Show safe source links from the recorded citation and exact OSM record ID where available; absent attribution never defaults to curated/verified.
- [x] Existing status/capacity/source displays remain consistent with the evidence section; missing capacity is Unknown, not zero.
- [x] Unit tests, typecheck/build, desktop/mobile browser checks and public deployment verification pass.

## Files to touch

- `apps/web/src/components/intelligence-card/`
- `apps/web/src/app/_components/map-view.tsx`

## Notes

Owner approved this next increment. Use the current published snapshot honestly; enriching per-field provenance and verification dates requires future source work. No pipeline refresh should fabricate such evidence. Comparison follows after 051/052; saved views/watchlists are deferred.


## Verification — 2026-10-25

- Web unit suite: 148 tests passed; typecheck and production static build passed. Map initial JS: 140 kB. Existing complete-map bundle budget work remains tracked separately in task 048.
- Cloudflare Pages deployment `ba480fbe` (application commit `df81c81`) verified on https://gigawattmap.com.
- Desktop/mobile evidence checks: explicit unknown values, facility verification Not recorded, separate UTC publication timestamp, exact OSM citation. Live Equinix Ashburn DC18 verified; no per-facility verification date is invented.
