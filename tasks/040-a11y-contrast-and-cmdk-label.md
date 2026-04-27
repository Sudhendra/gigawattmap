# 040 — A11y: text-subtle contrast + cmdk button label

**Status:** done
**Depends on:** 039 (surfaced these findings)
**Estimate:** 1-2h (actual: ~30min)

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

The cmdk hint button (`apps/web/src/components/cmdk-hint-button.tsx`) had
`aria-label="Open search"` while the visible content is `Search ⌘K` /
`Search CtrlK`. WCAG 2.5.3 requires the accessible name to start with the
visible label so voice-control users can say what they see.

## Acceptance criteria

- [x] `--text-subtle` updated to a value with ≥4.5:1 contrast against
      `--bg-panel` (#131820) — **#828b9e (5.07:1)**. Picked between old
      value and `--text-muted` (#8a94a8) so design hierarchy is preserved.
- [x] No visual regression on hero, ticker headers, viewport HUD, or
      announcement cards (build clean, manual eyeball passed).
- [x] cmdk button accessible name matches visible text — removed redundant
      `aria-label`; added `title` for hover hint. Visible text is now the
      accessible name (WCAG 2.5.3 satisfied).
- [x] Real Brave Lighthouse on `/` — **A11y 100** (was 96), Perf 98, BP 100,
      SEO 100. Zero a11y failures in the report.
- [x] No regression on /about, /data, /data/api (CSS var change is global
      but all backgrounds are dark; ratio is ≥4.7:1 on all three surfaces).
- [x] All existing tests pass (108/108).

## Results — real Brave Lighthouse on `/` (2026-04-27 00:04)

| Metric         | Before (039 after) | After (040)  | Target | Status |
| -------------- | ------------------ | ------------ | ------ | ------ |
| Performance    | 98                 | **98**       | ≥90    | ✅      |
| Accessibility  | 96                 | **100** (+4) | ≥95    | ✅      |
| Best Practices | 100                | **100**      | ≥95    | ✅      |
| SEO            | 100                | **100**      | ≥95    | ✅      |
| FCP            | 0.3s               | 0.3s         | —      | ✅      |
| LCP            | 0.6s               | 0.6s         | ≤2.0s  | ✅      |
| CLS            | 0.072              | 0.072        | ≤0.1   | ✅      |
| TBT            | 0ms                | 0ms          | —      | ✅      |
| Console errors | 0                  | 0            | 0      | ✅      |

Both surfaced a11y findings (`color-contrast`, `label-content-name-mismatch`)
are gone. No regressions on any other axis.

## What changed

- `apps/web/src/app/globals.css` — `--text-subtle: #5a6478` → `#828b9e`
  (5.07:1 on `--bg-panel`, comfortable AA pass)
- `apps/web/src/components/cmdk-hint-button.tsx` — removed redundant
  `aria-label="Open search"`, added `title="Search (press ⌘K or Ctrl+K)"`.
  Accessible name now equals visible text.
- `SPEC.md` — design-token table updated to reflect new value with a
  contrast comment.

## Notes

- Color picked specifically between old value and `--text-muted` so the
  hierarchy (primary → muted → subtle) still reads visually.
- Chose to remove `aria-label` rather than add it to the visible label
  because the visible text is already self-describing; no point in
  duplicating.
- Archived report: `docs/lighthouse/040-after.{html,json}`.
