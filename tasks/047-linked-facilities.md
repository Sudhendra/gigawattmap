# 047 — Explain ticker-linked facilities

**Status:** done
**Depends on:** 041, 043
**Estimate:** 1 day

## Context

Ticker rows currently resemble a quote widget and their highlighting is unexplained. The Talen mapping incorrectly highlights every Amazon facility.

## Acceptance criteria

- [x] Replace filter jargon with “Show linked facilities” and explain highlighting versus hiding.
- [x] Show matching facility counts from the loaded dataset, including loading and zero-match states, and explain that relationships are operator matches rather than verified supplier/revenue exposure.
- [x] Stocks without mapped links visibly say “No facility links yet”; activating one does not imply known exposure.
- [x] Remove the broad TLN-to-Amazon mapping; a regression test rejects it.
- [x] Selecting a ticker clears conflicting operator selection; clear/reselect behavior is keyboard accessible. Viewport stats are explicitly labeled as all visible facilities.
- [x] Tests/typecheck/build and desktop/mobile browser checks pass; changes are deployed and verified.

## Files to touch

- `apps/web/src/lib/ticker-map.ts`
- `apps/web/src/lib/ticker-map.test.ts`
- `apps/web/src/components/ticker-panel/ticker-panel.tsx`
- `apps/web/src/components/map/viewport-hud.tsx`
- `apps/web/src/app/_components/map-view.tsx`
- `apps/web/src/components/intelligence-card/intelligence-card.tsx`

## Notes

Owner approved October 25. This replaces task 041's obsolete dash-only affordance scope. Keep original source attribution; no inferred contracts or new financial data.

Verified October 25: 134 web tests, strict typecheck and production build; keyboard EQIX selection/clear, 182 linked facilities, TLN no-links state, operator URL clearing, shared facility restoration, and 390px mobile layout. Public deployment 081c346f verified 5,012 facilities and no localhost requests.
