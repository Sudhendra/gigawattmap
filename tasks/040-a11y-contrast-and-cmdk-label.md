# 040 — A11y: text-subtle contrast + cmdk button label

**Status:** in-progress
**Depends on:** 039 (surfaced these findings)
**Estimate:** 1-2h

## Context

Task 039 reserved space for ticker rows and announcement cards, which made
those regions paint reliably enough for axe (via Lighthouse) to analyze them.
Two pre-existing a11y findings were surfaced as a result, dropping the home-
page Accessibility score from 100 to 96. Both still pass the AGENTS.md ≥95
target, but they are real WCAG AA violations and worth fixing.

### Finding 1 — `color-contrast` (serious)

`--text-subtle: #5a6478` against `--bg-panel: #131820` measures ~3.4:1.
WCAG AA for normal text requires ≥4.5:1.

Affected elements observed by Lighthouse:
- TickerPanel section headers ("HYPERSCALERS", "FOLLOW", "RESEARCH", etc.)
- ViewportHud "— substations" qualifier span
- Likely many more — `text-subtle` has 64 usages across `apps/web/src`.

### Finding 2 — `label-content-name-mismatch` (serious)

The cmdk hint button in `apps/web/src/components/app-header.tsx` has
`aria-label="Open search"` while the visible content is `⌘K`. WCAG 2.5.3
requires the accessible name to start with the visible label so voice-control
users can say what they see.

## Acceptance criteria

- [ ] `--text-subtle` updated to a value with ≥4.5:1 contrast against
      `--bg-panel` (#131820). Suggest `#8a93a6` (~5.2:1) — verify with a
      contrast checker before committing.
- [ ] No visual regression on hero, ticker headers, viewport HUD, or
      announcement cards (eyeball at zoom 100% in Brave).
- [ ] cmdk button accessible name matches visible text (e.g. set
      `aria-label="Search ⌘K"` or remove aria-label and rely on visible
      text + `title`).
- [ ] Real Brave Lighthouse on `/` still passes:
      Perf ≥90, A11y ≥95 (target: 100), BP ≥95, SEO ≥95.
- [ ] No regression on /about, /data, /data/api Lighthouse scores.
- [ ] All existing tests pass (`pnpm test`).

## Files to touch

- `apps/web/src/app/globals.css` — `--text-subtle` value
- `apps/web/src/components/app-header.tsx` — cmdk button label
- (Possibly) any component that hard-codes `#5a6478` outside the CSS var

## Notes

- Don't chase 100 — 96 already meets the bar. The fix is justified because
  these are real WCAG violations, not score-chasing.
- Before changing the CSS var globally, grep usages and spot-check a few
  high-traffic ones to make sure the new color reads well in context:
  `grep -r "text-subtle" apps/web/src | wc -l` (was 64 at time of writing).
- Archive the new Lighthouse report under `docs/lighthouse/040-after.{html,json}`.
