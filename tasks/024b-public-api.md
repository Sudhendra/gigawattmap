# 024b — Public API (datacenters / powerplants / announcements / OpenAPI)

**Status:** in-progress
**Depends on:** 024a
**Estimate:** 2 hours

## Context

Sub-card of 024. Ships the read-only public API on Hono/Workers, reading from the R2 manifest produced by 024a. Downloads UI (024c) ships separately so each commit stays reviewable.

## Acceptance criteria

- [ ] `GET /api/v1/datacenters?bbox=lon1,lat1,lon2,lat2&operator=&status=&limit=1000` returns GeoJSON FeatureCollection
- [ ] `GET /api/v1/datacenters/:id` returns single Feature with all enriched fields
- [ ] `GET /api/v1/powerplants?bbox=&fuel_type=&min_mw=`
- [ ] `GET /api/v1/announcements?limit=50&category=&since=` (reads from existing announcements artifact / D1, whichever is current)
- [ ] All endpoints respond JSON with `Cache-Control: public, max-age=300, stale-while-revalidate=3600`
- [ ] `GET /api/v1/openapi.json` returns OpenAPI 3.1 schema describing every endpoint, every field
- [ ] Rate-limit middleware: 60 req/min/IP. Uses Cloudflare's rate-limit binding when present, in-memory `Map`-based fallback for local dev. Returns 429 with `Retry-After` header.
- [ ] CORS: `Access-Control-Allow-Origin: *` for GET; no write endpoints
- [ ] vitest coverage: each route happy-path + one error case; rate-limit middleware covers under-limit + over-limit + reset

## Files to touch

- `apps/api/src/routes/datacenters.ts`
- `apps/api/src/routes/powerplants.ts`
- `apps/api/src/routes/announcements.ts`
- `apps/api/src/routes/openapi.ts`
- `apps/api/src/middleware/rate-limit.ts`
- `apps/api/src/index.ts` (mount routes + middleware)
- Tests for each above

## Notes

- bbox query for v1: load the relevant artifact from R2 (cached at the Worker), filter in-memory, return. Adequate for our scale; spatial DB is a future concern.
- OpenAPI schema is the investor-tier proof point — every field documented, no `additionalProperties: true`.
- Rate limit returns `Retry-After` in seconds, not a date.
