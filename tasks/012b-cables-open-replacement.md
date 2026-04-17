# 012b — Submarine cables: open-source replacement for TeleGeography

**Status:** todo
**Depends on:** 012
**Estimate:** 6 hours

## Context

Task 012 ingests submarine cable data from TeleGeography under CC BY-NC-SA 3.0. That license is **non-commercial only**: the moment Gigawatt Map adds ads, paid tiers, enterprise licensing, or any commercial product layer, the TeleGeography layer must be removed or replaced.

This task tracks the replacement so monetization isn't blocked on a research scramble.

## Acceptance criteria

- [ ] `opendc/sources/cables_open.py` builds the same `Cable` schema from a
      blend of these public-domain / permissive sources:
  - ITU's International Telecommunication Regulations submarine cable
    registry (where redistributable).
  - Wikipedia's "List of international submarine communications cables" and
    per-cable infobox fields (CC BY-SA — share-alike, but compatible with
    free/commercial use as long as we attribute and license-mark).
  - Cable consortium press releases for RFS year, owners, capacity.
  - OpenStreetMap `submarine_cable=*` lines for geometry where present.
- [ ] Crowd-sourced data quality is documented: each cable's `confidence`
      (high/medium/low) recorded in `properties.confidence`.
- [ ] Switch in `manifest.json` so a future build can pick the open source
      vs the TG one via env var (`CABLES_SOURCE=open|telegeography`).
- [ ] All tests in `test_cables_open.py` pass on a 2-cable fixture.
- [ ] `/about` page updated to attribute the new sources, with the old TG
      block removed.

## Files to touch

- `data-pipeline/opendc/sources/cables_open.py`
- `data-pipeline/tests/fixtures/cables-open-sample.json`
- `data-pipeline/tests/test_cables_open.py`
- `apps/web/src/app/about/page.tsx`
- `data-pipeline/opendc/cli.py` (env var switch)

## Notes

- This task is **only blocking** when the project is preparing to monetize. Until then it stays in `todo`.
- Wikipedia data needs scraping under a respectful rate limit; check robots.txt and prefer the API.
- Geometry quality from OSM is uneven — many cables are stubs or unmapped. Plan to fall back to a great-circle arc between landing points when no geometry is available, with `confidence=low`.
- The license note in `manifest.json` for the open source set should read `license=mixed (CC BY-SA 4.0, CC0); commercial-OK with attribution`.
