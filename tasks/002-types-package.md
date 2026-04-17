# 002 — @gigawattmap/types package

**Status:** in-progress
**Depends on:** 001
**Estimate:** 1 hour

## Context

Every surface of this product — web UI, API, pipeline — talks about the same nouns: `Datacenter`, `Operator`, `PowerPlant`, `Cable`, `Announcement`. Model them once, import everywhere. Later (task 015) we'll generate these from the Pydantic schemas to keep Python↔TS in sync; for now, hand-write.

## Acceptance criteria

- [ ] `packages/types/src/index.ts` exports types with JSDoc:
  - `Datacenter` — id, name, operator_id, tier, status, geometry, est_mw_low/mid/high, mw_source, country, region, sources, confidence
  - `DatacenterTier` — `'hyperscale' | 'colo' | 'neocloud' | 'enterprise'`
  - `DatacenterStatus` — `'operational' | 'construction' | 'announced' | 'blocked'`
  - `PowerPlant` — id, name, fuel_type, capacity_mw, geometry, operator, commissioning_year, source
  - `FuelType` — `'coal' | 'gas' | 'nuclear' | 'solar' | 'wind' | 'hydro' | 'storage' | 'other'`
  - `Cable` — id, name, length_km, capacity_tbps, landing_points, geometry, rfs_year
  - `Announcement` — id, date, title, operator_id?, datacenter_id?, amount_usd?, category, source_url
  - `Operator` — id, name, ticker?, tier, headquarters_country
  - `Confidence` — `'verified' | 'osm_only' | 'press_release' | 'estimated'`
  - `LayerId` — `'datacenters' | 'cables' | 'powerplants' | 'opposition' | 'cloud_regions' | 'water_stress'`
- [ ] All geometry typed as `GeoJSON.Geometry` (use `@types/geojson`)
- [ ] `packages/types/src/index.ts` compiles clean under `strict`
- [ ] From `apps/web`: `import { Datacenter } from '@gigawattmap/types'` works after `pnpm install`

## Files to touch

- `packages/types/package.json` (add `@types/geojson` dep)
- `packages/types/src/index.ts`
- `packages/types/src/datacenter.ts`
- `packages/types/src/power.ts`
- `packages/types/src/cable.ts`
- `packages/types/src/announcement.ts`

## Notes

Keep enums as string-literal unions, not TypeScript `enum`s (better tree-shaking, simpler JSON serialization).
