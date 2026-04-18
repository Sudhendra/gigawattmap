import { describe, expect, it } from 'vitest';
import { readArtifact, type ArtifactsBindings } from './r2';

/**
 * In-memory R2 bucket stand-in. R2's binding surface is a tiny subset of
 * the full S3 API; for download-style reads we only need `get(key)`. The
 * stub returns objects whose `arrayBuffer()` and `text()` mirror the
 * runtime semantics so consumers don't see any divergence.
 */
function createBucket(entries: Record<string, string>): R2Bucket {
  return {
    async get(key: string) {
      const value = entries[key];
      if (value === undefined) return null;
      const buf = new TextEncoder().encode(value).buffer;
      return {
        body: null,
        bodyUsed: false,
        async arrayBuffer() {
          return buf;
        },
        async text() {
          return value;
        },
        async json() {
          return JSON.parse(value);
        },
      } as unknown as R2ObjectBody;
    },
  } as unknown as R2Bucket;
}

describe('readArtifact', () => {
  it('returns the object body when the key is present in R2', async () => {
    const env: ArtifactsBindings = {
      ARTIFACTS: createBucket({
        'v1/downloads/datacenters.geojson': '{"hello":"r2"}',
      }),
    };
    const text = await readArtifact(env, 'v1/downloads/datacenters.geojson');
    expect(text).toBe('{"hello":"r2"}');
  });

  it('returns null when the key is missing', async () => {
    const env: ArtifactsBindings = { ARTIFACTS: createBucket({}) };
    expect(await readArtifact(env, 'v1/downloads/missing.geojson')).toBeNull();
  });

  it('falls back to disk when DEV_ARTIFACT_DIR is set and bucket has no object', async () => {
    // Dev mode: the binding may not be populated locally. The reader
    // checks an injected `devReader` before giving up. The injection
    // seam exists so unit tests don't touch the real filesystem.
    const env: ArtifactsBindings = {
      ARTIFACTS: createBucket({}),
      DEV_ARTIFACT_DIR: '/tmp/nope',
    };
    const text = await readArtifact(env, 'v1/downloads/datacenters.geojson', {
      devReader: async (path) => {
        if (path === '/tmp/nope/v1/downloads/datacenters.geojson') {
          return 'from-disk';
        }
        return null;
      },
    });
    expect(text).toBe('from-disk');
  });

  it('does not call the dev reader when DEV_ARTIFACT_DIR is unset', async () => {
    const env: ArtifactsBindings = { ARTIFACTS: createBucket({}) };
    let called = false;
    const text = await readArtifact(env, 'k', {
      devReader: async () => {
        called = true;
        return 'should-not-happen';
      },
    });
    expect(called).toBe(false);
    expect(text).toBeNull();
  });
});
