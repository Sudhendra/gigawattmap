# 021b — Announcements editorial backfill

**Status:** done
**Depends on:** 021
**Estimate:** 4 hours (across multiple sessions)

## Context

Task 021 ships the engineering plus a 10-entry seed proving the full
pipeline (YAML → loader → R2 → web feed) works end-to-end. This card is
the pure editorial work of growing the seed from 10 to ≥50 entries to
hit the bar set by `SPEC.md §1` (the investor / news persona needs a
non-trivial corpus to feel useful on day one).

Splitting from 021 keeps each card to "at most one day of work" per
`AGENTS.md`, makes commits reviewable, and isolates curation risk
(fabricated dates / hallucinated source URLs) from engineering risk.

## Acceptance criteria

- [x] At least **40 additional** entries land in `data-pipeline/opendc/data/announcements/` (cumulative ≥50 with 021's seed)
- [x] Coverage spans the full 12-month window ending at the commit date — no clustering in a single month
- [x] Distribution across the 5 categories is roughly: ≥15 `deal`, ≥10 `launch`, ≥5 `milestone`, ≥5 `opposition`, ≥5 `policy`
- [x] Every entry's `source_url` resolves to a primary or first-tier secondary source: SEC filing, company press release, Data Center Dynamics, Data Center Frontier, Reuters, Bloomberg, FT, WSJ, or the issuing regulator. **No blogs, no Wikipedia, no aggregators that don't credit a primary source.**
- [x] `opendc ingest announcements` validates all entries cleanly
- [x] No entry duplicates a 021 seed entry's `id`

## Files to touch

- `data-pipeline/opendc/data/announcements/*.yaml` (≥40 new files)

## Notes

- Commit in batches of ~10 entries: `feat(021b): announcements batch N (categories...)`. Ten entries is small enough to review without scrolling for an hour.
- Verification rule: before committing any batch, confirm each `source_url` returns a 2xx and the page actually corroborates the entry's date / amount / parties. If a URL has rotted, find a replacement or drop the entry.
- If a category target is hard to hit honestly (e.g. <5 verifiable opposition fights in the window), document it in the final commit body rather than padding with weak entries. Editorial honesty > hitting an arbitrary distribution.
- This card never blocks a launch — the feed renders fine with 10 entries. It's a continuous content effort.
- Completed on 2026-04-18: cumulative corpus expanded to 50 entries, `opendc ingest announcements` passes, and the refreshed `announcements.json` was uploaded to `r2://gigawattapp/v1/announcements.json`.
