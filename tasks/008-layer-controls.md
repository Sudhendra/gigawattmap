# 008 — Layer controls

**Status:** todo
**Depends on:** 005
**Estimate:** 1 hour

## Context

Top-left floating panel. Toggle visibility of datacenters/cables/powerplants/opposition layers. Only datacenters layer is real in v1; others are placeholders that show "coming soon" when toggled.

## Acceptance criteria

- [ ] `components/map/layer-controls.tsx` renders 4 toggles: Datacenters (default on), Cables, Power Plants, Opposition
- [ ] State lives in `mapStore.layers: Record<LayerId, boolean>`
- [ ] Clicking a placeholder toggle (cables/powerplants/opposition) shows an inline "coming in v1" hint for 2s, does not actually flip state
- [ ] Clicking datacenters toggle hides/shows the layer (deck.gl layer visibility)
- [ ] Keyboard accessible: tab focus order matches visual order, space/enter to toggle
- [ ] Visible color swatch next to each layer name, matches the palette from `SPEC.md §5`

## Files to touch

- `apps/web/src/components/map/layer-controls.tsx`
- `apps/web/src/lib/store/map-store.ts` (add `layers` + `toggleLayer` action)

## Notes

Design note: in v1 we're showing the layer controls with 3 "coming soon" entries deliberately — it tells the visitor this is a *v1* and more is planned. Trust-building UX.
