# 054 — Facility comparison

**Status:** done
**Depends on:** 051
**Estimate:** 1 day

## Context

Compare documented facility facts without losing the map. Owner requested a live comparison tray; no separate API is needed because the existing snapshot already supplies these fields.

## Acceptance criteria

- [x] Add/remove up to three facilities from detail cards; duplicates and overflow prevented.
- [x] Persistent in-session tray opens an accessible comparison dialog with operator, tenant, location, status, estimated capacity, sources and dataset publication; unknowns explicit.
- [x] Removing/clearing selections works without page navigation; desktop/mobile usable.
- [x] Tests, build and browser flow pass; deployed and pushed.

## Files to touch

- `apps/web/src/components/comparison/`
- `apps/web/src/components/intelligence-card/intelligence-card.tsx`
- `apps/web/src/components/map/research-panel.tsx`
- `apps/web/src/app/_components/map-view.tsx`

## Notes

No brokerage, crypto, saved views or watchlists. Comparison reflects current snapshot, not financial exposure or verified operational capacity.

## Verification — 2026-10-30

150 web tests and production build passed. Desktop/mobile browser flow covers three-item limit, unknown versus zero, remove/clear, Escape and preserved map instance. Live comparison verified on Cloudflare Pages fa0c11a5. No standalone API: existing snapshot supplies all comparison fields. Session-only selection; no saved views.
