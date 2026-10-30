# 055 — Recover map refresh and explain activity

**Status:** done
**Depends on:** none
**Estimate:** 1 day

## Context

The October 26 scheduled map refresh exhausted retries on Overpass HTTP 504. Production remains at the initial baseline while news updates independently.

## Acceptance criteria

- [x] Failing test proves failover to an alternate Overpass endpoint after transient primary exhaustion; permanent errors do not fail over.
- [x] UI explains baseline, separate news and last comparison timestamp.
- [x] Successful full refresh publishes a validated snapshot; existing completeness gates preserved.

## Files to touch

- `data-pipeline/opendc/sources/osm.py`
- `data-pipeline/tests/test_osm_failover.py`
- `apps/web/src/components/map/recent-changes.tsx`

## Notes

No new provider license: alternate endpoint serves the same ODbL OSM data. No fabricated changes from headlines.

## Verification — 2026-10-30

29 targeted pipeline tests passed, including failover and atomic publication safeguards; ruff passes. GitHub run 41136479483 succeeded. Live snapshot 2026-10-30T22:14:06.500804+00:00 contains 5,043 facilities and 45 changes. October 26 failure was upstream HTTP 504. UI distinguishes headlines from record edits and accurately labels the prior snapshot date. Live browser verified.
