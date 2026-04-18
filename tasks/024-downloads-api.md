# 024 — Downloads page + public API (umbrella)

**Status:** split
**Depends on:** 013, 023
**Estimate:** 5 hours total
**Split into:** 024a, 024b, 024c

## Context

Ship the data as first-class artifacts. Developers clone the dataset directly; analysts pull CSVs; the map becomes one consumer of many. A public, unauthenticated, rate-limited API for programmatic access.

This card is now an umbrella tracking three child cards executed in order:

- **024a** — R2 artifact upload pipeline (infrastructure plumbing; nothing user-visible)
- **024b** — Public API + OpenAPI + rate limiting (reads the manifest produced by 024a)
- **024c** — Downloads page + `/data/api` docs page (consumes 024a manifest, documents 024b)

Original acceptance criteria preserved below for traceability; each child card carries the relevant subset.

## Acceptance criteria

**Downloads page (`/data`):**

- [ ] Shows a table of downloadable artifacts, grouped by source:
  - Full merged GeoJSON (`datacenters.geojson`)
  - Full merged CSV (`datacenters.csv`) with a flat subset of fields
  - Per-source raw: `osm.geojson`, `gem-powerplants.geojson`, `telegeography-cables.geojson` (flagged non-commercial), `curated-ai-campuses.csv`, `opposition.geojson`, `cloud-regions.geojson`
  - PMTiles for each layer
- [ ] Each row shows: filename, size, feature count, last updated, license badge, copy-curl button, download link
- [ ] All downloads served from `r2://gigawattmap/v1/downloads/` with `Content-Disposition: attachment`
- [ ] License warnings are loud: cables layer shows a non-commercial warning in bold
- [ ] Example `curl` commands shown for each artifact
- [ ] Link to the GitHub repo

**Public API (`apps/api/src/routes/`):**

- [ ] `GET /api/v1/datacenters?bbox=lon1,lat1,lon2,lat2&operator=&status=&limit=1000` — returns GeoJSON FeatureCollection
- [ ] `GET /api/v1/datacenters/:id` — returns single Feature with all enriched fields
- [ ] `GET /api/v1/powerplants?bbox=…&fuel_type=&min_mw=`
- [ ] `GET /api/v1/announcements?limit=50&category=&since=`
- [ ] All endpoints: JSON responses, `Cache-Control: public, max-age=300, stale-while-revalidate=3600`
- [ ] Rate limiting at Worker edge: 60 req/min per IP (use Cloudflare's rate-limit binding)
- [ ] `GET /api/v1/openapi.json` — OpenAPI 3.1 schema describing the whole API
- [ ] `/data/api` page documents the endpoints, request/response examples, rate limits
- [ ] CORS: allow `*` for GET; no write endpoints in v1

## Files to touch

- `apps/web/src/app/data/page.tsx`
- `apps/web/src/app/data/api/page.tsx`
- `apps/api/src/routes/datacenters.ts`
- `apps/api/src/routes/powerplants.ts`
- `apps/api/src/routes/announcements.ts`
- `apps/api/src/routes/openapi.ts`
- `apps/api/src/middleware/rate-limit.ts`

## Notes

- The API reads pre-built artifacts from R2 (bbox query = load the relevant PMTiles subset in memory, filter, return). For v1 this is fine at our scale; if traffic explodes we move to a proper spatial DB.
- Rate limiting is essential — public APIs get hammered. Return `Retry-After` on 429s.
- Document every field in the OpenAPI schema. This doc is the investor-tier proof point.
