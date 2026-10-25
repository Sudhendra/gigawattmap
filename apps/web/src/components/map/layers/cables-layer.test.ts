import { expect, it } from 'vitest';
import { createCablesLayers, type CableCollection } from './cables-layer';

it('reuses cable geometry when only animation time changes', () => {
  const data: CableCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
          ],
        },
        properties: {
          id: 'one',
          name: 'Cable',
          length_km: null,
          capacity_tbps: null,
          rfs_year: null,
          landing_points: [],
        },
      },
    ],
  };
  const first = createCablesLayers(data, { currentTimeMs: 0 });
  const next = createCablesLayers(data, { currentTimeMs: 100 });
  expect(next[0]?.props.data).toBe(first[0]?.props.data);
  const replacement = createCablesLayers({ ...data }, { currentTimeMs: 200 });
  expect(replacement[0]?.props.data).not.toBe(first[0]?.props.data);
});
