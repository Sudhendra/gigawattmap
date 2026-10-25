import { expect, it } from 'vitest';
import { prepareFacilities } from './native-facilities';
import type { AiCampusCollection } from './layers/datacenters-layer';

const data: AiCampusCollection = {
  type: 'FeatureCollection',
  features: ['Equinix', 'Amazon', 'Unknown'].map((operator, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [i, 0] },
    properties: {
      id: String(i),
      name: operator,
      operator,
      operator_id: operator.toLowerCase(),
      tenant: '',
      country: 'US',
      tier: 'colo',
      status: null,
      est_mw_mid: null,
    },
  })),
};
it('carries matching counts into clusters without hiding other facilities or mutating data', () => {
  const before = JSON.stringify(data);
  expect(
    prepareFacilities(data, new Set(['Equinix'])).features.map((f) => f.properties.matched),
  ).toEqual([1, 0, 0]);
  expect(
    prepareFacilities(data, new Set(['equinix'])).features.map((f) => f.properties.matched),
  ).toEqual([1, 0, 0]);
  expect(prepareFacilities(data, new Set()).features.map((f) => f.properties.matched)).toEqual([
    1, 1, 1,
  ]);
  expect(JSON.stringify(data)).toBe(before);
});
