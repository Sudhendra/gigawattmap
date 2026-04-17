# 004 — MapLibre hello world + PMTiles protocol

**Status:** in-progress
**Depends on:** 003
**Estimate:** 2 hours

## Context

First map render. Dark basemap, PMTiles protocol registered (even though we don't have our own PMTiles yet), Zustand store for viewport state, client component boundary set up cleanly.

## Acceptance criteria

- [ ] `maplibre-gl@^5.0` and `pmtiles@^4` installed in `apps/web`
- [ ] `components/map/map.tsx` is a `"use client"` component that renders a full-viewport MapLibre map
- [ ] PMTiles protocol registered at module init via `maplibregl.addProtocol('pmtiles', protocol.tile)`
- [ ] Basemap: OpenFreeMap dark style (`https://tiles.openfreemap.org/styles/liberty` or equivalent dark variant) as a temporary placeholder
- [ ] Initial viewport: center `[-95, 38]`, zoom `3.2` (continental US default)
- [ ] `lib/store/map-store.ts` exports a Zustand store with `viewport`, `setViewport`, `selectedLayer`
- [ ] Map updates store on `moveend`
- [ ] Navigation control (zoom +/−, compass) in bottom-right
- [ ] `app/page.tsx` renders `<Map />` full-bleed
- [ ] No hydration warnings in console

## Files to touch

- `apps/web/src/components/map/map.tsx`
- `apps/web/src/lib/store/map-store.ts`
- `apps/web/src/app/page.tsx`

## Notes

- MapLibre v5 supports globe view natively — set `map.setProjection({ type: 'globe' })` available but off by default (we'll toggle it later).
- Import MapLibre CSS in `globals.css`: `@import "maplibre-gl/dist/maplibre-gl.css";`
- If OpenFreeMap's dark variant isn't ready, use MapTiler's free tier with an attribution banner — but prefer OpenFreeMap for true zero-cost.
