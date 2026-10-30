# 058 — Make comparison discoverable and self-contained

**Status:** done
**Depends on:** 054
**Estimate:** 1 day

## Context

Comparison is hidden until a card is selected and requires repeated navigation to add facilities. Owner requested an intuitive redesign and deployment.

## Acceptance criteria

- [x] Visible entry point before selection; explanatory empty and one-item states.
- [x] Search facilities and add directly inside comparison, with loading/no-results states and three-item limit.
- [x] Named removable selections in tray and dialog; live count feedback and clear selected state on cards.
- [x] Mobile horizontal table retains field labels; keyboard dialog controls and source evidence retained.
- [x] Production build/tests and desktop/mobile browser flow pass; deployed and pushed.

## Files to touch

- `apps/web/src/components/comparison/`
- `tests/e2e/comparison-discovery-flow.js`

## Notes

No new API, dependency, persisted views or watchlists. Existing comparison data semantics unchanged.

## Verification

150 web tests, typecheck and production build passed. Both comparison browser flows passed: discovery/search/no-results/keyboard add/limit/replacement/clear and existing map-card selection. Desktop/mobile screenshots inspected; live Microsoft Mount Pleasant + Equinix Ashburn comparison verified after deployment eaf93dcf. Existing full-map bundle budget debt remains tracked in task 048; no new dependencies.
