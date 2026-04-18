/**
 * GeoJSON helpers for the public API routes.
 *
 * Routes load the published artifacts as raw text (R2) and parse once
 * per cold start; the helpers here are pure-data transforms over those
 * parsed objects so they're trivial to test and easy to reuse across
 * the datacenter / powerplant / cable / opposition endpoints.
 *
 * We deliberately do NOT pull in `@turf/*` or any geometry library.
 * The two operations we need (point-in-bbox and polygon centroid) are
 * a handful of lines and `turf` would multiply our bundle size.
 */

export type Bbox = [number, number, number, number];

/**
 * GeoJSON shapes. We use loose `Record<string, unknown>` for properties
 * because each artifact has its own property schema (validated upstream
 * by Pydantic) and the API layer doesn't need to re-litigate that.
 */
export type GeoJsonGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] };

export type GeoJsonFeature<Props = Record<string, unknown>> = {
  type: 'Feature';
  geometry: GeoJsonGeometry;
  properties: Props;
};

export type GeoJsonFeatureCollection<Props = Record<string, unknown>> = {
  type: 'FeatureCollection';
  features: GeoJsonFeature<Props>[];
};

/**
 * Parse the bbox query parameter (`lon1,lat1,lon2,lat2`).
 *
 * Returns `null` for missing, malformed, or non-strictly-ordered input.
 * Routes treat `null` as "no bbox filter" (not "no results"), so client
 * typos don't silently empty the response.
 */
export function parseBbox(raw: string | null | undefined): Bbox | null {
  if (!raw) return null;
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 4) return null;
  if (parts.some((n) => !Number.isFinite(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = parts as Bbox;
  if (minLon >= maxLon || minLat >= maxLat) return null;
  return [minLon, minLat, maxLon, maxLat];
}

/**
 * True if the feature's representative point falls inside the bbox.
 *
 * Polygons / lines collapse to their centroid before the check so a
 * dataset of small admin polygons still filters cleanly. This is a
 * deliberate simplification — for v1 we don't care about features that
 * straddle the bbox edge; the lift-and-shift to a real spatial filter
 * lives behind a single function rename.
 */
export function bboxContains(box: Bbox, feature: GeoJsonFeature): boolean {
  const point = representativePoint(feature.geometry);
  if (point === null) return false;
  const [lon, lat] = point;
  const [minLon, minLat, maxLon, maxLat] = box;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

/**
 * One representative `[lon, lat]` for any geometry. Returns `null` for
 * empty / unsupported geometries — bbox filtering then skips them.
 */
function representativePoint(geom: GeoJsonGeometry): [number, number] | null {
  switch (geom.type) {
    case 'Point':
      return geom.coordinates;
    case 'Polygon':
      return ringCentroid(geom.coordinates[0]);
    case 'MultiPolygon':
      return ringCentroid(geom.coordinates[0]?.[0]);
    case 'LineString':
      return ringCentroid(geom.coordinates);
    case 'MultiLineString':
      return ringCentroid(geom.coordinates[0]);
  }
}

function ringCentroid(ring: number[][] | undefined): [number, number] | null {
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    const x = pt[0];
    const y = pt[1];
    if (x === undefined || y === undefined) continue;
    sx += x;
    sy += y;
    n += 1;
  }
  if (n === 0) return null;
  return [sx / n, sy / n];
}

export type FilterOptions<Props = Record<string, unknown>> = {
  bbox?: Bbox | null;
  predicate?: (props: Props, feature: GeoJsonFeature<Props>) => boolean;
  /** Hard cap on returned features. Applied AFTER bbox + predicate. */
  limit?: number;
};

/**
 * Filter a FeatureCollection by bbox + arbitrary predicate, capping
 * the result to `limit`. Returns a new collection so callers can hand
 * it directly to `c.json` without mutating the cached source.
 */
export function filterFeatureCollection<Props = Record<string, unknown>>(
  fc: GeoJsonFeatureCollection<Props>,
  opts: FilterOptions<Props>,
): GeoJsonFeatureCollection<Props> {
  const out: GeoJsonFeature<Props>[] = [];
  const limit = opts.limit ?? Infinity;
  for (const f of fc.features) {
    if (out.length >= limit) break;
    if (opts.bbox && !bboxContains(opts.bbox, f as GeoJsonFeature)) continue;
    if (opts.predicate && !opts.predicate(f.properties, f)) continue;
    out.push(f);
  }
  return { type: 'FeatureCollection', features: out };
}
