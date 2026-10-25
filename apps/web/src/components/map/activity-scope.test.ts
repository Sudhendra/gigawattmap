import { expect, it } from 'vitest';
import type { Announcement, DatasetChange } from '@gigawattmap/types';
import type { AiCampusFeature } from './layers/datacenters-layer';
import { activityMembership, scopeAnnouncements, scopeChanges } from './activity-scope';
const facility = (
  id: string,
  operator: string,
  operator_id: string,
  lon: number,
): AiCampusFeature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lon, 40] },
  properties: {
    id,
    name: id,
    operator,
    operator_id,
    country: 'US',
    tenant: '',
    tier: 'colo',
    status: null,
    est_mw_mid: null,
  },
});
const features = [
  facility('east', 'Equinix', 'equinix', 179),
  facility('west', 'Equinix', 'equinix', -179),
  facility('amazon', 'Amazon Web Services', 'amazon', -77),
];
const news = (id: string, extra: Partial<Announcement> = {}): Announcement => ({
  id,
  title: 'Equinix Amazon Talen NVIDIA in the headline',
  date: '2026-10-25',
  category: 'news',
  source_url: 'https://example.com',
  ...extra,
});
const items = [
  news('direct', { datacenter_id: 'east' }),
  news('operator', { operator_id: 'equinix' }),
  news('unlinked'),
  news('missing', { datacenter_id: 'removed' }),
  news('amazon', { operator_id: 'amazon' }),
  news('talen', { operator_id: 'talen' }),
];
it('uses explicit geographic links and handles the dateline without assigning company stories to every location', () => {
  const m = activityMembership({
    facilities: features,
    bbox: [178, 30, 182, 50],
    ticker: 'EQIX',
    operator: null,
  });
  expect([...m.areaIds]).toEqual(['east', 'west']);
  expect(scopeAnnouncements(items, 'area', m).map((i) => i.id)).toEqual(['direct']);
  expect(scopeAnnouncements(items, 'company', m).map((i) => i.id)).toEqual(['direct', 'operator']);
  expect(scopeAnnouncements(items, 'all', m)).toEqual(items);
});
it('returns no company/area matches with no selection or viewport and never guesses from titles', () => {
  const m = activityMembership({ facilities: features, bbox: null, ticker: null, operator: null });
  expect(scopeAnnouncements(items, 'company', m)).toEqual([]);
  expect(scopeAnnouncements(items, 'area', m)).toEqual([]);
});
it('supports company IDs independently of mapped facilities without adding supplier links', () => {
  const talen = activityMembership({
    facilities: features,
    bbox: null,
    ticker: 'TLN',
    operator: null,
  });
  expect(scopeAnnouncements(items, 'company', talen).map((i) => i.id)).toEqual(['talen']);
  expect(talen.companyIds.size).toBe(0);
  const amazon = activityMembership({
    facilities: features,
    bbox: null,
    ticker: 'AMZN',
    operator: null,
  });
  expect([...amazon.companyIds]).toEqual(['amazon']);
  const nvidia = activityMembership({
    facilities: features,
    bbox: null,
    ticker: 'NVDA',
    operator: null,
  });
  expect(scopeAnnouncements(items, 'company', nvidia)).toEqual([]);
});
it('scopes dataset changes by current facility membership independently of news', () => {
  const m = activityMembership({
    facilities: features,
    bbox: [178, 30, 182, 50],
    ticker: 'EQIX',
    operator: null,
  });
  const events: DatasetChange[] = ['east', 'amazon', 'removed'].map((facility_id) => ({
    id: facility_id,
    facility_id,
    facility_name: facility_id,
    detected_at: '2026-10-25T00:00:00Z',
    kind: 'added',
    fields: [],
    sources: ['osm'],
  }));
  expect(scopeChanges(events, 'company', m).map((i) => i.id)).toEqual(['east']);
  expect(scopeChanges(events, 'area', m).map((i) => i.id)).toEqual(['east']);
});
