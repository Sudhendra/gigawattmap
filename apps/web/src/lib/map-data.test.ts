import { describe, expect, it } from 'vitest';
import { parseMapRecords } from './map-data';

describe('published map facilities', () => {
  it('accepts non-curated facilities and preserves unknown capacity', () => {
    const data = parseMapRecords([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-77, 39] },
        properties: {
          id: 'osm-way-123',
          name: 'Local facility',
          operator: 'Unknown',
          tenant: '',
          country: 'US',
          tier: 'colo',
          status: null,
          est_mw_mid: null,
        },
      },
    ]);
    expect(data.features[0]?.properties.id).toBe('osm-way-123');
    expect(data.features[0]?.properties.est_mw_mid).toBeNull();
    expect(data.features[0]?.properties.status).toBeNull();
  });
  it('rejects bad coordinates instead of placing a marker at zero', () => {
    expect(() =>
      parseMapRecords([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [181, 0] }, properties: {} },
      ]),
    ).toThrow();
  });
});

it('uses the live release in production rather than bundled seeds', async () => {
  const { vi } = await import('vitest');
  vi.stubEnv('NODE_ENV', 'production');
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          schema_version: 1,
          channel: 'map',
          updated_at: '2026-10-24T00:00:00Z',
          records: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [0, 0] },
              properties: {
                id: 'osm-1',
                name: 'Facility',
                operator: 'Unknown',
                tenant: '',
                country: 'GB',
                tier: 'colo',
                status: null,
                est_mw_mid: null,
              },
            },
          ],
        }),
      ),
    );
  vi.stubGlobal('fetch', fetchMock);
  try {
    const { fetchMapData } = await import('./map-data');
    const result = await fetchMapData();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/v1/updates/map');
    expect(result.data.features).toHaveLength(1);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
