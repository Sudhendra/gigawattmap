import type { Announcement, AnnouncementCategory } from '@gigawattmap/types';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';

export type AnnouncementFilters = {
  category: AnnouncementCategory | 'all';
  operatorId: string | 'all';
  startDate: string;
  endDate: string;
};

export function buildDatacenterNameMap(data: AiCampusCollection | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!data) return out;
  for (const feature of data.features) {
    out.set(feature.properties.id, feature.properties.name);
  }
  return out;
}

export function filterAnnouncements(
  announcements: Announcement[],
  filters: AnnouncementFilters,
): Announcement[] {
  return announcements.filter((announcement) => {
    if (filters.category !== 'all' && announcement.category !== filters.category) return false;
    if (filters.operatorId !== 'all' && announcement.operator_id !== filters.operatorId) return false;
    if (filters.startDate && announcement.date < filters.startDate) return false;
    if (filters.endDate && announcement.date > filters.endDate) return false;
    return true;
  });
}

export function announcementLocationHint(
  announcement: Announcement,
  datacenterNames: ReadonlyMap<string, string>,
): string {
  const datacenterId = announcement.datacenter_id ?? null;
  if (datacenterId && datacenterNames.has(datacenterId)) {
    return datacenterNames.get(datacenterId) ?? 'Unknown site';
  }
  if (announcement.operator_id) return announcement.operator_id.replaceAll('-', ' ');
  return 'Industry-wide';
}
