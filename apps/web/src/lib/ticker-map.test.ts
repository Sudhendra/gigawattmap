import { describe, expect, it } from 'vitest';
import {
  SECTION_LABEL,
  TICKERS,
  TICKER_META_BY_SYMBOL,
  TICKER_SECTIONS,
  targetsForTicker,
  tickerHasLinks,
} from './ticker-map';

describe('ticker-map', () => {
  it('lists exactly 25 tickers', () => {
    expect(TICKERS).toHaveLength(25);
  });

  it('every ticker has a known section', () => {
    for (const t of TICKERS) {
      expect(TICKER_SECTIONS).toContain(t.section);
    }
  });

  it('every section has a display label', () => {
    for (const s of TICKER_SECTIONS) {
      expect(SECTION_LABEL[s]).toBeTruthy();
    }
  });

  it('symbol lookup matches the array', () => {
    expect(TICKER_META_BY_SYMBOL.size).toBe(TICKERS.length);
    expect(TICKER_META_BY_SYMBOL.get('NVDA')?.name).toBe('NVIDIA');
  });

  it('hyperscalers map to their cloud + operator brands', () => {
    const msft = targetsForTicker('MSFT');
    expect(msft.operators.has('Microsoft')).toBe(true);
    expect(msft.cloudProviders.has('azure')).toBe(true);

    const googl = targetsForTicker('GOOGL');
    expect(googl.cloudProviders.has('gcp')).toBe(true);

    const amzn = targetsForTicker('AMZN');
    expect(amzn.operators.has('Amazon')).toBe(true);
    expect(amzn.cloudProviders.has('aws')).toBe(true);
  });

  it('Talen links Susquehanna and the AWS offtake', () => {
    const tln = targetsForTicker('TLN');
    expect(tln.operators.has('Talen')).toBe(true);
    expect(tln.operators.has('Amazon')).toBe(true);
  });

  it('pure-silicon tickers have no editorial links', () => {
    expect(tickerHasLinks('NVDA')).toBe(false);
    expect(tickerHasLinks('AVGO')).toBe(false);
  });

  it('null ticker yields an empty filter', () => {
    const t = targetsForTicker(null);
    expect(t.operators.size).toBe(0);
    expect(t.cloudProviders.size).toBe(0);
  });
});
