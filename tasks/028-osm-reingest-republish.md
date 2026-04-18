# 028 — Re-ingest OSM datacenters and republish

**Status:** todo
**Depends on:** 010 (OSM ingest), 026 (PMTiles upload), 024b (publish pipeline)
**Estimate:** 1-2h (Overpass-bound)

## Context

The published `datacenters.geojson` on R2 currently contains only the 53 curated AI campuses
because the last OSM ingest 504'd. OSM contributes thousands of additional sites globally
(the long tail of colocation, enterprise IT, and small POPs) which the merge layer
deduplicates against curated entries.

Re-running `opendc ingest osm` followed by `opendc publish` will:
1. Pull fresh OSM datacenters via Overpass.
2. Re-merge curated + OSM into `datacenters-merged.geojson`.
3. Re-export `datacenters.geojson` and `datacenters.csv`.
4. Re-upload all download artifacts + refresh `manifest.json` on R2.

The PMTiles archive built in task 026 won't auto-rebuild; if the merged dataset gains a
material number of features, rebuild the datacenters tile and re-upload.

## Acceptance criteria

- [ ] `opendc ingest osm` completes without exception, writes `out/interim/osm-datacenters.geojson`
- [ ] `out/interim/datacenters-merged.geojson` feature count >100 (sanity: curated 53 + OSM)
- [ ] `opendc publish` (with R2 env loaded) uploads artifacts + manifest
- [ ] `manifest.json` on R2 reflects the new feature count for `datacenters-merged`
- [ ] Datacenters PMTiles rebuilt and re-uploaded (`opendc tiles build` + `opendc tiles upload`)
- [ ] `curl -sI https://pub-f870d3776f47481494c1c9936733d6c1.r2.dev/v1/datacenters.pmtiles`
      returns HTTP 200 (re-verifies after re-upload)

## Files to touch

None (data-only change). Task card is the only repo artifact.

## Notes

- R2 secrets: `set -a && source data-pipeline/.env.local && set +a` before `publish`/`upload`.
- Overpass occasionally 504s; `_post_overpass` already wraps in `retry_network`.
  If it still fails, retry the ingest a few times before declaring the task blocked —
  this is the public Overpass instance and load varies by hour.
- Don't commit `data-pipeline/out/` — gitignored.
- This task affects no source files; the commit is the task card + status flip.
