import { describe, it, expect } from 'vitest';
import type { Announcement } from '@gigawattmap/types';
import {
  selectAnnouncementsForCampus,
  tickerForOperator,
} from './intelligence-card-helpers';

const A = (over: Partial<Announcement>): Announcement => ({
  id: over.id ?? 'a',
  title: over.title ?? 't',
  category: over.category ?? 'deal',
  date: over.date ?? '2026-01-01',
  source_url: over.source_url ?? 'https://example.com',
  ...over,
});

describe('selectAnnouncementsForCampus', () => {
  it('returns matches by datacenter_id, newest first', () => {
    const items = [
      A({ id: '1', date: '2026-01-01', datacenter_id: 'crusoe-abilene-tx' }),
      A({ id: '2', date: '2026-03-01', datacenter_id: 'crusoe-abilene-tx' }),
      A({ id: '3', date: '2026-02-01', datacenter_id: 'other-site' }),
    ];
    const out = selectAnnouncementsForCampus(items, 'crusoe-abilene-tx', null, 3);
    expect(out.map((a) => a.id)).toEqual(['2', '1']);
  });

  it('also matches by operator_id when datacenter_id does not match', () => {
    const items = [
      A({ id: '1', date: '2026-01-01', operator_id: 'crusoe' }),
      A({ id: '2', date: '2026-02-01', datacenter_id: 'crusoe-abilene-tx' }),
      A({ id: '3', date: '2026-03-01', operator_id: 'meta' }),
    ];
    const out = selectAnnouncementsForCampus(items, 'crusoe-abilene-tx', 'crusoe', 5);
    expect(out.map((a) => a.id)).toEqual(['2', '1']);
  });

  it('deduplicates when an announcement matches both keys', () => {
    const items = [
      A({
        id: '1',
        date: '2026-01-01',
        datacenter_id: 'crusoe-abilene-tx',
        operator_id: 'crusoe',
      }),
    ];
    const out = selectAnnouncementsForCampus(items, 'crusoe-abilene-tx', 'crusoe', 3);
    expect(out).toHaveLength(1);
  });

  it('respects the limit', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      A({ id: String(i), date: `2026-01-${String(i + 1).padStart(2, '0')}`, operator_id: 'meta' }),
    );
    expect(selectAnnouncementsForCampus(items, null, 'meta', 3)).toHaveLength(3);
  });

  it('returns empty when both keys are null', () => {
    const items = [A({ id: '1', operator_id: 'meta' })];
    expect(selectAnnouncementsForCampus(items, null, null, 3)).toEqual([]);
  });

  it('returns empty when nothing matches', () => {
    const items = [A({ id: '1', operator_id: 'meta' })];
    expect(selectAnnouncementsForCampus(items, 'nope', 'nobody', 3)).toEqual([]);
  });
});

describe('tickerForOperator', () => {
  it('resolves a hyperscaler display name to its ticker', () => {
    expect(tickerForOperator('Microsoft')).toBe('MSFT');
    expect(tickerForOperator('Google')).toBe('GOOGL');
    expect(tickerForOperator('Amazon')).toBe('AMZN');
    expect(tickerForOperator('Meta')).toBe('META');
    expect(tickerForOperator('Oracle')).toBe('ORCL');
  });

  it('resolves neoclouds and REITs', () => {
    expect(tickerForOperator('CoreWeave')).toBe('CRWV');
    expect(tickerForOperator('Equinix')).toBe('EQIX');
  });

  it('prefers the direct hyperscaler ticker when an operator appears under multiple', () => {
    // "Amazon" is listed under both AMZN (direct) and TLN (offtake).
    // Direct ownership wins.
    expect(tickerForOperator('Amazon')).toBe('AMZN');
  });

  it('returns null for operators with no public ticker', () => {
    expect(tickerForOperator('Crusoe')).toBe(null);
  });

  it('returns null for empty / unknown', () => {
    expect(tickerForOperator('')).toBe(null);
    expect(tickerForOperator('Some Random Op')).toBe(null);
  });
});
