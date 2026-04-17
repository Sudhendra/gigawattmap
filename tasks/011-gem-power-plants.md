# 011 — Global Energy Monitor power plants ingestion

**Status:** in-progress
**Depends on:** 009
**Estimate:** 3 hours

## Context

Pull Global Energy Monitor's Global Integrated Power Tracker. Filter to ≥50MW, normalize fuel types, output clean GeoJSON.

## Acceptance criteria

- [ ] `opendc/sources/gem.py` fetches the latest GIPT CSV/Excel from GEM's public URL (document the exact URL in the module docstring — check `globalenergymonitor.org/projects/global-integrated-power-tracker/`)
- [ ] Caches raw to `out/raw/gem-<ts>.{csv,xlsx}`
- [ ] `normalize()` maps GEM rows → our `PowerPlant` schema: `id`, `name`, `fuel_type` (normalized to our enum), `capacity_mw`, `geometry` (Point from lat/lon), `operator`, `commissioning_year`, `source="gem"`
- [ ] Fuel-type normalization table covers at least: `coal`, `gas` (includes `natural gas`, `cogen`), `nuclear`, `solar` (includes `PV`, `CSP`), `wind` (onshore/offshore), `hydro` (includes `pumped storage`), `storage` (battery), `other` (biomass, geothermal, oil)
- [ ] Filters to `capacity_mw >= 50`
- [ ] Writes `out/interim/powerplants.geojson`
- [ ] Output validated against pydantic `PowerPlant` — any row that fails is logged with the specific field error and skipped (doesn't crash the whole run)
- [ ] Fixture file `tests/fixtures/gem-sample.csv` with 10 hand-crafted rows covering each fuel type; unit tests cover normalization

## Files to touch

- `data-pipeline/opendc/sources/gem.py`
- `data-pipeline/opendc/transform/normalize_fuel.py`
- `data-pipeline/tests/fixtures/gem-sample.csv`
- `data-pipeline/tests/test_gem_normalize.py`

## Notes

- GEM's licensing is CC BY 4.0 — we must attribute in `/about` and in layer tooltips.
- If GEM's direct download requires registration, use the Python `gem-download` community tool or Wayback machine fallback; document the chosen path.
- **Known data quality issues** (from prior experience): some GEM rows have lat/lon swapped, some have coordinates at (0,0) for unknown sites — drop these with a warning.
