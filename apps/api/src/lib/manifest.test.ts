import { describe, expect, it } from 'vitest';
import { readManifest, type ArtifactRecord } from './manifest';
import type { ArtifactsBindings } from './r2';

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

const sampleManifest = {
  artifacts: {
    'datacenters.geojson': {
      filename: 'datacenters.geojson',
      size_bytes: 1024,
      sha256: 'a'.repeat(64),
      content_type: 'application/geo+json',
      feature_count: 5,
      license: 'ODbL-1.0',
      license_url: 'https://opendatacommons.org/licenses/odbl/1-0/',
      attribution: '© OpenStreetMap contributors',
      share_alike: true,
      commercial_use: true,
      r2_key: 'v1/downloads/datacenters.geojson',
      r2_url: 'https://pub-xyz.r2.dev/v1/downloads/datacenters.geojson',
      uploaded_at: '2026-04-18T19:00:00Z',
      source_group: 'datacenters',
    },
  },
};

describe('readManifest', () => {
  it('parses the artifacts map from the configured manifest key', async () => {
    const env: ArtifactsBindings = {
      ARTIFACTS: bucketWith({
        'v1/manifest.json': JSON.stringify(sampleManifest),
      }),
    };
    const manifest = await readManifest(env);
    expect(manifest).not.toBeNull();
    expect(Object.keys(manifest!.artifacts)).toContain('datacenters.geojson');
    const dc: ArtifactRecord | undefined = manifest!.artifacts['datacenters.geojson'];
    expect(dc).toBeDefined();
    expect(dc!.size_bytes).toBe(1024);
    expect(dc!.commercial_use).toBe(true);
  });

  it('returns null when the manifest is missing', async () => {
    const env: ArtifactsBindings = { ARTIFACTS: bucketWith({}) };
    expect(await readManifest(env)).toBeNull();
  });

  it('throws when the manifest is malformed JSON', async () => {
    const env: ArtifactsBindings = {
      ARTIFACTS: bucketWith({ 'v1/manifest.json': 'not json' }),
    };
    await expect(readManifest(env)).rejects.toThrow();
  });
});
