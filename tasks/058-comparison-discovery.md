# 058 — Make comparison discoverable and self-contained

**Status:** in-progress
**Depends on:** 054
**Estimate:** 1 day

## Context

Comparison is hidden until a card is selected and requires repeated navigation to add facilities. Owner requested an intuitive redesign and deployment.

## Acceptance criteria

- [ ] Visible entry point before selection; explanatory empty and one-item states.
- [ ] Search facilities and add directly inside comparison, with loading/no-results states and three-item limit.
- [ ] Named removable selections in tray and dialog; live count feedback and clear selected state on cards.
- [ ] Mobile horizontal table retains field labels; keyboard dialog controls and source evidence retained.
- [ ] Production build/tests and desktop/mobile browser flow pass; deployed and pushed.

## Files to touch

- `apps/web/src/components/comparison/`
- `tests/e2e/comparison-discovery-flow.js`

## Notes

No new API, dependency, persisted views or watchlists. Existing comparison data semantics unchanged.
