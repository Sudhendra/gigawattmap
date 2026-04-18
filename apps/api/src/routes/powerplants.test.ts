import { describe, expect, it } from 'vitest';
import { createPowerplantsRouter } from './powerplants';
import type { ArtifactsBindings } from '../lib/r2';

const sampleGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-99.7, 32.45] },
      properties: {
        id: 'gem-tx-coal-1',
        name: 'Abilene Coal Plant',
        fuel_type: 'coal',
        capacity_mw: 800,
        operator: 'Acme Power',
        country: 'US',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.0, 37.4] },
      properties: {
        id: 'gem-ca-solar-1',
        name: 'Bay Solar',
        fuel_type: 'solar',
        capacity_mw: 250,
        operator: 'PG&E',
        country: 'US',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.9, 52.37] },
      properties: {
        id: 'gem-nl-gas-1',
        name: 'Amsterdam Gas',
        fuel_type: 'gas',
        capacity_mw: 50,
        operator: 'Vattenfall',
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

describe('GET /api/v1/powerplants', () => {
  it('returns the full FeatureCollection by default with cache header', async () => {
    const router = createPowerplantsRouter();
    const res = await router.request(
      '/',
      {},
      makeEnv({
        'v1/downloads/powerplants.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=300');
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate=3600');
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.type).toBe('FeatureCollection');
    expect(body.features).toHaveLength(3);
  });

  it('filters by bbox', async () => {
    const router = createPowerplantsRouter();
    const res = await router.request(
      '/?bbox=-100,30,-90,40',
      {},
      makeEnv({
        'v1/downloads/powerplants.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(1);
    expect(body.features[0]!.properties.id).toBe('gem-tx-coal-1');
  });

  it('filters by fuel_type (case-insensitive exact match)', async () => {
    const router = createPowerplantsRouter();
    const res = await router.request(
      '/?fuel_type=Solar',
      {},
      makeEnv({
        'v1/downloads/powerplants.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(1);
    expect(body.features[0]!.properties.id).toBe('gem-ca-solar-1');
  });

  it('filters by min_mw (capacity_mw >= threshold)', async () => {
    const router = createPowerplantsRouter();
    const res = await router.request(
      '/?min_mw=200',
      {},
      makeEnv({
        'v1/downloads/powerplants.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(2);
    const ids = body.features.map((f) => f.properties.id).sort();
    expect(ids).toEqual(['gem-ca-solar-1', 'gem-tx-coal-1']);
  });

  it('combines bbox + fuel_type + min_mw filters', async () => {
    const router = createPowerplantsRouter();
    const res = await router.request(
      '/?bbox=-130,30,-110,45&fuel_type=solar&min_mw=100',
      {},
      makeEnv({
        'v1/downloads/powerplants.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(1);
    expect(body.features[0]!.properties.id).toBe('gem-ca-solar-1');
  });

  it('ignores non-numeric min_mw', async () => {
    const router = createPowerplantsRouter();
    const res = await router.request(
      '/?min_mw=banana',
      {},
      makeEnv({
        'v1/downloads/powerplants.geojson': JSON.stringify(sampleGeojson),
      }),
    );
    const body = (await res.json()) as typeof sampleGeojson;
    expect(body.features).toHaveLength(3);
  });

  it('returns 503 when the artifact is missing', async () => {
    const router = createPowerplantsRouter();
    const res = await router.request('/', {}, makeEnv({}));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('artifact_unavailable');
  });
});
