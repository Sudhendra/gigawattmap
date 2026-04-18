/**
 * Tests for the build-time manifest fetcher.
 *
 * Pure logic only — no React, no Next. The page modules adapt these
 * helpers; the helpers themselves stay testable in vitest.
 */

import { describe, expect, it } from 'vitest';
import {
  type ArtifactEntry,
  type Manifest,
  formatBytes,
  groupArtifactsBySource,
  parseManifest,
} from './manifest';

const BASE_ENTRY: ArtifactEntry = {
  filename: 'datacenters.geojson',
  size_bytes: 50_399,
  sha256: 'a'.repeat(64),
  content_type: 'application/geo+json',
  feature_count: 53,
  license: 'ODbL-1.0',
  license_url: 'https://opendatacommons.org/licenses/odbl/1-0/',
  attribution: '© OpenStreetMap contributors',
  share_alike: true,
  commercial_use: true,
  r2_key: 'v1/downloads/datacenters.geojson',
  r2_url: 'https://pub-xyz.r2.dev/v1/downloads/datacenters.geojson',
  uploaded_at: '2026-04-18T22:45:34Z',
  source_group: 'datacenters',
};

describe('parseManifest', () => {
  it('accepts a well-formed manifest with multiple artifacts', () => {
    const raw: Manifest = {
      artifacts: {
        'datacenters.geojson': BASE_ENTRY,
        'cables.geojson': {
          ...BASE_ENTRY,
          filename: 'cables.geojson',
          source_group: 'cables',
          commercial_use: false,
          share_alike: true,
        },
      },
      updated_at: '2026-04-18T22:45:34Z',
    };
    const parsed = parseManifest(raw);
    expect(Object.keys(parsed.artifacts)).toHaveLength(2);
    expect(parsed.artifacts['datacenters.geojson']?.feature_count).toBe(53);
  });

  it('throws on missing artifacts key', () => {
    expect(() => parseManifest({} as unknown)).toThrow(/artifacts/);
  });

  it('throws on a non-object payload', () => {
    expect(() => parseManifest(null)).toThrow();
    expect(() => parseManifest('nope')).toThrow();
  });

  it('throws when an artifact is missing required fields', () => {
    const bad = {
      artifacts: { 'x.geojson': { filename: 'x.geojson' } },
    };
    expect(() => parseManifest(bad)).toThrow(/missing field/);
  });
});

describe('groupArtifactsBySource', () => {
  it('groups by source_group and preserves order within group', () => {
    const m: Manifest = {
      artifacts: {
        'datacenters.geojson': BASE_ENTRY,
        'datacenters.csv': {
          ...BASE_ENTRY,
          filename: 'datacenters.csv',
          content_type: 'text/csv',
        },
        'cables.geojson': {
          ...BASE_ENTRY,
          filename: 'cables.geojson',
          source_group: 'cables',
        },
      },
      updated_at: '2026-04-18T22:45:34Z',
    };
    const grouped = groupArtifactsBySource(m);
    expect(grouped.map((g) => g.source)).toEqual(['datacenters', 'cables']);
    expect(grouped[0]?.artifacts.map((a) => a.filename)).toEqual([
      'datacenters.geojson',
      'datacenters.csv',
    ]);
  });
});

describe('formatBytes', () => {
  it('formats bytes with binary units and one decimal where useful', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(50_399)).toBe('49.2 KB');
    expect(formatBytes(2_300_000)).toBe('2.2 MB');
    expect(formatBytes(29_000_000)).toBe('27.7 MB');
  });
});
