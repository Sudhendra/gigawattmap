import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTickerFilter } from './toggle';

/**
 * The ticker panel is a *map controller* dressed as a market widget.
 * Tests here cover two things:
 *
 *   1. The toggle-logic helper (`nextTickerFilter`) — pure, easy to assert.
 *   2. Source-level structural guarantees that the affordances added in 041
 *      do not silently regress. We don't run a DOM here (the project's
 *      vitest is configured `environment: 'node'`); source assertions match
 *      the existing testing style (see `intelligence-card.test.ts`).
 */

describe('nextTickerFilter', () => {
  it('sets the filter when nothing is active', () => {
    expect(nextTickerFilter(null, 'EQIX')).toBe('EQIX');
  });

  it('switches the filter when a different symbol is clicked', () => {
    expect(nextTickerFilter('EQIX', 'NVDA')).toBe('NVDA');
  });

  it('clears the filter when the active symbol is clicked again', () => {
    expect(nextTickerFilter('EQIX', 'EQIX')).toBeNull();
  });
});

describe('ticker-panel structural guarantees (041)', () => {
  const source = readFileSync(join(__dirname, 'ticker-panel.tsx'), 'utf8');

  it('renders a one-line subtitle telling users rows filter the map', () => {
    // Whatever the exact wording, the panel must mention "filter" and "map"
    // in close proximity inside the header — the whole point of 041 is that
    // a new visitor finds out what the rows do without hovering.
    expect(source).toMatch(/click .* (?:to )?filter (?:the )?map/i);
  });

  it('renders a clear-filter pill conditional on tickerFilter', () => {
    // The pill is only meaningful when a filter is active. The conditional
    // render keeps the panel uncluttered for first-time visitors.
    expect(source).toMatch(/tickerFilter && /);
    expect(source).toMatch(/aria-label=["']Clear ticker filter["']/);
  });

  it('marks the active row with a leading dot glyph', () => {
    // The bg-elevated highlight disappears when the user scrolls past the
    // active row. The glyph survives scroll.
    expect(source).toMatch(/active \?\s*['"]●['"]/);
  });

  it('marks rows with no editorial map link with a visible dash', () => {
    // WCAG 1.4.1: information conveyed by colour alone is insufficient.
    // The muted text colour was the only signal; now a glyph carries it too.
    expect(source).toMatch(/dimmable && !active/);
    expect(source).toMatch(/['"]–['"]/);
  });
});
