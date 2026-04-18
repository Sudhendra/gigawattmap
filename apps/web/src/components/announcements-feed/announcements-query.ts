'use client';

import type { Announcement } from '@gigawattmap/types';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';
import { ANNOUNCEMENTS_URL } from '@/lib/env';

const ANNOUNCEMENTS_SEED_URL = '/seed/announcements.json';
const CAMPUSES_URL = '/seed/ai-campuses.geojson';

export const ANNOUNCEMENTS_STALE_TIME_MS = 60 * 60 * 1000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}

export function fetchAnnouncements(): Promise<Announcement[]> {
  return fetchJson<Announcement[]>(ANNOUNCEMENTS_URL ?? ANNOUNCEMENTS_SEED_URL);
}

export function fetchCampusSeed(): Promise<AiCampusCollection> {
  return fetchJson<AiCampusCollection>(CAMPUSES_URL);
}
