# 018 — Opposition layer (datacenter-opposition-tracker)

**Status:** done
**Depends on:** 013
**Estimate:** 3 hours

## Context

Hundreds of US datacenter projects have been blocked, delayed, or are
under active community challenge — moratoria, zoning denials, lawsuits,
ratepayer fights. This is a public-interest story nobody visualizes
well. Ingest a structured open dataset, render as distinct markers
beside the campus dots, and give each fight its own card.

## Acceptance criteria

- [ ] `opendc/sources/opposition.py` fetches the upstream JSON, respects
      our identifying UA string (task 009), and caches the raw response
      under `out/raw/opposition-<date>.json`
- [ ] Each fight row captured into a Pydantic model: `id`, `project_name`,
      `company`, `hyperscaler`, `jurisdiction`, `state`, `county`, `lat`,
      `lng`, `status`, `community_outcome`, `action_type[]`, `issue_category[]`,
      `summary`, `megawatts`, `investment_million_usd`, `opposition_groups[]`,
      `sources[]`, `date`, `last_updated`, `data_source`
- [ ] Geocode via Nominatim (OSM) for any rows missing coordinates;
      respect 1 req/sec rate limit. (Upstream dataset already has
      lat/lng for every row, so this is a defensive fallback +
      reusable helper for later tasks.)
- [ ] Writes `out/interim/opposition.geojson`
- [ ] Built into `opposition.pmtiles` via `opendc/tiles/build.py`
- [ ] Web layer: red X markers (colors from `SPEC.md §5`), distinct
      shape from DC dots
- [ ] Layer toggle promoted from placeholder in `layer-controls.tsx`
      to real functionality
- [ ] Clicking an opposition feature opens a dedicated card layout
      (not the main Intelligence Card): project, status, concerns,
      MW + $$ scope, opposition groups, source links
- [ ] Attribution in the card and queued for `/about` (task 023):
      "Data: datacenter-opposition-tracker (CC BY 4.0), compiled from
      Data Center Watch, Robert Bryce, FracTracker Alliance, and local
      news"

## Files to touch

- `data-pipeline/opendc/sources/opposition.py`
- `data-pipeline/opendc/sources/geocode.py` (Nominatim wrapper, reused later)
- `data-pipeline/opendc/schemas.py` (add `OppositionFight`)
- `data-pipeline/opendc/cli.py` (wire `ingest opposition`)
- `data-pipeline/opendc/tiles/build.py` (add `opposition` TileSpec)
- `data-pipeline/tests/test_opposition.py`
- `data-pipeline/tests/test_geocode.py`
- `apps/web/src/components/map/layers/opposition-layer.ts`
- `apps/web/src/components/intelligence-card/opposition-card.tsx`
- `apps/web/src/components/map/layer-controls.tsx`
- `apps/web/public/seed/opposition.geojson`
- `apps/web/src/app/page.tsx` (mount layer + card)

## Notes

- **Source decision (2026-04-17):** Data Center Watch (the source named
  in this card's original title) has no public API and no open license
  — it's a commercial research firm. Bulk redistribution would violate
  copyright. Switched to
  [`Georgeingebretsen/datacenter-opposition-tracker`](https://github.com/Georgeingebretsen/datacenter-opposition-tracker)
  which compiles Data Center Watch's public reporting alongside Robert
  Bryce's Substack, FracTracker Alliance, and local news, and explicitly
  licenses the resulting database under CC BY 4.0. As of 2026-04-14 the
  upstream file `site/data/fights.json` contains 934 entries, all with
  lat/lng, status, action_type, sources[], and per-row `data_source`
  provenance.
- Per-row `sources[]` array satisfies our `source_url` audit-trail rule;
  show all of them in the card.
- Geocoding is lossy. Store `geocode_confidence` per record when we do
  fall back to Nominatim; warn on the card when low.
- Upstream README claims 345 entries but the actual file has 934 —
  always trust the file, not the docs.
- Documented in `README.md` data sources table (commit `bbc83ac`).
