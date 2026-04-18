# 017 — Substation proximity enrichment

**Status:** done
**Depends on:** 013
**Estimate:** 3 hours

## Context

The "magic" join that competitors don't do. For every datacenter in our dataset, find the nearest high-voltage substation (from OSM `power=substation`) within 10km, including voltage class. This powers the Intelligence Card's Power section.

## Acceptance criteria

- [ ] `opendc/sources/osm_power.py` fetches OSM features tagged `power=substation` OR `power=plant` OR `power=line` (for context) globally; caches raw
- [ ] `opendc/transform/enrich_substations.py`:
  - Loads merged datacenters GeoJSON
  - Loads substations GeoJSON
  - Builds an rtree spatial index on substations
  - For each datacenter, finds substations within 10km; picks the best one by: highest voltage first, then closest distance
  - Writes output as `datacenters-enriched.geojson` with added properties: `nearest_substation_id`, `nearest_substation_distance_km` (rounded to 0.1), `nearest_substation_voltage_kv`
- [ ] Unit tests: mocked rtree with 3 substations at known distances, verify correct selection
- [ ] Intelligence Card's "POWER" section now shows real substation data when available: `Nearest substation: 3.2 km, 345 kV`
- [ ] When no substation found within 10km, shows "No substation data within 10km" (common for non-US/EU regions)

## Files to touch

- `data-pipeline/opendc/sources/osm_power.py`
- `data-pipeline/opendc/transform/enrich_substations.py`
- `data-pipeline/tests/test_enrich_substations.py`
- `apps/web/src/components/intelligence-card/sections/power-section.tsx`

## Notes

- OSM's `power=substation` has a `voltage=*` tag, sometimes with multiple semicolon-separated values (`115000;230000`). Parse the max.
- This enrichment is *substantial* computational work at scale — for v1, run it in the pipeline (not at request time) and bake the joined result into the PMTiles. Runtime queries come in v2.
- Voltage ≥100kV is "high voltage" — worth highlighting. Below that, label but don't emphasize.
