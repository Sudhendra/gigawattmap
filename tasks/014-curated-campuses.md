# 014 — Expand curated AI campus dataset

**Status:** todo
**Depends on:** 010
**Estimate:** 3 hours (mostly research)

## Context

OSM gives us geometry for ~10K generic datacenters. The *story* is the ~50 biggest AI-era campuses where hand-curated data (MW, GPUs, tenants, CAPEX, PPA counterparties) is the product. These override OSM values at merge time.

## Acceptance criteria

- [ ] `data-pipeline/opendc/data/ai-campuses.csv` has ≥50 rows, each with: `id, name, operator, tenant, status, lat, lon, country, region, est_mw_low, est_mw_mid, est_mw_high, gpus, capex_usd_b, announced_date, rfs_date, ppa_counterparty, source_url, notes`
- [ ] `data-pipeline/opendc/data/operators.csv` has ≥30 rows covering every operator mentioned in ai-campuses.csv
- [ ] `opendc/sources/curated.py` reads both CSVs, validates with pydantic, writes `out/interim/curated-ai-campuses.geojson`
- [ ] `opendc/transform/merge.py` joins curated + OSM: for each curated point, find OSM features within 500m via rtree; if match, merge properties (curated wins on MW/tenant/etc, OSM keeps geometry); tag merged feature `confidence: "verified"` vs OSM-only `"osm_only"`
- [ ] Unit tests: a curated point near an OSM polygon produces one merged feature with curated operator and OSM geometry
- [ ] A curated point with no nearby OSM feature produces a standalone `verified` point in the output

## Files to touch

- `data-pipeline/opendc/data/ai-campuses.csv`
- `data-pipeline/opendc/data/operators.csv`
- `data-pipeline/opendc/sources/curated.py`
- `data-pipeline/opendc/transform/merge.py`
- `data-pipeline/tests/test_merge.py`

## Notes

- Seed the CSV from the 20 rows in task 005, expand by researching: Meta's announced campuses (Hyperion, Prometheus, Rosemount, Richland Parish), Microsoft's (Mt Pleasant, Mt Shadow, San Antonio), Google's (Council Bluffs, Dalles, Loudoun, Lenoir), Amazon's (Rainier, N. Virginia cluster), Oracle's regions, xAI Colossus 1/2, Stargate announced sites, CoreWeave's Plano + others, Nebius Vineland, Crusoe Abilene, and the Talen–AWS Susquehanna nuclear deal.
- Document every `source_url` — this CSV is the audit trail.
- When MW is announced ("1.2 GW"), use the announced number for all three of `est_mw_low/mid/high`; when only a size range is public, use the heuristic from task 010.
