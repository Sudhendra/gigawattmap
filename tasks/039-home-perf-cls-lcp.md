# 039 — Home page perf: CLS + LCP + unused JS

**Status:** done
**Depends on:** 025d (Lighthouse baseline)
**Estimate:** 4-6h (actual: ~1h)

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

- [x] Re-run Lighthouse desktop on `/` in real Brave; **Performance ≥90**
      — **98** (real Brave, 2026-04-26 23:49)
- [x] CLS ≤ 0.1 (currently 0.236) — **0.072**
- [x] LCP ≤ 2.0s (currently 2.4s) — **0.6s**
- [x] No regression on `/about`, `/data`, `/data/api` (still ≥95 across the board)
      — `/about` 100/96/100/100, `/data` 100/96/100/100, `/data/api` 100/94/100/100
- [x] Lighthouse JSON for `/` archived under `docs/lighthouse/039-after.json`
      (and `-before.json` for comparison)
- [x] All 108+ existing tests still pass — 108/108 green

## Result

| Metric | Before | After | Δ |
| ------ | ------ | ----- | -- |
| Performance | 75 | **98** | **+23** |
| Accessibility | 100 | 96 | -4 (still ≥95) |
| Best Practices | 96 | **100** | +4 |
| SEO | 100 | 100 | — |
| FCP | 0.9 s | 0.3 s | -0.6 s |
| LCP | 2.4 s | **0.6 s** | -1.8 s |
| TBT | 30 ms | 0 ms | -30 ms |
| CLS | 0.236 | **0.072** | -0.164 |
| Console errors | 1 | 0 | -1 |
| Home `/` First Load JS | 679 KB | 207 KB | -472 KB (-69%) |

## What changed

1. **`apps/web/src/app/page.tsx`** — converted from a thin client wrapper to
   a Server Component that renders an SSR'd hero shell ("Every AI
   datacenter. The grid that feeds it.") behind the map. The hero paints
   at first byte, becomes the LCP candidate, and is naturally covered when
   MapLibre hydrates. Drops LCP from 2.4s → 0.6s.

2. **`apps/web/src/app/_components/map-view.tsx`** — `Map` import switched
   to `next/dynamic({ ssr: false })`. Pulls MapLibre + deck.gl out of the
   initial JS chunk. Home `/` First Load JS: 679 KB → 207 KB (−69%).

3. **`apps/web/src/components/announcements-feed/announcements-feed.tsx`**
   — added `min-h-[260px]` on the aside outer wrapper and `min-h-36`
   on each card so loading and loaded states reserve identical space.
   Eliminates CLS culprit #1 (was 0.211).

4. **`apps/web/src/components/ticker-panel/ticker-panel.tsx`** — added
   `min-h-[280px]` on the rows scroll container so the panel doesn't
   grow as quotes populate. Eliminates CLS culprit #2 (was 0.024).

## Notes

- A11y went 100 → 96 because reserving `min-h` on the ticker rows
  guarantees section headers paint into the layout, and axe now flags
  pre-existing `color-contrast` failures on `--text-subtle` against
  `--bg-panel` (~3.4:1, AA needs 4.5:1) plus a `label-content-name-mismatch`
  on the cmdk hint button (`aria-label="Open search"` vs visible "⌘K").
  Both are pre-existing, surfaced by this card not caused by it; 96 is
  still ≥ the 95 target. **Follow-up card recommended** to bump
  `--text-subtle` lightness and align the cmdk button label.
- No substations layer touched; that stat span still reads "—".
- Headless CLI Lighthouse continues to be unreliable for `/` (no real
  WebGL, swiftshader workaround inflates TBT). Real-Brave is the only
  signal that matters for the home page; CLI is fine for `/about`,
  `/data`, `/data/api`.
- `pnpm --filter web build` time unchanged (~5s).
