import type {
  AiCampusCollection,
  AiCampusFeature,
} from '@/components/map/layers/datacenters-layer';
import { fetchLiveRelease, ReleaseError } from './live-release';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ReleaseError('Invalid map feature');
  return value as Record<string, unknown>;
}

export function parseMapRecords(records: unknown[]): AiCampusCollection {
  const seen = new Set<string>();
  const features = records.map((value): AiCampusFeature => {
    const feature = record(value);
    const geometry = record(feature.geometry);
    const p = record(feature.properties);
    const coordinates = geometry.coordinates;
    if (
      feature.type !== 'Feature' ||
      geometry.type !== 'Point' ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !coordinates.every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
      Math.abs(coordinates[0] as number) > 180 ||
      Math.abs(coordinates[1] as number) > 90 ||
      typeof p.id !== 'string' ||
      !p.id ||
      seen.has(p.id) ||
      typeof p.name !== 'string' ||
      typeof p.operator !== 'string' ||
      typeof p.tenant !== 'string' ||
      typeof p.country !== 'string' ||
      !['hyperscale', 'colo', 'neocloud', 'enterprise'].includes(String(p.tier)) ||
      (p.status !== null &&
        !['operational', 'construction', 'announced', 'blocked'].includes(String(p.status))) ||
      (p.est_mw_mid !== null &&
        (typeof p.est_mw_mid !== 'number' || !Number.isFinite(p.est_mw_mid) || p.est_mw_mid < 0))
    ) {
      throw new ReleaseError('Invalid facility in published map');
    }
    seen.add(p.id);
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coordinates as number[] },
      properties: {
        id: p.id,
        name: p.name,
        operator: p.operator,
        tenant: p.tenant,
        country: p.country,
        tier: p.tier as AiCampusFeature['properties']['tier'],
        status: p.status as AiCampusFeature['properties']['status'],
        est_mw_mid: p.est_mw_mid as number | null,
        operator_id: typeof p.operator_id === 'string' ? p.operator_id : null,
        region: typeof p.region === 'string' ? p.region : null,
        sources: Array.isArray(p.sources)
          ? p.sources.filter((s): s is string => typeof s === 'string')
          : [],
        source_url:
          typeof p.source_url === 'string' && /^https?:\/\//.test(p.source_url)
            ? p.source_url
            : null,
      },
    };
  });
  return { type: 'FeatureCollection', features };
}

export async function fetchMapData(): Promise<{
  data: AiCampusCollection;
  updatedAt: string | null;
}> {
  if (process.env.NODE_ENV !== 'production') {
    const response = await fetch('/seed/ai-campuses.geojson', {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new ReleaseError(`Map seed: ${response.status}`);
    const collection = record(await response.json());
    if (!Array.isArray(collection.features)) throw new ReleaseError('Invalid map seed');
    return { data: parseMapRecords(collection.features), updatedAt: null };
  }
  const release = await fetchLiveRelease('map');
  return { data: parseMapRecords(release.records), updatedAt: release.updated_at };
}
