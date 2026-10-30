# 054 — Facility comparison

**Status:** in-progress
**Depends on:** 051
**Estimate:** 1 day

## Context

Compare documented facility facts without losing the map. Owner requested a live comparison tray; no separate API is needed because the existing snapshot already supplies these fields.

## Acceptance criteria

- [ ] Add/remove up to three facilities from detail cards; duplicates and overflow prevented.
- [ ] Persistent in-session tray opens an accessible comparison dialog with operator, tenant, location, status, estimated capacity, sources and dataset publication; unknowns explicit.
- [ ] Removing/clearing selections works without page navigation; desktop/mobile usable.
- [ ] Tests, build and browser flow pass; deployed and pushed.

## Files to touch

- `apps/web/src/components/comparison/`
- `apps/web/src/components/intelligence-card/intelligence-card.tsx`
- `apps/web/src/components/map/research-panel.tsx`
- `apps/web/src/app/_components/map-view.tsx`

## Notes

No brokerage, crypto, saved views or watchlists. Comparison reflects current snapshot, not financial exposure or verified operational capacity.
