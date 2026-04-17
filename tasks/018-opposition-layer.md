# 018 — Opposition layer (Data Center Watch)

**Status:** todo
**Depends on:** 013
**Estimate:** 3 hours

## Context

$162B+ of blocked or delayed US datacenter projects per Data Center Watch. This is a public-interest story nobody visualizes well. Ingest, geocode where missing, display as distinct markers.

## Acceptance criteria

- [ ] `opendc/sources/opposition.py` scrapes or imports Data Center Watch's project list (respect robots.txt, implement backoff, use our identifying UA string from task 009)
- [ ] Each project row captured: `project_name`, `operator`, `city`, `state`, `status` (blocked/delayed/approved-with-conditions), `concerns` (water/noise/grid/tax — may be multi-tag), `amount_usd`, `timeline`, `source_url`
- [ ] Geocode via Nominatim (OSM) for any missing coordinates; respect 1 req/sec rate limit
- [ ] Writes `out/interim/opposition.geojson`
- [ ] Built into `opposition.pmtiles`
- [ ] Web layer: red X markers (colors from `SPEC.md §5`), distinct shape from DC dots
- [ ] Layer toggle promoted from placeholder in `layer-controls.tsx` to real functionality
- [ ] Clicking an opposition feature opens a dedicated card layout (not the main Intelligence Card): project, concerns, $$ impact, a link to the Data Center Watch original page
- [ ] Attribution in `/about` and in the card: "Data courtesy of Data Center Watch (datacenterwatch.org)"

## Files to touch

- `data-pipeline/opendc/sources/opposition.py`
- `data-pipeline/opendc/sources/geocode.py` (small Nominatim wrapper, reused later)
- `apps/web/src/components/map/layers/opposition-layer.ts`
- `apps/web/src/components/intelligence-card/opposition-card.tsx`

## Notes

- Check if Data Center Watch has an API or a downloadable dataset before scraping. Prefer the structured source.
- Respect their licensing — we may need to cite editorially and link back rather than bulk-redistribute.
- Geocoding is lossy. Store `geocode_confidence` per record; when low, show a warning on the card.
