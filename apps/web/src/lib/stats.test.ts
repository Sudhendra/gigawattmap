import { describe, expect, it } from 'vitest';
import type { AiCampusFeature } from '@/components/map/layers/datacenters-layer';
import { computeViewportStats, type Bbox } from './stats';

function feature(
  id: string,
  lon: number,
  lat: number,
  mw: number,
  operator: string,
): AiCampusFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {
      id,
      name: id,
      operator,
      tenant: 't',
      tier: 'hyperscale',
      est_mw_mid: mw,
      status: 'operational',
      country: 'US',
    },
  };
}

const WORLD: Bbox = [-180, -90, 180, 90];

describe('computeViewportStats', () => {
  it('returns zeros when no features are provided', () => {
    expect(computeViewportStats([], WORLD)).toEqual({
      dcCount: 0,
      totalMw: 0,
      operatorCount: 0,
    });
  });

  it('counts only features within the bbox (inclusive bounds)', () => {
    const features = [
      feature('a', -100, 40, 100, 'Meta'), // inside
      feature('b', 100, 40, 200, 'Meta'), // outside
      feature('c', -50, 0, 50, 'Google'), // edge of US-ish bbox
    ];
    const usBbox: Bbox = [-125, 24, -66, 50];
    const stats = computeViewportStats(features, usBbox);
    expect(stats.dcCount).toBe(1);
    expect(stats.totalMw).toBe(100);
    expect(stats.operatorCount).toBe(1);
  });

  it('sums MW and counts distinct operators across the visible set', () => {
    const features = [
      feature('a', -100, 40, 100, 'Meta'),
      feature('b', -101, 41, 200, 'Meta'),
      feature('c', -99, 39, 50, 'Google'),
      feature('d', -98, 38, 300, 'Amazon'),
    ];
    const stats = computeViewportStats(features, WORLD);
    expect(stats.dcCount).toBe(4);
    expect(stats.totalMw).toBe(650);
    expect(stats.operatorCount).toBe(3);
  });

  it('handles bboxes that cross the antimeridian', () => {
    const features = [
      feature('fiji', 178, -17, 100, 'TelcoFJ'), // west of antimeridian
      feature('hawaii', -157, 21, 200, 'Hawaiian Telecom'), // east of antimeridian
      feature('uk', 0, 51, 50, 'Equinix'), // far outside
    ];
    // Pacific-spanning bbox: west=170, east=-100 means longitudes >=170 OR <=-100
    const pacific: Bbox = [170, -30, -100, 60];
    const stats = computeViewportStats(features, pacific);
    expect(stats.dcCount).toBe(2); // fiji and hawaii
    expect(stats.totalMw).toBe(300);
    expect(stats.operatorCount).toBe(2);
  });

  it('skips features with non-finite MW when summing', () => {
    const features = [
      feature('a', -100, 40, Number.NaN, 'Meta'),
      feature('b', -100, 40, 500, 'Meta'),
    ];
    const stats = computeViewportStats(features, WORLD);
    expect(stats.dcCount).toBe(2);
    expect(stats.totalMw).toBe(500);
  });
});
