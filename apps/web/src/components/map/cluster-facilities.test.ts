import { expect, it } from 'vitest';
import { clusterFacilities } from './cluster-facilities';
import type { AiCampusFeature } from './layers/datacenters-layer';
const features: AiCampusFeature[] = Array.from({ length: 125 }, (_, i) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [0, 0] },
  properties: {
    id: `site-${i}`,
    name: `Site ${i}`,
    operator: i === 124 ? 'Equinix' : 'Other',
    operator_id: i === 124 ? 'equinix' : null,
    country: 'US',
    region: 'Virginia',
    tenant: '',
    tier: 'colo',
    status: null,
    est_mw_mid: null,
  },
}));
it('finds a facility beyond the first displayed batch and prioritizes company matches without losing context', () => {
  const ordered = clusterFacilities(features, new Set(['Equinix']), '');
  expect(ordered[0]?.properties.id).toBe('site-124');
  expect(ordered).toHaveLength(125);
  expect(clusterFacilities(features, new Set(), 'site-124').map((f) => f.properties.id)).toEqual([
    'site-124',
  ]);
  expect(clusterFacilities(features, new Set(), 'Virginia')).toHaveLength(125);
  expect(clusterFacilities(features, new Set(['equinix']), '')[0]?.properties.id).toBe('site-124');
  expect(features[0]?.properties.id).toBe('site-0');
  expect(clusterFacilities(features, new Set(), 'no such facility')).toEqual([]);
});
