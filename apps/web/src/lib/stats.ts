import type { AiCampusFeature } from '@/components/map/layers/datacenters-layer';

/** [west, south, east, north] in degrees. May cross the antimeridian (west > east). */
export type Bbox = [number, number, number, number];

export type ViewportStats = {
  dcCount: number;
  /** Sum of est_mw_mid across visible features. NaN values are skipped. */
  totalMw: number;
  operatorCount: number;
};

const ZERO: ViewportStats = { dcCount: 0, totalMw: 0, operatorCount: 0 };

/**
 * True when (lon, lat) lies inside `bbox`. Bbox is inclusive on every edge.
 * Antimeridian-aware: when `west > east`, the box wraps and we accept
 * longitudes >= west OR <= east.
 */
export function pointInBbox(lon: number, lat: number, bbox: Bbox): boolean {
  const [west, south, east, north] = bbox;
  if (lat < south || lat > north) return false;
  return west <= east ? lon >= west && lon <= east : lon >= west || lon <= east;
}

/**
 * Pure reducer. Iterates features once, counting those whose Point geometry
 * falls inside `bbox`, summing finite MW, and tracking distinct operators.
 *
 * O(n) in features × O(1) per feature. Comfortably handles the seed (20)
 * and the OSM-scale dataset (~5k AI-relevant features). When we exceed
 * what client-side filtering can handle, we'll swap this for a spatial
 * index — tracked in task 024's bbox API.
 */
export function computeViewportStats(features: AiCampusFeature[], bbox: Bbox): ViewportStats {
  if (features.length === 0) return ZERO;
  const operators = new Set<string>();
  let dcCount = 0;
  let totalMw = 0;
  for (const f of features) {
    const [lon, lat] = f.geometry.coordinates;
    if (typeof lon !== 'number' || typeof lat !== 'number') continue;
    if (!pointInBbox(lon, lat, bbox)) continue;
    dcCount += 1;
    if (Number.isFinite(f.properties.est_mw_mid)) totalMw += f.properties.est_mw_mid;
    operators.add(f.properties.operator);
  }
  return { dcCount, totalMw, operatorCount: operators.size };
}
