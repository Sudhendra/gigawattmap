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

  it('Talen does not imply links to every Amazon facility', () => {
    const tln = targetsForTicker('TLN');
    expect(tln.operators.size).toBe(0);
    expect(tln.operators.has('Amazon')).toBe(false);
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

it('counts current operator matches without inferring suppliers or offtakes', async () => {
  const { countLinkedFacilities } = await import('./ticker-map');
  const features = ['Equinix', 'Amazon', 'Equinix', 'Unknown'].map((operator) => ({
    properties: { operator },
  }));
  expect(countLinkedFacilities(features, 'EQIX')).toBe(2);
  expect(countLinkedFacilities(features, 'AMZN')).toBe(1);
  expect(countLinkedFacilities(features, 'NVDA')).toBe(0);
  expect(countLinkedFacilities(features, 'TLN')).toBe(0);
  expect(countLinkedFacilities([], 'EQIX')).toBe(0);
});

it('joins live canonical operator IDs even when display names differ from editorial aliases', async () => {
  const { countLinkedFacilities } = await import('./ticker-map');
  const features = [{ properties: { operator: 'Amazon Web Services', operator_id: 'amazon' } }];
  expect(countLinkedFacilities(features, 'AMZN')).toBe(1);
  expect(targetsForTicker('AMZN').operators.has('amazon')).toBe(true);
  expect(countLinkedFacilities(features, 'TLN')).toBe(0);
});
