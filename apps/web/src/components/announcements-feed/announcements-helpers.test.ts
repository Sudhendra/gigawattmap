import { describe, expect, it } from 'vitest';
import {
  announcementLocationHint,
  buildDatacenterNameMap,
  filterAnnouncements,
  type AnnouncementFilters,
} from './announcements-helpers';
import type { Announcement } from '@gigawattmap/types';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '2026-05-01-talen',
    date: '2026-05-01',
    title: 'Talen expands Amazon nuclear arrangement',
    category: 'deal',
    operator_id: 'talen',
    datacenter_id: 'talen-susquehanna-pa',
    amount_usd: 18_000_000_000,
    source_url: 'https://example.com/talen',
    summary: 'Talen expanded its arrangement with Amazon.',
  },
  {
    id: '2026-04-15-meta',
    date: '2026-04-15',
    title: 'Meta breaks ground on Richland phase II',
    category: 'launch',
    operator_id: 'meta',
    datacenter_id: 'meta-richland-parish',
    amount_usd: 1_500_000_000,
    source_url: 'https://example.com/meta',
    summary: 'Meta disclosed a Louisiana expansion.',
  },
  {
    id: '2026-03-01-policy',
    date: '2026-03-01',
    title: 'FERC updates data-center interconnection policy',
    category: 'policy',
    operator_id: null,
    datacenter_id: null,
    amount_usd: null,
    source_url: 'https://example.com/policy',
    summary: 'FERC published a new policy filing.',
  },
];

const FILTERS: AnnouncementFilters = {
  category: 'all',
  operatorId: 'all',
  startDate: '',
  endDate: '',
};

describe('filterAnnouncements', () => {
  it('filters by category, operator, and date range together', () => {
    expect(
      filterAnnouncements(ANNOUNCEMENTS, {
        category: 'deal',
        operatorId: 'talen',
        startDate: '2026-04-01',
        endDate: '2026-05-31',
      }),
    ).toEqual([ANNOUNCEMENTS[0]]);
  });

  it('returns all announcements when every filter is open', () => {
    expect(filterAnnouncements(ANNOUNCEMENTS, FILTERS)).toEqual(ANNOUNCEMENTS);
  });
});

describe('announcementLocationHint', () => {
  const campuses: AiCampusCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-76.01, 40.21] },
        properties: {
          id: 'talen-susquehanna-pa',
          name: 'Talen Susquehanna (AWS)',
          operator: 'talen',
          tenant: 'amazon',
          tier: 'hyperscale',
          est_mw_mid: 1920,
          status: 'operational',
          country: 'US',
        },
      },
    ],
  };
  const datacenterNames = buildDatacenterNameMap(campuses);

  it('prefers the mapped datacenter name when a campus id is known', () => {
    expect(announcementLocationHint(ANNOUNCEMENTS[0], datacenterNames)).toBe(
      'Talen Susquehanna (AWS)',
    );
  });

  it('falls back to the operator slug when no campus lookup exists', () => {
    expect(announcementLocationHint(ANNOUNCEMENTS[1], datacenterNames)).toBe('meta');
  });

  it('returns an industry-wide label for policy items without a site', () => {
    expect(announcementLocationHint(ANNOUNCEMENTS[2], datacenterNames)).toBe('Industry-wide');
  });
});
