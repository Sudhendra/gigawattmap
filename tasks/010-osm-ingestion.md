# 010 — OSM datacenter ingestion

**Status:** done
**Depends on:** 009
**Estimate:** 4 hours

## Context

First real data. Query Overpass for every OSM feature tagged `telecom=data_center` or `building=data_center`, normalize into our schema, write GeoJSON. Eventually ~10K features globally.

## Acceptance criteria

- [x] `opendc/sources/osm.py` has `fetch(bbox: BoundingBox | None) -> Path` that runs the Overpass query from `SPEC.md §9`, streams the JSON response, caches raw result to `out/raw/osm-<ts>.json`
- [x] `opendc/sources/osm.py` has `normalize(raw_path: Path) -> Path` that maps OSM features → our `Datacenter` schema, writes `out/interim/osm-datacenters.geojson`
- [x] Handles all three OSM geometry types (node, way, relation); computes centroid for polygons
- [x] Computes `est_mw_low/mid/high` via the heuristic in `opendc/transform/estimate_mw.py` (task 010.5 folded in here) — for now: placeholder of 50 W/sqft if we have area, else `None`
- [x] Fuzzy-matches `operator=*` tag against a list of 40+ known operators (`opendc/data/operators.csv`) via `rapidfuzz`, with a configurable threshold (default 85)
- [x] `--sample` flag limits the bbox to DFW metro (~32.5,-97.3 → ~33.2,-96.3) for fast local iteration
- [x] `python -m opendc.cli ingest osm --sample` completes in <30s, outputs a valid GeoJSON with ≥5 features
- [x] Unit tests for operator fuzzy match (exact, abbreviation, misspelling)
- [x] `out/manifest.json` records: source, timestamp, feature count, Overpass URL, duration

## Files to touch

- `data-pipeline/opendc/sources/osm.py`
- `data-pipeline/opendc/data/operators.csv` (40+ rows: name, aliases, ticker?, tier)
- `data-pipeline/opendc/transform/estimate_mw.py`
- `data-pipeline/tests/test_osm_normalize.py`
- `data-pipeline/tests/test_operator_match.py`

## Notes

- Overpass is rate-limited. Use `overpass-api.de` with a `User-Agent` that identifies us and links to the repo. If you hit 429, back off per `Retry-After`.
- Some countries have poor OSM coverage (China especially). Document this in `SPEC.md` after the first full run — actual numbers will calibrate our "known gaps" messaging.
- **Cache the raw Overpass response** — it's expensive to re-fetch. Normalize runs independently of fetch.
- Live `--sample` run on DFW returned **60 features in 9.0s** (8 distinct operators matched: Google, Meta, Equinix, Digital Realty, CyrusOne, Aligned, QTS, Flexential).
- Header note: httpx rejects non-ASCII header values; `User-Agent` had to lose the em-dash. Watch for this in any future header that includes copy from docs.
