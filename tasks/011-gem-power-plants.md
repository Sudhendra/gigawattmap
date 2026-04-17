# 011 — Global Energy Monitor power plants ingestion

**Status:** done
**Depends on:** 009
**Estimate:** 3 hours

## Context

Pull Global Energy Monitor's Global Integrated Power Tracker. Filter to ≥50MW, normalize fuel types, output clean GeoJSON.

## Acceptance criteria

- [x] `opendc/sources/gem.py` fetches the latest GIPT CSV/Excel from GEM's public URL (document the exact URL in the module docstring — check `globalenergymonitor.org/projects/global-integrated-power-tracker/`)
- [x] Caches raw to `out/raw/gem-<ts>.{csv,xlsx}`
- [x] `normalize()` maps GEM rows → our `PowerPlant` schema: `id`, `name`, `fuel_type` (normalized to our enum), `capacity_mw`, `geometry` (Point from lat/lon), `operator`, `commissioning_year`, `source="gem"`
- [x] Fuel-type normalization table covers at least: `coal`, `gas` (includes `natural gas`, `cogen`), `nuclear`, `solar` (includes `PV`, `CSP`), `wind` (onshore/offshore), `hydro` (includes `pumped storage`), `storage` (battery), `other` (biomass, geothermal, oil)
- [x] Filters to `capacity_mw >= 50`
- [x] Writes `out/interim/powerplants.geojson`
- [x] Output validated against pydantic `PowerPlant` — any row that fails is logged with the specific field error and skipped (doesn't crash the whole run)
- [x] Fixture file `tests/fixtures/gem-sample.csv` with 10 hand-crafted rows covering each fuel type; unit tests cover normalization

## Files to touch

- `data-pipeline/opendc/sources/gem.py`
- `data-pipeline/opendc/transform/normalize_fuel.py`
- `data-pipeline/tests/fixtures/gem-sample.csv`
- `data-pipeline/tests/test_gem_normalize.py`

## Notes

- GEM's licensing is CC BY 4.0 — we must attribute in `/about` and in layer tooltips.
- If GEM's direct download requires registration, use the Python `gem-download` community tool or Wayback machine fallback; document the chosen path.
- **Known data quality issues** (from prior experience): some GEM rows have lat/lon swapped, some have coordinates at (0,0) for unknown sites — drop these with a warning.
- **Chosen path:** GEM's landing page returns 403 to automated fetches (registration-gated download). `fetch()` resolves a snapshot via `GEM_GIPT_PATH` env var → `out/raw/gem-latest.xlsx` → `out/raw/gem-latest.csv`, copies it under a timestamped name, and raises `DataSourceError` with instructions if none is present. Keeps us out of TOS trouble while making CI deterministic.
- 18-row fixture covers every fuel rule plus the 3 bad-data cases (out-of-range coords, (0,0) sentinel, year-range string). 15 features survive normalization (the 3 bad rows + a 5 MW solar plant below threshold are dropped).
