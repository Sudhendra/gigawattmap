import { describe, expect, it } from 'vitest';
import { groupBySection } from './group-by-section';
import { TICKERS, TICKER_SECTIONS } from '@/lib/ticker-map';

describe('groupBySection', () => {
  const grouped = groupBySection();

  it('returns a bucket for every section', () => {
    for (const section of TICKER_SECTIONS) {
      expect(grouped[section]).toBeInstanceOf(Array);
    }
  });

  it('partitions every ticker into exactly one section', () => {
    const total = TICKER_SECTIONS.reduce(
      (sum, section) => sum + grouped[section].length,
      0,
    );
    expect(total).toBe(TICKERS.length);
  });

  it('places each ticker into its declared section', () => {
    for (const section of TICKER_SECTIONS) {
      for (const ticker of grouped[section]) {
        expect(ticker.section).toBe(section);
      }
    }
  });

  it('preserves the source order within a section', () => {
    const reitsFromSource = TICKERS.filter((t) => t.section === 'reits').map(
      (t) => t.symbol,
    );
    expect(grouped.reits.map((t) => t.symbol)).toEqual(reitsFromSource);
  });
});
