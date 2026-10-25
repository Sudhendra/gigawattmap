import type { AiCampusFeature } from '@/components/map/layers/datacenters-layer';
import { targetsForTicker } from './ticker-map';

export function selectedOperators(
  ticker: string | null,
  operator: string | null,
): ReadonlySet<string> {
  return ticker ? targetsForTicker(ticker).operators : new Set(operator ? [operator] : []);
}

export function companyMatches(feature: AiCampusFeature, operators: ReadonlySet<string>): boolean {
  return (
    operators.has(feature.properties.operator) ||
    (typeof feature.properties.operator_id === 'string' &&
      operators.has(feature.properties.operator_id))
  );
}

/** An unmapped ticker never hides the entire map or fabricates an exposure relationship. */
export function visibleCompanyFeatures(
  features: AiCampusFeature[],
  operators: ReadonlySet<string>,
  onlyMatches: boolean,
): AiCampusFeature[] {
  return onlyMatches && operators.size > 0
    ? features.filter((feature) => companyMatches(feature, operators))
    : features;
}

/** Use the shortest longitude span so Pacific facilities do not force a whole-world fit. */
export function facilityBounds(
  features: readonly AiCampusFeature[],
): [[number, number], [number, number]] | null {
  const points = features
    .map((f) => f.geometry.coordinates)
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!points.length) return null;
  const longitudes = points.map((p) => ((p[0]! % 360) + 360) % 360).sort((a, b) => a - b);
  let largestGap = -1,
    start = 0;
  for (let i = 0; i < longitudes.length; i++) {
    const gap =
      (i === longitudes.length - 1 ? longitudes[0]! + 360 : longitudes[i + 1]!) - longitudes[i]!;
    if (gap > largestGap) {
      largestGap = gap;
      start = (i + 1) % longitudes.length;
    }
  }
  let west = longitudes[start]!;
  let east = west + 360 - largestGap;
  if (west > 180) {
    west -= 360;
    east -= 360;
  }
  const latitudes = points.map((p) => p[1]!);
  return [
    [west, Math.min(...latitudes)],
    [east, Math.max(...latitudes)],
  ];
}
