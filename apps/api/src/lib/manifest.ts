/**
 * Typed reader for the artifact manifest published alongside the
 * download files in R2.
 *
 * The manifest is the single source of truth the API and downloads UI
 * consult to render filename → size / sha256 / license. Re-deriving any
 * of those from the file body would make /downloads slow and would
 * surface licensing claims out of step with what was actually uploaded.
 *
 * Schema mirrors `opendc/schemas.py::ArtifactEntry`. When task 015
 * lands, this type can be replaced by the generated declaration.
 */

import { readArtifact, type ArtifactsBindings } from './r2';

/** Where `opendc publish` writes the manifest in R2 (and on disk in dev). */
export const MANIFEST_KEY = 'v1/manifest.json';

export type ArtifactRecord = {
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

export type ArtifactManifest = {
  artifacts: Record<string, ArtifactRecord>;
};

/**
 * Fetch the artifact manifest from R2 (or the dev fallback).
 * Returns `null` if the manifest hasn't been published yet — the API
 * routes treat that as "downloads not yet available", not an error.
 */
export async function readManifest(
  env: ArtifactsBindings
): Promise<ArtifactManifest | null> {
  const text = await readArtifact(env, MANIFEST_KEY);
  if (text === null) return null;
  // JSON.parse throws on malformed input; we let it propagate so a
  // corrupted manifest surfaces as a 500 instead of an empty UI.
  const parsed = JSON.parse(text) as Partial<ArtifactManifest>;
  return { artifacts: parsed.artifacts ?? {} };
}
