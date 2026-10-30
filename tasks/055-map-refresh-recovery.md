# 055 — Recover map refresh and explain activity

**Status:** in-progress
**Depends on:** none
**Estimate:** 1 day

## Context

The October 26 scheduled map refresh exhausted retries on Overpass HTTP 504. Production remains at the initial baseline while news updates independently.

## Acceptance criteria

- [ ] Failing test proves failover to an alternate Overpass endpoint after transient primary exhaustion; permanent errors do not fail over.
- [ ] UI explains baseline, separate news and last comparison timestamp.
- [ ] Successful full refresh publishes a validated snapshot; existing completeness gates preserved.

## Files to touch

- `data-pipeline/opendc/sources/osm.py`
- `data-pipeline/tests/test_osm_failover.py`
- `apps/web/src/components/map/recent-changes.tsx`

## Notes

No new provider license: alternate endpoint serves the same ODbL OSM data. No fabricated changes from headlines.
