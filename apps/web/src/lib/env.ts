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
 * Build a full PMTiles URL for a given layer name (e.g. `'datacenters'`),
 * or `null` if no base is configured. Callers should fall back to seed data
 * when this returns `null`.
 */
export function pmtilesUrl(layer: string): string | null {
  if (!PMTILES_BASE) return null;
  return `pmtiles://${PMTILES_BASE}/${layer}.pmtiles`;
}
