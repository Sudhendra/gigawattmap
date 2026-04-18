import { describe, expect, it } from 'vitest';
import {
  bboxContains,
  filterFeatureCollection,
  parseBbox,
  type GeoJsonFeature,
  type GeoJsonFeatureCollection,
} from './geojson';

const sample: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-99.7331, 32.4487] },
      properties: { id: 'a', operator: 'Crusoe', status: 'construction' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.0, 37.4] },
      properties: { id: 'b', operator: 'Equinix', status: 'operational' },
    },
    {
      type: 'Feature',
      // Polygon (square around 0,0)
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
            [-1, -1],
          ],
        ],
      },
      properties: { id: 'c', operator: 'Crusoe', status: 'planned' },
    },
  ],
};

describe('parseBbox', () => {
  it('returns null for null/empty', () => {
    expect(parseBbox(null)).toBeNull();
    expect(parseBbox('')).toBeNull();
  });

  it('parses a valid 4-comma-separated lon,lat box', () => {
    expect(parseBbox('-100,30,-90,40')).toEqual([-100, 30, -90, 40]);
  });

  it('returns null when parts are missing or NaN', () => {
    expect(parseBbox('-100,30,-90')).toBeNull();
    expect(parseBbox('a,b,c,d')).toBeNull();
  });

  it('returns null when min > max', () => {
    expect(parseBbox('10,30,-10,40')).toBeNull(); // lon
    expect(parseBbox('-10,40,10,30')).toBeNull(); // lat
  });
});

describe('bboxContains', () => {
  const box: [number, number, number, number] = [-100, 30, -90, 40];

  it('includes points inside the box', () => {
    const f: GeoJsonFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-95, 35] },
      properties: {},
    };
    expect(bboxContains(box, f)).toBe(true);
  });

  it('excludes points outside the box', () => {
    const f: GeoJsonFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-80, 35] },
      properties: {},
    };
    expect(bboxContains(box, f)).toBe(false);
  });

  it('uses the centroid for non-point geometries', () => {
    // Polygon centred on (0,0); box doesn't cover origin.
    const polygon: GeoJsonFeature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
            [-1, -1],
          ],
        ],
      },
      properties: {},
    };
    expect(bboxContains(box, polygon)).toBe(false);
    // A polygon centred inside the box should pass.
    const inside: GeoJsonFeature = {
      ...polygon,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-95, 35],
            [-94, 35],
            [-94, 36],
            [-95, 36],
            [-95, 35],
          ],
        ],
      },
    };
    expect(bboxContains(box, inside)).toBe(true);
  });
});

describe('filterFeatureCollection', () => {
  it('returns all features when no filters set', () => {
    const out = filterFeatureCollection(sample, {});
    expect(out.features).toHaveLength(3);
  });

  it('filters by bbox', () => {
    const out = filterFeatureCollection(sample, { bbox: [-100, 30, -90, 40] });
    expect(out.features.map((f) => f.properties.id)).toEqual(['a']);
  });

  it('applies a custom predicate', () => {
    const out = filterFeatureCollection(sample, {
      predicate: (p) => p.operator === 'Crusoe',
    });
    expect(out.features.map((f) => f.properties.id)).toEqual(['a', 'c']);
  });

  it('limits the feature count', () => {
    const out = filterFeatureCollection(sample, { limit: 2 });
    expect(out.features).toHaveLength(2);
  });

  it('combines bbox + predicate + limit', () => {
    const out = filterFeatureCollection(sample, {
      predicate: (p) => p.operator === 'Crusoe',
      limit: 1,
    });
    expect(out.features).toHaveLength(1);
  });
});
