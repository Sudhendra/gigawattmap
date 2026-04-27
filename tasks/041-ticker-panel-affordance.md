# 041 — Ticker panel: communicate the filter affordance

**Status:** todo
**Depends on:** 039 (perf baseline), 040 (a11y baseline)
**Estimate:** 1-2h

## Context

The ticker panel does something unique: clicking a row dims every campus
*not* operated by that company, turning the panel into the bridge between
capital and physical infrastructure ("EQIX → here are Equinix's buildings").

The UI does not communicate any of this. A new visitor sees stock prices,
assumes "market widget", and never discovers the filter behaviour. Per
SPEC.md the ticker is meant to be a *map controller*, not a quote board.

This card adds the missing affordances. It does **not** redesign the panel.

## Acceptance criteria

- [ ] Header subtitle (one line, ≤8 words) under "markets" telling the user
      the rows filter the map. Stays out of the way; smaller than section
      headers; respects the dark editorial tone.
- [ ] When `tickerFilter !== null`, a "clear filter" pill appears at the
      top of the rows scroll container showing the active symbol and an
      `×`. Click clears the filter. Keyboard accessible.
- [ ] Active row keeps its current highlight, but also gets a leading
      `●` (or similar 1-char glyph) so the active state survives even when
      the panel is scrolled past the active row.
- [ ] Rows for tickers with no editorial map link (`tickerHasLinks=false`)
      get a visible `–` glyph (or muted dash) at the end of the row, in
      addition to the existing tooltip. The dash uses `--text-subtle` (now
      AA-passing per 040) so it is reliably perceivable, not just a
      hover-only secret.
- [ ] All existing tests still pass; new behaviour is covered by tests in
      `ticker-panel.test.tsx` (the file does not exist yet — create it):
      - clicking a row sets the filter
      - clicking the active row clears the filter
      - clicking the "clear filter" pill clears the filter
      - rows without links render the dash glyph
- [ ] Real Brave Lighthouse on `/`: no regression
      (Perf ≥90, A11y ≥95, BP ≥95, SEO ≥95).
- [ ] Visual sanity check at desktop + 768px width — the panel does not
      grow taller than `max-h-[60vh]`, the new pill does not push rows
      offscreen.

## Files to touch

- `apps/web/src/components/ticker-panel/ticker-panel.tsx` — header
  subtitle, active-filter pill, active-row glyph, dimmed-row dash
- `apps/web/src/components/ticker-panel/ticker-panel.test.tsx` (new) —
  behaviour tests
- (No store changes; `tickerFilter` already lives in `useMapStore`.)

## Notes

- **Out of scope** (write follow-up cards if needed):
  - Top-level "filtering: EQIX" badge in the map HUD itself
  - Operator-name display next to the symbol on the active row
  - URL persistence (`?ticker=EQIX`) — already half-supported via
    `operatorFilter`; merging the two pathways is its own task
- The dash glyph is intentionally a glyph, not a colour change — colour
  alone is insufficient for a11y per WCAG 1.4.1.
- Keep the new copy short. The panel is intentionally dense; one line of
  microcopy is the whole budget.
- Don't introduce new colours. Reuse `--text-subtle` (newly AA-compliant
  via 040) and `--accent-focus` for the pill's interactive state.
