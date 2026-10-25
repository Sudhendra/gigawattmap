import { expect, it } from 'vitest';
import {
  companyMatches,
  facilityBounds,
  selectedOperators,
  visibleCompanyFeatures,
} from './company-selection';
import type { AiCampusFeature } from '@/components/map/layers/datacenters-layer';
const facility = (id: string, operator: string, lon: number): AiCampusFeature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lon, 40] },
  properties: {
    id,
    name: id,
    operator,
    operator_id: operator.toLowerCase(),
    country: 'US',
    tenant: '',
    tier: 'colo',
    status: null,
    est_mw_mid: null,
  },
});
const features = [facility('a', 'Equinix', -77), facility('b', 'Other', -120)];
it('isolates exact company matches only when requested and restores context for unlinked tickers', () => {
  const targets = selectedOperators('EQIX', 'other');
  expect(visibleCompanyFeatures(features, targets, true).map((f) => f.properties.id)).toEqual([
    'a',
  ]);
  expect(visibleCompanyFeatures(features, targets, false)).toBe(features);
  expect(visibleCompanyFeatures(features, selectedOperators('TLN', null), true)).toBe(features);
  expect(companyMatches(features[0]!, selectedOperators(null, 'equinix'))).toBe(true);
});
it('fits empty, single and dateline-spanning selections without misleading world bounds', () => {
  expect(facilityBounds([])).toBeNull();
  expect(facilityBounds([features[0]!])).toEqual([
    [-77, 40],
    [-77, 40],
  ]);
  expect(facilityBounds([facility('a', 'A', 179), facility('b', 'A', -179)])).toEqual([
    [179, 40],
    [181, 40],
  ]);
});
