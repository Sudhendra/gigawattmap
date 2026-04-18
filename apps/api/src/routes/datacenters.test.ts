import { describe, expect, it } from 'vitest';
import { createDatacentersRouter } from './datacenters';
import type { ArtifactsBindings } from '../lib/r2';

const sampleGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-99.7331, 32.4487] },
      properties: {
        id: 'crusoe-abilene-tx',
        name: 'Stargate I — Abilene',
        operator: 'Crusoe',
        status: 'construction',
        country: 'US',
        est_mw_mid: 1200,
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.0, 37.4] },
      properties: {
        id: 'equinix-sv1',
        name: 'Equinix SV1',
        operator: 'Equinix',
        status: 'operational',
        country: 'US',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.9, 52.37] },
      properties: {
        id: 'crusoe-amsterdam',
        name: 'Crusoe AMS',
        operator: 'Crusoe',
        status: 'planned',
        country: 'NL',
      },
    },
  ],
};

function bucketWith(entries: Record<string, string>): R2Bucket {
  return {
    async get(key: string) {
      const value = entries[key];
      if (value === undefined) return null;
      return {
        async text() {
          return value;
        },
      } as unknown as R2ObjectBody;
    },
  } as unknown as R2Bucket;
}

function makeEnv(entries: Record<string, string>): ArtifactsBindings {
  return { ARTIFACTS: bucketWith(entries) };
}

describe('GET /api/v1/datacenters', () => {
  it('returns the full FeatureCollection by default', async () => {
    const router = createDatacentersRouter();
    const res = await router.request('/', {}, makeEnv({
      'v1/downloads/datacenters.geojson': JSON.stringify(sampleGeojson),
    }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=300');
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate=3600');
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.type).toBe('FeatureCollection');
    expect(body.features).toHaveLength(3);
  });

  it('filters by bbox', async () => {
    const router = createDatacentersRouter();
    // Box around Abilene only.
    const res = await router.request(
      '/?bbox=-100,30,-90,40',
      {},
      makeEnv({
        'v1/downloads/datacenters.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(1);
    expect(body.features[0]!.properties.id).toBe('crusoe-abilene-tx');
  });

  it('filters by operator (case-insensitive)', async () => {
    const router = createDatacentersRouter();
    const res = await router.request(
      '/?operator=crusoe',
      {},
      makeEnv({
        'v1/downloads/datacenters.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(2);
  });

  it('filters by status', async () => {
    const router = createDatacentersRouter();
    const res = await router.request(
      '/?status=operational',
      {},
      makeEnv({
        'v1/downloads/datacenters.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(1);
    expect(body.features[0]!.properties.id).toBe('equinix-sv1');
  });

  it('clamps limit to 5000 and rejects garbage', async () => {
    const router = createDatacentersRouter();
    const res = await router.request(
      '/?limit=2',
      {},
      makeEnv({
        'v1/downloads/datacenters.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(2);
  });

  it('returns 503 when the artifact is missing', async () => {
    const router = createDatacentersRouter();
    const res = await router.request('/', {}, makeEnv({}));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('artifact_unavailable');
  });
});

describe('GET /api/v1/datacenters/:id', () => {
  it('returns one feature by id', async () => {
    const router = createDatacentersRouter();
    const res = await router.request(
      '/equinix-sv1',
      {},
      makeEnv({
        'v1/downloads/datacenters.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { properties: { id: string } };
    expect(body.properties.id).toBe('equinix-sv1');
  });

  it('returns 404 when id is unknown', async () => {
    const router = createDatacentersRouter();
    const res = await router.request(
      '/does-not-exist',
      {},
      makeEnv({
        'v1/downloads/datacenters.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    expect(res.status).toBe(404);
  });
});
