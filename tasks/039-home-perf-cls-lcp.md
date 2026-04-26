# 039 — Home page perf: CLS + LCP + unused JS

**Status:** in-progress
**Depends on:** 025d (Lighthouse baseline)
**Estimate:** 4-6h

## Context

Lighthouse desktop run on `/` (real Brave, 2026-04-26) returned **Performance
75**, below the AGENTS.md ≥90 target. Three concrete root causes identified
from the report; this card addresses them as a single perf pass.

Baseline metrics (real-browser desktop, prod build, local R2):

| Metric | Value | Score |
| ------ | ----- | ----- |
| FCP    | 0.9 s | 0.92 |
| **LCP** | **2.4 s** | **0.49** |
| TBT    | 30 ms | 1.00 |
| **CLS** | **0.236** | **0.53** |
| Speed Index | 0.9 s | 0.99 |
| TTI    | 2.4 s | 0.90 |

## Acceptance criteria

- [ ] Re-run Lighthouse desktop on `/` in real Brave; **Performance ≥90**
- [ ] CLS ≤ 0.1 (currently 0.236)
- [ ] LCP ≤ 2.0s (currently 2.4s)
- [ ] No regression on `/about`, `/data`, `/data/api` (still ≥95 across the board)
- [ ] Lighthouse JSON for `/` archived under `docs/lighthouse/039-after.json`
      (and `-before.json` for comparison)
- [ ] All 108+ existing tests still pass

## Files to touch

Likely (verify with profiling first — do NOT guess):

- `apps/web/src/app/page.tsx` — wrap MapShell in `<Suspense>` with a
  fixed-height skeleton so the announcements aside, picks-and-shovels ticker,
  and viewport HUD don't shift after hydration
- `apps/web/src/components/announcements-feed/*` — reserve `min-height` on
  the aside before content loads (CLS culprit #1, score 0.211)
- `apps/web/src/components/ticker-panel/*` — reserve space for the
  picks-and-shovels section (CLS culprit #2, score 0.024)
- `apps/web/src/components/viewport-hud/*` — reserve space for the
  "— substations" stat span (CLS culprit #3, score 0.0003)
- `apps/web/src/components/map-shell/*` or wherever MapLibre + deck are
  imported — convert to `next/dynamic` with `ssr: false` and a small
  loading skeleton; this is what's burning the 281 KiB unused-JS budget
  (chunk `c25e440e` 157 KiB wasted, chunk `548` 130 KiB wasted)

## Notes

- **Profile before optimizing.** Per AGENTS.md performance rule. Use
  Chrome/Brave DevTools Performance tab against a local prod build, not
  guesses.
- The Lighthouse "before" report is at the repo root as
  `lighthouse_summary.html` and `lighthouse_report_summary.pdf` — move into
  `docs/lighthouse/039-before.html` as part of this card.
- The 4255-feature datacenters layer hits the GPU at the same time as the
  basemap tiles. Consider deferring the deck.gl layers behind a
  `requestIdleCallback` or visibility check.
- One legitimate console error already fixed in 025d (broken `/stories` nav
  link → `/news`); rerun should show errors-in-console = 0.
- Total page weight 5,120 KiB is dominated by basemap PNG tiles and seed
  GeoJSON. Outside scope here; basemap optimization is a separate card if
  needed.
- Do NOT chase a 100. The honest target is 90.
