import type { AiCampusFeature } from './layers/datacenters-layer';

/** Search every cluster member; prioritize company matches without hiding context. */
export function clusterFacilities(
  features: readonly AiCampusFeature[],
  operators: ReadonlySet<string>,
  query: string,
): AiCampusFeature[] {
  const needle = query.trim().toLocaleLowerCase();
  return features
    .filter(({ properties: p }) =>
      [p.name, p.operator, p.region, p.country, p.id]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle),
    )
    .sort(
      (a, b) =>
        Number(matchesCompany(b, operators)) - Number(matchesCompany(a, operators)) ||
        a.properties.name.localeCompare(b.properties.name) ||
        a.properties.id.localeCompare(b.properties.id),
    );
}

export function matchesCompany(feature: AiCampusFeature, operators: ReadonlySet<string>): boolean {
  return (
    operators.has(feature.properties.operator) ||
    (typeof feature.properties.operator_id === 'string' &&
      operators.has(feature.properties.operator_id))
  );
}
