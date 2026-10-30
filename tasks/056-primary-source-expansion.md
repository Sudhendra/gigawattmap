# 056 — Expand primary-source evidence

**Status:** done
**Depends on:** 052
**Estimate:** 1 day

## Context

Begin the data-first expansion with primary disclosures and conservative company/facility associations. This first batch adds five dated records across the US, India, Japan and Spain; it is not a claim of complete global coverage.

## Acceptance criteria

- [x] Five original factual summaries validate against the announcement schema and canonical IDs.
- [x] Fairwater report links to the recorded facility; regional commitments have no invented facility links, locations or capacity.
- [x] Publishers attributed in About and individual records; automated RSS distinguished from manual editorial sources.
- [x] Daily news pipeline publishes records and live endpoint contains them.

## Files to touch

- `data-pipeline/opendc/data/announcements/2026-*.yaml`
- `apps/web/src/app/about/_components/sources-table.tsx`

## Notes

Reviewed primary company pages on 2026-10-30. Store factual summaries and links, not article copies. Investment totals may span multiple programs and are not site capex. Next data tranche should model relationship roles, evidence dates, source coverage and review queues before automated facility mutation. Gigawatt Map MCP remains planned; Robinhood/crypto and saved views/watchlists deferred.

## Verification — 2026-10-30

55 curated announcements validate; 15 announcement/news tests pass. GitHub run 41137338902 published all five additions, confirmed via live news endpoint. Publisher attribution deployed in fa0c11a5. This is a first curated batch, not automated global source coverage.
