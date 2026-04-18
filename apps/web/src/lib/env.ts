/**
 * Public env access. Centralised so we don't sprinkle `process.env` lookups
 * across components and so future env additions get one obvious home.
 *
 * Anything starting with `NEXT_PUBLIC_` is inlined into the client bundle by
 * Next.js at build time; do not put secrets here.
 */

/**
 * Base URL of the PMTiles archive directory on R2 (no trailing slash).
 *
 * Example: `https://pub-<hash>.r2.dev/v1`. When unset the map falls back to
 * the bundled seed GeoJSON, which is what we want in local dev before R2 is
 * provisioned.
 */
export const PMTILES_BASE: string | null =
  process.env.NEXT_PUBLIC_PMTILES_BASE?.replace(/\/+$/, '') || null;

/**
 * Full public URL of the announcements JSON artifact on R2.
 *
 * When unset the UI falls back to the bundled seed JSON, which keeps local
 * development file-based before public artifact hosting is configured.
 */
export const ANNOUNCEMENTS_URL: string | null =
  process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL?.replace(/\/+$/, '') || null;

/**
 * Full public URL of the search-index JSON artifact on R2.
 *
 * Built by `opendc build-index`; consumed by the Cmd+K palette via
 * TanStack Query. When unset the palette falls back to the bundled seed
 * JSON at `/seed/search-index.json` so local dev keeps working.
 */
export const SEARCH_INDEX_URL: string | null =
  process.env.NEXT_PUBLIC_SEARCH_INDEX_URL?.replace(/\/+$/, '') || null;

/**
 * Full public URL of the publish manifest on R2.
 *
 * Written by `opendc publish` (data-pipeline) and read at build time by
 * the `/data` and `/data/api` pages. The manifest enumerates every
 * downloadable artifact with size, sha256, license, and the public URL
 * to fetch it. When unset, those pages render an empty-state notice
 * instead of failing the build, which keeps local dev unblocked before
 * R2 is provisioned.
 */
export const MANIFEST_URL: string | null =
  process.env.NEXT_PUBLIC_MANIFEST_URL?.replace(/\/+$/, '') || null;

/**
 * Build a full PMTiles URL for a given layer name (e.g. `'datacenters'`),
 * or `null` if no base is configured. Callers should fall back to seed data
 * when this returns `null`.
 */
export function pmtilesUrl(layer: string): string | null {
  if (!PMTILES_BASE) return null;
  return `pmtiles://${PMTILES_BASE}/${layer}.pmtiles`;
}
