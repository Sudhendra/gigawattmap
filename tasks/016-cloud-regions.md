# 016 — Cloud provider regions layer

**Status:** todo
**Depends on:** 013
**Estimate:** 2 hours

## Context

AWS/Azure/GCP/Oracle/Alibaba don't publish exact coordinates for security reasons. Use metro-area centroids shown as 10km buffer circles, not precise pins. This is explicit in the UI.

## Acceptance criteria

- [ ] `data-pipeline/opendc/data/cloud-regions.json` has ≥80 rows with `{ provider, code, display_name, lat, lon, country, launch_year, services? }` covering AWS, Azure, GCP, Oracle, and Alibaba's major regions
- [ ] `opendc/sources/cloud_regions.py` loads, validates, emits `out/interim/cloud-regions.geojson`
- [ ] Built into a separate PMTiles `cloud-regions.pmtiles`
- [ ] Web app adds a new layer toggle (promoted from placeholder): deck.gl `IconLayer` with provider logos OR colored circles with 10km buffer (prefer circles — no copyrighted logos)
- [ ] Tooltip clearly states "Approximate metro-area centroid. Cloud providers do not publish exact coordinates."
- [ ] Clicking a region opens a simpler card (not the full intelligence card): provider, region code, launch year, link to provider's docs

## Files to touch

- `data-pipeline/opendc/data/cloud-regions.json`
- `data-pipeline/opendc/sources/cloud_regions.py`
- `apps/web/src/components/map/layers/cloud-regions-layer.ts`
- `apps/web/src/components/map/layer-controls.tsx`

## Notes

- Source URLs for hand-research: AWS `docs.aws.amazon.com/about-aws/global-infrastructure/regions_az/`, Azure `azure.microsoft.com/en-us/explore/global-infrastructure/geographies/`, GCP `cloud.google.com/about/locations`, Oracle `oracle.com/cloud/data-regions/`, Alibaba `alibabacloud.com/global-locations`.
- Do NOT use provider logos in the map without licensing clearance. Colored circles + labels are the safe default.
