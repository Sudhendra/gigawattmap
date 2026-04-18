# 028 — Re-ingest OSM datacenters and republish

**Status:** done
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

- [x] `opendc ingest osm` completes without exception, writes `out/interim/osm-datacenters.geojson` (4,220 features)
- [x] `out/interim/datacenters-merged.geojson` feature count >100 (actual: 4,255)
- [x] `opendc publish` (with R2 env loaded) uploads artifacts + manifest
- [x] `manifest.json` on R2 reflects the new feature count for `datacenters.geojson` (4,255)
- [x] Datacenters PMTiles rebuilt and re-uploaded (`opendc tiles build` + `opendc tiles upload`)
- [x] `curl -sI https://pub-f870d3776f47481494c1c9936733d6c1.r2.dev/v1/datacenters.pmtiles`
      returns HTTP 200 (re-verifies after re-upload, now 6.2 MB vs 207 KB)

## Files to touch

- `data-pipeline/opendc/sources/osm.py` — add `OPENDC_OVERPASS_URL` env override
  (the canonical public Overpass instance returned 504; switched to
  `https://overpass.kumi.systems/api/interpreter` mirror via env var to unblock).
  Originally scoped as data-only, but the public instance was unhealthy and the
  hard-coded URL had no escape hatch; documented the override in the constant's
  docstring so future operators see the option.

## Notes

- R2 secrets: `set -a && source data-pipeline/.env.local && set +a` before `publish`/`upload`.
- Overpass occasionally 504s; `_post_overpass` already wraps in `retry_network`.
  If it still fails, retry the ingest a few times before declaring the task blocked —
  this is the public Overpass instance and load varies by hour.
- Don't commit `data-pipeline/out/` — gitignored.
- This task affects no source files; the commit is the task card + status flip.
