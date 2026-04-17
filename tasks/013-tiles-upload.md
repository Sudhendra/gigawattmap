# 013 — PMTiles build + R2 upload

**Status:** todo
**Depends on:** 010, 011, 012
**Estimate:** 3 hours

## Context

Turn the interim GeoJSONs into PMTiles via `tippecanoe`, upload to Cloudflare R2, switch the web app from seed data to the live PMTiles URL.

## Acceptance criteria

- [ ] `tippecanoe` available in the build environment (documented in `docs/dev-setup.md`: macOS `brew install tippecanoe`, Linux build-from-source)
- [ ] `data-pipeline/opendc/tiles/build.py` (callable as `python -m opendc.cli tiles build`):
  - Reads `out/interim/datacenters.geojson` → `out/tiles/datacenters.pmtiles` with the tippecanoe command from `SPEC.md §4.2`
  - Reads `out/interim/powerplants.geojson` → `out/tiles/powerplants.pmtiles` (min zoom 3, max 12)
  - Reads `out/interim/cables.geojson` → `out/tiles/cables.pmtiles` (min zoom 1, max 8)
- [ ] `data-pipeline/opendc/tiles/upload.py` (callable as `python -m opendc.cli tiles upload`):
  - Uploads every `out/tiles/*.pmtiles` to `r2://gigawattmap/v1/` via boto3 (R2 S3-compat)
  - Sets `Cache-Control: public, max-age=300, stale-while-revalidate=3600`
  - Emits a public URL list to stdout
- [ ] `--dry-run` flag prints what would be uploaded without doing it
- [ ] Web app reads `NEXT_PUBLIC_PMTILES_BASE` from env; falls back to seed GeoJSON if unset (dev mode)
- [ ] Full pipeline `ingest osm → transform → tiles build → tiles upload` works end-to-end with a smoke test

## Files to touch

- `data-pipeline/opendc/tiles/build.py`
- `data-pipeline/opendc/tiles/upload.py`
- `data-pipeline/opendc/tiles/__init__.py`
- `apps/web/src/components/map/map.tsx` (PMTiles source configuration)
- `apps/web/.env.example` (add `NEXT_PUBLIC_PMTILES_BASE`)
- `docs/dev-setup.md` (tippecanoe install notes)

## Notes

- R2 bucket is `gigawattmap`. CORS must allow `GET` from `gigawattmap.com` + Pages preview URLs.
- Version path `v1/` under the bucket so we can ship breaking schema changes as `v2/` without downtime.
- PMTiles vs MBTiles: **always PMTiles** — no tile server needed, reads directly from R2.
