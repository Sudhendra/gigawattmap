/**
 * Build-time fetch + typing for the publish manifest produced by
 * `opendc publish` (data-pipeline). The `/data` and `/data/api` pages
 * are server-rendered and pre-fetch this once at build, so a stale R2
 * manifest cannot break a running deploy.
 *
 * The manifest schema lives in `data-pipeline/opendc/schemas.py`
 * (`ArtifactEntry`, `ArtifactManifest`); the TypeScript shape here is
 * hand-mirrored for now and validated at parse time. Once task 015
 * lands (Pydantic → TS codegen), this file imports the generated type
 * and `parseManifest` becomes a thin runtime check.
 */

export type ArtifactEntry = {
  filename: string;
  size_bytes: number;
  sha256: string;
  content_type: string;
  feature_count: number;
  license: string;
  license_url: string;
  attribution: string;
  share_alike: boolean;
  commercial_use: boolean;
  r2_key: string;
  r2_url: string;
  uploaded_at: string;
  source_group: string;
};

export type Manifest = {
  artifacts: Record<string, ArtifactEntry>;
  updated_at: string;
};

const REQUIRED_ARTIFACT_FIELDS: ReadonlyArray<keyof ArtifactEntry> = [
  'filename',
  'size_bytes',
  'sha256',
  'content_type',
  'feature_count',
  'license',
  'license_url',
  'attribution',
  'share_alike',
  'commercial_use',
  'r2_key',
  'r2_url',
  'uploaded_at',
  'source_group',
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate the raw JSON returned from R2 against the manifest contract.
 *
 * We validate at the boundary so the rest of the codebase can treat
 * `Manifest` as trustworthy. A malformed manifest is a publish bug; the
 * page should refuse to render rather than ship missing license fields
 * to the public.
 */
export function parseManifest(raw: unknown): Manifest {
  if (!isRecord(raw)) {
    throw new Error('manifest: payload must be an object');
  }
  const artifacts = raw['artifacts'];
  if (!isRecord(artifacts)) {
    throw new Error('manifest: missing or invalid `artifacts` map');
  }
  for (const [filename, entry] of Object.entries(artifacts)) {
    if (!isRecord(entry)) {
      throw new Error(`manifest: artifact ${filename} is not an object`);
    }
    for (const field of REQUIRED_ARTIFACT_FIELDS) {
      if (!(field in entry)) {
        throw new Error(`manifest: artifact ${filename} missing field ${field}`);
      }
    }
  }
  const updated_at =
    typeof raw['updated_at'] === 'string' ? (raw['updated_at'] as string) : '';
  return {
    artifacts: artifacts as Record<string, ArtifactEntry>,
    updated_at,
  };
}

/**
 * Fetch the manifest from R2 at build time. Throws on HTTP failure or
 * malformed payload. Pages should catch and render an empty state when
 * `MANIFEST_URL` is unset (local dev).
 *
 * Uses `force-cache` so Next treats the call as a static data dependency
 * and prerenders the consuming route. The publish job invalidates by
 * triggering a fresh deploy, not by HTTP cache headers.
 */
export async function fetchManifest(url: string): Promise<Manifest> {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) {
    throw new Error(`manifest: fetch failed (${res.status} ${res.statusText})`);
  }
  const json: unknown = await res.json();
  return parseManifest(json);
}

export type ArtifactGroup = {
  source: string;
  artifacts: ArtifactEntry[];
};

/**
 * Group artifacts by `source_group` preserving the order in which
 * groups first appear. Within a group, artifacts keep their original
 * insertion order — the manifest's writer (publish.py iterates
 * `PUBLICATION_CATALOG`) controls the canonical ordering.
 */
export function groupArtifactsBySource(manifest: Manifest): ArtifactGroup[] {
  const groups = new Map<string, ArtifactEntry[]>();
  for (const artifact of Object.values(manifest.artifacts)) {
    const bucket = groups.get(artifact.source_group);
    if (bucket) {
      bucket.push(artifact);
    } else {
      groups.set(artifact.source_group, [artifact]);
    }
  }
  return Array.from(groups, ([source, artifacts]) => ({ source, artifacts }));
}

/**
 * Format a byte count as a short human string ("49.2 KB", "27.7 MB").
 *
 * Uses binary units (1024) because R2 reports object sizes that way and
 * we want the page number to match what an `aws s3 ls` user would see.
 * One decimal place keeps the column tight without losing precision for
 * the 50-200 MB artifacts users will actually download.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'] as const;
  let value = bytes / 1024;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx += 1;
  }
  // 1 decimal place; trim trailing ".0" for cleaner display.
  const fixed = value.toFixed(1);
  const trimmed = fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  return `${trimmed} ${units[unitIdx]}`;
}
