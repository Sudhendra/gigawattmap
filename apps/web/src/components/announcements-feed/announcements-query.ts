'use client';

import type { Announcement } from '@gigawattmap/types';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';
import { ANNOUNCEMENTS_URL } from '@/lib/env';
import { fetchLiveRelease, ReleaseError } from '@/lib/live-release';

const ANNOUNCEMENTS_SEED_URL = '/seed/announcements.json';
const CAMPUSES_URL = '/seed/ai-campuses.geojson';

export const ANNOUNCEMENTS_STALE_TIME_MS = 60 * 60 * 1000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (process.env.NODE_ENV !== 'production') {
    return fetchJson<Announcement[]>(ANNOUNCEMENTS_URL ?? ANNOUNCEMENTS_SEED_URL);
  }
  const release = await fetchLiveRelease('news');
  return release.records.map((value) => {
    if (!value || typeof value !== 'object') throw new ReleaseError('Invalid news entry');
    const row = value as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      typeof row.title !== 'string' ||
      typeof row.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !Number.isFinite(Date.parse(row.date)) ||
      new Date(row.date).toISOString().slice(0, 10) !== row.date ||
      typeof row.source_url !== 'string' ||
      !/^https?:\/\//.test(row.source_url) ||
      !['news', 'deal', 'launch', 'milestone', 'policy', 'opposition'].includes(
        String(row.category),
      )
    ) {
      throw new ReleaseError('Invalid news entry');
    }
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      source_url: row.source_url,
      category: row.category as Announcement['category'],
      source_name: typeof row.source_name === 'string' ? row.source_name : null,
      summary: typeof row.summary === 'string' ? row.summary : null,
      operator_id: typeof row.operator_id === 'string' ? row.operator_id : null,
      datacenter_id: typeof row.datacenter_id === 'string' ? row.datacenter_id : null,
      amount_usd:
        typeof row.amount_usd === 'number' && Number.isFinite(row.amount_usd)
          ? row.amount_usd
          : null,
    };
  });
}

export function fetchCampusSeed(): Promise<AiCampusCollection> {
  return fetchJson<AiCampusCollection>(CAMPUSES_URL);
}
