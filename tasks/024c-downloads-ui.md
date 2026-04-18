# 024c — Downloads page + API docs page

**Status:** in-progress
**Depends on:** 024a, 024b
**Estimate:** 1.5 hours

## Context

Sub-card of 024. The user-facing surface for the public dataset and API. Reads the manifest produced by 024a; documents the endpoints shipped in 024b. After this card, the parent 024 can be marked done.

## Acceptance criteria

**Downloads page (`/data`):**

- [ ] Shows a table of downloadable artifacts grouped by source, sourced from R2 manifest at build time:
  - Full merged GeoJSON (`datacenters.geojson`)
  - Full merged CSV (`datacenters.csv`) — flat subset of fields
  - Per-source raw: `osm.geojson`, `gem-powerplants.geojson`, `telegeography-cables.geojson` (flagged non-commercial), `curated-ai-campuses.csv`, `opposition.geojson`, `cloud-regions.geojson`
  - PMTiles for each layer
- [ ] Each row shows: filename, size, feature count, last updated, license badge, copy-curl button, download link
- [ ] All download links resolve to R2 `v1/downloads/<filename>` and serve with `Content-Disposition: attachment` (configured in R2 metadata at upload time, 024a)
- [ ] License warnings are loud: cables row shows a non-commercial warning in bold; ODbL rows show share-alike notice
- [ ] Example `curl` command shown per artifact
- [ ] Link to the GitHub repo

**API docs (`/data/api`):**

- [ ] Documents every endpoint shipped in 024b with request/response examples
- [ ] States the rate limit prominently (60 req/min/IP)
- [ ] Links to `/api/v1/openapi.json`
- [ ] Renders an example response for each endpoint as a syntax-highlighted JSON block

## Files to touch

- `apps/web/src/app/data/page.tsx`
- `apps/web/src/app/data/_components/artifact-row.tsx`
- `apps/web/src/app/data/api/page.tsx`
- `apps/web/src/app/data/api/_components/endpoint-doc.tsx`
- `apps/web/src/lib/manifest.ts` (fetch + type the manifest at build time)

## Notes

- Pages are server-rendered; manifest is fetched at build time so the page is static.
- Header nav already links `/data` (currently 404). Keep that link working.
- Once 024c ships, mark parent `024-downloads-api.md` Status: done with a note pointing at 024a/b/c.
