# 026 — Build and upload PMTiles to R2

**Status:** done
**Depends on:** 013 (tile build), 024b (R2 wiring)
**Estimate:** 1h

## Context

The map page expects PMTiles archives at `${NEXT_PUBLIC_PMTILES_BASE}/<layer>.pmtiles`
(e.g. `https://pub-f870d3776f47481494c1c9936733d6c1.r2.dev/v1/datacenters.pmtiles`).
None of the five archives currently exist on R2 — only `cloud-regions.pmtiles` exists locally,
and the remote bucket has zero PMTiles files. The map therefore falls back to bundled seed
GeoJSON from `apps/web/public/seed/`.

Additionally, `opendc/tiles/build.py` reads `out/interim/osm-datacenters.geojson` for the
datacenters tile, but that file is absent (last OSM ingest 504'd). The canonical merged
file used by the rest of the pipeline is `out/interim/datacenters-merged.geojson`. Switch
the input so the curated 53 datacenters render now; OSM enrichment ships in task 028.

## Acceptance criteria

- [x] `DEFAULT_SPECS` datacenters input points at `datacenters-merged.geojson`
- [x] Unit test in `tests/test_tiles_build.py` asserts the new input path
- [x] `~/.local/bin/uv run python -m opendc.cli tiles build` produces 5 archives in `out/tiles/`
- [x] All 5 archives uploaded to R2 under `v1/` prefix via `opendc tiles upload`
- [x] `curl -sIL https://pub-f870d3776f47481494c1c9936733d6c1.r2.dev/v1/<layer>.pmtiles`
      returns HTTP 200 for: datacenters, powerplants, cables, cloud-regions, opposition
- [x] `apps/web/.env.local` `NEXT_PUBLIC_PMTILES_BASE` uncommented and set to live base
- [x] `pnpm --filter web build` clean

## Files to touch

- `data-pipeline/opendc/tiles/build.py`
- `data-pipeline/tests/test_tiles_build.py`
- `apps/web/.env.local` (gitignored)

## Notes

- R2 secrets in `data-pipeline/.env.local`. Load with `set -a && source .env.local && set +a`.
- `opendc tiles upload` uses `DEFAULT_PREFIX = "v1"`, lands at `v1/<filename>.pmtiles`.
- Cloud-regions archive uses underscore in spec name (`cloud_regions`) but file name is
  `cloud-regions.pmtiles` — confirmed in `tiles/build.py:92`.
- Landing-points is not in `BUILD_PLAN`; ships as raw GeoJSON for now (acceptable per SPEC).
- Powerplants tile build may take several minutes (29 MB input).
