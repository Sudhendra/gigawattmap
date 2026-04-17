# 007 — Viewport HUD

**Status:** todo
**Depends on:** 005
**Estimate:** 1.5 hours

## Context

Bottom-of-screen status strip that updates on pan/zoom. The signature piece that makes the map feel *alive*. `Visible: 247 DCs · ~8.4 GW est · 62 operators · 14 substations`

## Acceptance criteria

- [ ] `components/map/viewport-hud.tsx` renders at the bottom of the map, horizontally centered, 60% width max
- [ ] Reads viewport bounds from `mapStore`
- [ ] Filters features currently in-bounds client-side (seed data is small; real data will need spatial indexing — tracked as task 024)
- [ ] Displays 4 stats: `DC count`, `sum of est_mw_mid` (formatted as GW with 1 decimal), `distinct operators`, `substation count` (placeholder `—` for v1)
- [ ] Updates on `moveend` only (not every frame) — use a debounced selector or `useSyncExternalStore`
- [ ] Uses `tabular-nums`, monospace font, muted-on-hover tooltip explaining each stat
- [ ] `aria-live="polite"` so screen readers announce changes
- [ ] Collapsible by clicking a small chevron; state persists in Zustand

## Files to touch

- `apps/web/src/components/map/viewport-hud.tsx`
- `apps/web/src/lib/store/map-store.ts` (add `hudCollapsed` state)
- `apps/web/src/lib/stats.ts` (pure function: features in bounds → stat object)

## Notes

Pure stat function is unit-tested. The rest of the UI is integration-tested via Playwright in task 025.
