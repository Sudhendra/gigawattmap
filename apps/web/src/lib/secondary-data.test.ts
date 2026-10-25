import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { validateSecondaryDataset } from './secondary-data';

it('accepts each bundled secondary dataset before enabling its renderer', () => {
  for (const [file, layer] of [
    ['cloud-regions', 'cloud_regions'],
    ['opposition', 'opposition'],
    ['cables', 'cables'],
  ] as const) {
    const data: unknown = JSON.parse(
      readFileSync(join(__dirname, '../../public/seed', `${file}.geojson`), 'utf8'),
    );
    expect(() => validateSecondaryDataset(data, layer)).not.toThrow();
  }
});
it('rejects malformed geometry and incomplete layer responses', () => {
  for (const data of [
    null,
    {},
    {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [999, 999] } },
      ],
    },
  ]) {
    expect(() => validateSecondaryDataset(data, 'cloud_regions')).toThrow();
  }
});
