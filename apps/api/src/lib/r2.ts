/**
 * R2 artifact reader for the public Gigawatt Map API.
 *
 * Production reads from the `ARTIFACTS` R2 binding. In local dev (where
 * a wrangler R2 binding may be empty), if the env exposes
 * `DEV_ARTIFACT_DIR`, the reader falls back to the on-disk pipeline
 * output at `<DEV_ARTIFACT_DIR>/<key>`. This lets `wrangler dev` serve
 * fresh `opendc` output without needing to run `opendc publish` first.
 *
 * The dev reader is injected (rather than imported from `node:fs`) so
 * the module stays edge-runtime-clean and unit tests can exercise the
 * fallback without touching the filesystem.
 */

export type ArtifactsBindings = {
  ARTIFACTS: R2Bucket;
  /** Absolute path to the local pipeline `out/` directory; dev only. */
  DEV_ARTIFACT_DIR?: string;
};

export type ReadArtifactOptions = {
  /**
   * Filesystem reader injected by tests / the dev runtime. Returns the
   * file contents as text, or null if the file is missing.
   */
  devReader?: (path: string) => Promise<string | null>;
};

/**
 * Fetch one published artifact's body as text. Returns `null` for misses
 * — callers map that to a 404. Other errors propagate so we don't
 * silently serve empty bodies on transient R2 failures.
 */
export async function readArtifact(
  env: ArtifactsBindings,
  key: string,
  options: ReadArtifactOptions = {}
): Promise<string | null> {
  const object = await env.ARTIFACTS.get(key);
  if (object !== null) {
    return object.text();
  }
  if (env.DEV_ARTIFACT_DIR && options.devReader) {
    const path = joinPath(env.DEV_ARTIFACT_DIR, key);
    return options.devReader(path);
  }
  return null;
}

function joinPath(dir: string, key: string): string {
  // R2 keys never start with a leading slash; just normalise the trailing
  // slash on the dev dir so the join result is unambiguous.
  const trimmed = dir.endsWith('/') ? dir.slice(0, -1) : dir;
  return `${trimmed}/${key}`;
}
