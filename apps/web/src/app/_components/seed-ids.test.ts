/**
 * Guards that every id in the curated AI campus seed overlay
 * (`public/seed/ai-campuses.geojson`) resolves to a feature in the canonical
 * datacenter artifact (`data-pipeline/out/datacenters.geojson`).
 *
 * Why: the map overlay is loaded client-side and feeds dc ids into
 * `/api/v1/og?dc=…`. If a seed id drifts from the artifact, the OG endpoint
 * 404s when users open the share modal for that campus. See task 038.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type FeatureCollection = {
  features: Array<{ properties: { id: string; name: string } }>;
};

const repoRoot = resolve(process.cwd(), '..', '..');
const seed = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/seed/ai-campuses.geojson'), 'utf8'),
) as FeatureCollection;
const artifact = JSON.parse(
  readFileSync(resolve(repoRoot, 'data-pipeline/out/datacenters.geojson'), 'utf8'),
) as FeatureCollection;

describe('seed campus ids resolve to canonical artifact', () => {
  const artifactIds = new Set(artifact.features.map((f) => f.properties.id));

  it.each(seed.features.map((f) => [f.properties.id, f.properties.name]))(
    '%s (%s) exists in canonical artifact',
    (id) => {
      expect(artifactIds.has(id)).toBe(true);
    },
  );
});
