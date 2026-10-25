import type { Announcement, DatasetChange } from '@gigawattmap/types';
import type { AiCampusFeature } from './layers/datacenters-layer';
import { COMPANY_OPERATOR_IDS } from '@/lib/company-operator-ids';
import { companyMatches, selectedOperators } from '@/lib/company-selection';
import { pointInBbox, type Bbox } from '@/lib/stats';

export type ActivityScope = 'all' | 'area' | 'company';
export type ActivityContext = {
  facilities: readonly AiCampusFeature[];
  bbox: Bbox | null;
  ticker: string | null;
  operator: string | null;
};
export type ActivityMembership = {
  areaIds: ReadonlySet<string>;
  companyIds: ReadonlySet<string>;
  operatorIds: ReadonlySet<string>;
};

export function activityMembership(context: ActivityContext): ActivityMembership {
  const targets = selectedOperators(context.ticker, context.operator);
  const operatorIds = new Set<string>();
  if (context.ticker && COMPANY_OPERATOR_IDS[context.ticker])
    operatorIds.add(COMPANY_OPERATOR_IDS[context.ticker]!);
  else if (!context.ticker && context.operator) operatorIds.add(context.operator);
  const companyIds = new Set<string>(),
    areaIds = new Set<string>();
  for (const facility of context.facilities) {
    const p = facility.properties;
    if (companyMatches(facility, targets) || (p.operator_id && operatorIds.has(p.operator_id)))
      companyIds.add(p.id);
    const [lon, lat] = facility.geometry.coordinates;
    if (
      context.bbox &&
      typeof lon === 'number' &&
      typeof lat === 'number' &&
      pointInBbox(lon, lat, context.bbox)
    )
      areaIds.add(p.id);
  }
  return { areaIds, companyIds, operatorIds };
}

export function scopeAnnouncements(
  items: readonly Announcement[],
  scope: ActivityScope,
  membership: ActivityMembership,
): Announcement[] {
  return items.filter(
    (item) =>
      scope === 'all' ||
      (scope === 'area'
        ? !!item.datacenter_id && membership.areaIds.has(item.datacenter_id)
        : (!!item.operator_id && membership.operatorIds.has(item.operator_id)) ||
          (!!item.datacenter_id && membership.companyIds.has(item.datacenter_id))),
  );
}

export function scopeChanges(
  items: readonly DatasetChange[],
  scope: ActivityScope,
  membership: ActivityMembership,
): DatasetChange[] {
  return items.filter(
    (item) =>
      scope === 'all' ||
      (scope === 'area'
        ? membership.areaIds.has(item.facility_id)
        : membership.companyIds.has(item.facility_id)),
  );
}
