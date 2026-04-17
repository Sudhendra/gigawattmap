# 005 — Seed dataset + deck.gl layer

**Status:** done
**Depends on:** 004
**Estimate:** 2 hours

## Context

Before the real data pipeline runs, we need visible dots on the map. Hand-curate 20 of the biggest announced AI campuses and ship them as a static GeoJSON in `public/`. Render via deck.gl `ScatterplotLayer`.

## Acceptance criteria

- [ ] `apps/web/public/seed/ai-campuses.geojson` contains these 20 features with `{ name, operator, tenant, est_mw_mid, status, country }` properties:

| name | operator | tenant | lat | lon | mw | status |
|---|---|---|---|---|---|---|
| Stargate I — Abilene | Crusoe | OpenAI/Oracle | 32.4487 | -99.7331 | 1200 | construction |
| Meta Hyperion | Meta | Meta | 32.3900 | -91.7000 | 5000 | construction |
| Meta Prometheus | Meta | Meta | 40.2000 | -82.5000 | 1000 | announced |
| Amazon Project Rainier | Amazon | Anthropic | 38.2900 | -85.7600 | 2200 | operational |
| Vantage Frontier | Vantage | (unknown) | 32.7000 | -99.1900 | 1400 | construction |
| Talen Susquehanna (AWS) | Talen | AWS | 40.2100 | -76.0100 | 1920 | operational |
| Homer City Redevelopment | Homer City Redev. | (multiple) | 40.5300 | -79.6000 | 4500 | announced |
| xAI Colossus Memphis | xAI | xAI | 35.0500 | -90.0500 | 250 | operational |
| xAI Colossus 2 | xAI | xAI | 34.9500 | -90.0700 | 1000 | construction |
| Microsoft Mount Pleasant | Microsoft | OpenAI | 42.7200 | -87.9000 | 900 | construction |
| Google Council Bluffs | Google | Google | 41.2300 | -95.8600 | 650 | operational |
| CoreWeave Plano | CoreWeave | (multiple) | 33.0200 | -96.7000 | 60 | operational |
| Nebius Vineland NJ | Nebius | (multiple) | 39.4860 | -75.0260 | 300 | construction |
| Oracle Cloud Arizona | Oracle | Oracle | 33.4300 | -112.0700 | 400 | operational |
| QTS Ashburn VA | QTS/Blackstone | (multiple) | 39.0200 | -77.5300 | 450 | operational |
| Equinix DC11 Ashburn | Equinix | (multiple) | 39.0100 | -77.5400 | 32 | operational |
| Digital Realty ORD11 Elk Grove | Digital Realty | (multiple) | 41.9850 | -87.9970 | 47 | operational |
| Microsoft Mt Shadow VA | Microsoft | Microsoft | 39.0400 | -77.4800 | 100 | operational |
| AWS us-east-1 N. Virginia | Amazon | AWS | 38.9500 | -77.4500 | 1500 | operational |
| Meta Richland Parish | Meta | Meta | 32.3800 | -91.7100 | 2000 | construction |

- [ ] `components/map/layers/datacenters-layer.ts` exports a `createDatacentersLayer(data)` factory returning a `ScatterplotLayer`
- [ ] Colors by tier (hyperscale/colo/neocloud/enterprise per `SPEC.md §5`); radius scales with `Math.sqrt(est_mw_mid)` with sensible min/max
- [ ] deck.gl mounted via `@deck.gl/mapbox` `MapboxOverlay` in *interleaved* mode
- [ ] Clicking a dot logs the feature to console (drawer comes in task 006)
- [ ] Hover cursor becomes pointer over dots
- [ ] All 20 render correctly on initial load

## Files to touch

- `apps/web/public/seed/ai-campuses.geojson`
- `apps/web/src/components/map/map.tsx`
- `apps/web/src/components/map/layers/datacenters-layer.ts`
- `apps/web/package.json` (add `deck.gl`, `@deck.gl/layers`, `@deck.gl/mapbox`)

## Notes

Tier assignment rule for the seed data: `operator in {Amazon, Google, Microsoft, Meta, Oracle} → hyperscale`; `operator in {CoreWeave, Nebius, xAI, Crusoe} → neocloud`; `operator in {Equinix, Digital Realty, QTS, Vantage} → colo`; else `enterprise`.
