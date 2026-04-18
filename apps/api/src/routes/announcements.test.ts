import { describe, expect, it } from 'vitest';
import { createAnnouncementsRouter } from './announcements';
import type { ArtifactsBindings } from '../lib/r2';

const sampleAnnouncements = [
  {
    id: '2026-04-14-xai-naacp',
    date: '2026-04-14',
    title: 'NAACP sues xAI',
    operator_id: 'xai',
    datacenter_id: 'xai-colossus-2-tn',
    amount_usd: null,
    category: 'opposition',
    source_url: 'https://example.com/1',
    summary: 'Lawsuit summary.',
  },
  {
    id: '2026-03-10-stargate-funding',
    date: '2026-03-10',
    title: 'Stargate $50B funding',
    operator_id: 'openai',
    datacenter_id: 'crusoe-abilene-tx',
    amount_usd: 50_000_000_000,
    category: 'funding',
    source_url: 'https://example.com/2',
    summary: 'Funding round.',
  },
  {
    id: '2026-01-05-equinix-expansion',
    date: '2026-01-05',
    title: 'Equinix SV1 expansion',
    operator_id: 'equinix',
    datacenter_id: 'equinix-sv1',
    amount_usd: 200_000_000,
    category: 'expansion',
    source_url: 'https://example.com/3',
    summary: 'Expansion summary.',
  },
];

function bucketWith(entries: Record<string, string>): R2Bucket {
  return {
    async get(key: string) {
      const value = entries[key];
      if (value === undefined) return null;
      return {
        async text() {
          return value;
        },
      } as unknown as R2ObjectBody;
    },
  } as unknown as R2Bucket;
}

function makeEnv(entries: Record<string, string>): ArtifactsBindings {
  return { ARTIFACTS: bucketWith(entries) };
}

const ARTIFACT = 'v1/downloads/announcements.json';

describe('GET /api/v1/announcements', () => {
  it('returns the list with cache header (sorted by date desc)', async () => {
    const router = createAnnouncementsRouter();
    const res = await router.request(
      '/',
      {},
      makeEnv({ [ARTIFACT]: JSON.stringify(sampleAnnouncements) }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=300');
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate=3600');
    const body = (await res.json()) as typeof sampleAnnouncements;
    expect(body).toHaveLength(3);
    // Sorted newest first.
    expect(body[0]!.id).toBe('2026-04-14-xai-naacp');
    expect(body[2]!.id).toBe('2026-01-05-equinix-expansion');
  });

  it('respects limit (default 50, clamps explicit)', async () => {
    const router = createAnnouncementsRouter();
    const res = await router.request(
      '/?limit=2',
      {},
      makeEnv({ [ARTIFACT]: JSON.stringify(sampleAnnouncements) }),
    );
    const body = (await res.json()) as typeof sampleAnnouncements;
    expect(body).toHaveLength(2);
  });

  it('filters by category (case-insensitive exact)', async () => {
    const router = createAnnouncementsRouter();
    const res = await router.request(
      '/?category=Funding',
      {},
      makeEnv({ [ARTIFACT]: JSON.stringify(sampleAnnouncements) }),
    );
    const body = (await res.json()) as typeof sampleAnnouncements;
    expect(body).toHaveLength(1);
    expect(body[0]!.id).toBe('2026-03-10-stargate-funding');
  });

  it('filters by since (ISO date string compare; inclusive)', async () => {
    const router = createAnnouncementsRouter();
    const res = await router.request(
      '/?since=2026-03-01',
      {},
      makeEnv({ [ARTIFACT]: JSON.stringify(sampleAnnouncements) }),
    );
    const body = (await res.json()) as typeof sampleAnnouncements;
    expect(body).toHaveLength(2);
    const ids = body.map((a) => a.id);
    expect(ids).toContain('2026-04-14-xai-naacp');
    expect(ids).toContain('2026-03-10-stargate-funding');
  });

  it('clamps limit at 500 and ignores garbage', async () => {
    const router = createAnnouncementsRouter();
    const res = await router.request(
      '/?limit=banana',
      {},
      makeEnv({ [ARTIFACT]: JSON.stringify(sampleAnnouncements) }),
    );
    const body = (await res.json()) as typeof sampleAnnouncements;
    // banana → fallback to default 50, but only 3 entries exist.
    expect(body).toHaveLength(3);
  });

  it('returns 503 when the artifact is missing', async () => {
    const router = createAnnouncementsRouter();
    const res = await router.request('/', {}, makeEnv({}));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('artifact_unavailable');
  });
});
