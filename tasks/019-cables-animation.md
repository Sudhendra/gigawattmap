# 019 — Submarine cable animated ArcLayer

**Status:** done
**Depends on:** 012, 013
**Estimate:** 3 hours

## Context

The screenshot that goes viral. Animated submarine cables with flowing particles, driven by deck.gl. Subtle by default.

## Acceptance criteria

- [ ] `components/map/layers/cables-layer.ts` reads the cables PMTiles, renders:
  - A base `PathLayer` for all cables, low-opacity `--accent-cable` color
  - A `TripsLayer` (or custom animated `ScenegraphLayer`) with particles flowing along each cable at ~100px/sec
  - Loop duration 8 seconds, staggered starts per-cable
- [ ] Respects `prefers-reduced-motion`: when true, no animation — static lines only
- [ ] Layer toggle (promoted from placeholder)
- [ ] Clicking a cable opens a card: name, length_km, RFS year, landing points list, capacity if known, source attribution
- [ ] Hover shows cable name as a tooltip
- [ ] Performance: with ~500 cables animated, map stays at 60fps on modern hardware (profile via Chrome DevTools)

## Files to touch

- `apps/web/src/components/map/layers/cables-layer.ts`
- `apps/web/src/components/intelligence-card/cable-card.tsx`
- `apps/web/src/lib/store/map-store.ts` (add animation time state if using `useTime` pattern)

## Notes

- Particle density must be subtle — default feels like ambient motion, not aggressive dataviz.
- If `TripsLayer` doesn't hit performance targets, fall back to two stacked `PathLayer`s with animated dash offsets.
- Submarine cables cross the antimeridian (dateline). Handle the geometry split — deck.gl has `wrapLongitude` option.
