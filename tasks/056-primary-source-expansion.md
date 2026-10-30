# 056 — Expand primary-source evidence

**Status:** in-progress
**Depends on:** 052
**Estimate:** 1 day

## Context

Begin the data-first expansion with primary disclosures and conservative company/facility associations. This first batch adds five dated records across the US, India, Japan and Spain; it is not a claim of complete global coverage.

## Acceptance criteria

- [ ] Five original factual summaries validate against the announcement schema and canonical IDs.
- [ ] Fairwater report links to the recorded facility; regional commitments have no invented facility links, locations or capacity.
- [ ] Publishers attributed in About and individual records; automated RSS distinguished from manual editorial sources.
- [ ] Daily news pipeline publishes records and live endpoint contains them.

## Files to touch

- `data-pipeline/opendc/data/announcements/2026-*.yaml`
- `apps/web/src/app/about/_components/sources-table.tsx`

## Notes

Reviewed primary company pages on 2026-10-30. Store factual summaries and links, not article copies. Investment totals may span multiple programs and are not site capex. Next data tranche should model relationship roles, evidence dates, source coverage and review queues before automated facility mutation. Gigawatt Map MCP remains planned; Robinhood/crypto and saved views/watchlists deferred.
