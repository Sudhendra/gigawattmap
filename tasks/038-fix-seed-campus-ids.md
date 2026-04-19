# 038 — Fix seed campus ids to match canonical artifact

**Status:** in-progress
**Depends on:** 025a (OG endpoint requires canonical ids)
**Estimate:** 30m

## Context

`apps/web/public/seed/ai-campuses.geojson` is a hand-curated overlay of 20
high-profile AI campuses loaded by `apps/web/src/app/_components/map-view.tsx`.
10 of its 20 ids drift from the canonical
`data-pipeline/out/datacenters.geojson` artifact (the source of truth per
AGENTS.md). When users click a drifted dot and use the share modal, the OG
endpoint (`apps/api/src/routes/og.ts`) returns 404 because the id doesn't
exist in the artifact it queries.

Discovered during 025b live smoke (Meta Richland Parish, xAI Colossus 2).

## Acceptance criteria

- [ ] Every `properties.id` in `apps/web/public/seed/ai-campuses.geojson`
      exists in `data-pipeline/out/datacenters.geojson`.
- [ ] A test in `apps/web/` proves the above (loads both files, asserts
      every seed id resolves).
- [ ] `pnpm --filter web test` passes.
- [ ] Hitting `/api/v1/og?dc=<id>` for each of the 20 seed ids in dev
      returns 200.

## Files to touch

- `apps/web/public/seed/ai-campuses.geojson` — rewrite 10 ids
- `apps/web/src/app/_components/seed-ids.test.ts` — new test

## Notes

Audit (every drift has unambiguous 0.0km + identical-name match in artifact):

| seed id (broken) | canonical id |
|---|---|
| amazon-project-rainier | amazon-rainier-ms |
| talen-susquehanna-aws | talen-susquehanna-pa |
| homer-city-redev | homer-city-pa |
| xai-colossus-memphis | xai-colossus-1-tn |
| xai-colossus-2 | xai-colossus-2-tn |
| microsoft-mount-pleasant-wi | microsoft-mt-pleasant-wi |
| oracle-cloud-az | oracle-cloud-arizona |
| digital-realty-ord11-elk-grove | digitalrealty-ord11-elk-grove |
| aws-us-east-1-va | amazon-us-east-1-va |
| meta-richland-parish-la | meta-richland-parish |
