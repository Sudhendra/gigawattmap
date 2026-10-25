import { ReleaseError } from './live-release';

type Layer = 'cloud_regions' | 'opposition' | 'cables';
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ReleaseError('Invalid layer data');
  return value as Record<string, unknown>;
}
function position(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    Math.abs(value[0]) <= 180 &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1]) &&
    Math.abs(value[1]) <= 90
  );
}
export function validateSecondaryDataset(value: unknown, layer: Layer): void {
  const collection = record(value);
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features))
    throw new ReleaseError('Invalid layer collection');
  const seen = new Set<string>();
  for (const item of collection.features) {
    const feature = record(item),
      geometry = record(feature.geometry),
      props = record(feature.properties);
    const id = layer === 'cloud_regions' ? `${props.provider}:${props.code}` : props.id;
    if (feature.type !== 'Feature' || typeof id !== 'string' || seen.has(id))
      throw new ReleaseError('Invalid layer feature');
    seen.add(id);
    if (layer === 'cables') {
      if (
        geometry.type !== 'MultiLineString' ||
        !Array.isArray(geometry.coordinates) ||
        !geometry.coordinates.every(
          (line) => Array.isArray(line) && line.length >= 2 && line.every(position),
        ) ||
        typeof props.name !== 'string' ||
        !Array.isArray(props.landing_points)
      )
        throw new ReleaseError('Invalid cable');
    } else if (
      geometry.type !== 'Point' ||
      !position(geometry.coordinates) ||
      (layer === 'cloud_regions'
        ? typeof props.provider !== 'string' ||
          typeof props.code !== 'string' ||
          typeof props.display_name !== 'string'
        : typeof props.jurisdiction !== 'string')
    ) {
      throw new ReleaseError('Invalid layer point');
    }
  }
}
