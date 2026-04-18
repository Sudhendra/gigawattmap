import { Hono } from 'hono';
import { readArtifact, type ArtifactsBindings } from '../lib/r2';

/**
 * `/api/v1/announcements` — public read-only feed of curated funding,
 * groundbreaking, and opposition events. Unlike datacenters / powerplants,
 * the artifact is a JSON list (not GeoJSON): announcements may not have
 * a stable geometry of their own — they reference a `datacenter_id`.
 *
 * Query params:
 *   limit     — max rows (default 50, hard cap 500)
 *   category  — exact case-insensitive match against `category`
 *   since     — ISO date (YYYY-MM-DD); rows with `date >= since`
 */

const ARTIFACT_KEY = 'v1/downloads/announcements.json';
const CACHE_HEADER = 'public, max-age=300, stale-while-revalidate=3600';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

type Announcement = {
  id?: unknown;
  date?: unknown;
  category?: unknown;
  [key: string]: unknown;
};

export type AnnouncementsRouterOptions = {
  /** Test seam: skip the in-Worker cache so each test starts fresh. */
  noCache?: boolean;
};

export function createAnnouncementsRouter(
  options: AnnouncementsRouterOptions = {},
): Hono<{ Bindings: ArtifactsBindings }> {
  const router = new Hono<{ Bindings: ArtifactsBindings }>();

  let cached: Announcement[] | null = null;

  async function load(env: ArtifactsBindings): Promise<Announcement[] | null> {
    if (cached && !options.noCache) return cached;
    const text = await readArtifact(env, ARTIFACT_KEY);
    if (text === null) return null;
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    if (!options.noCache) cached = parsed as Announcement[];
    return parsed as Announcement[];
  }

  router.get('/', async (c) => {
    const list = await load(c.env);
    if (list === null) {
      return c.json({ error: 'artifact_unavailable' }, 503);
    }

    const category = (c.req.query('category') ?? '').trim().toLowerCase();
    const since = (c.req.query('since') ?? '').trim();
    const limit = clampLimit(c.req.query('limit'));

    let rows = list;
    if (category) {
      rows = rows.filter((r) => String(r.category ?? '').toLowerCase() === category);
    }
    if (since) {
      rows = rows.filter((r) => String(r.date ?? '') >= since);
    }
    // Sort newest-first by ISO date string (lexicographic = chronological for YYYY-MM-DD).
    rows = [...rows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
    rows = rows.slice(0, limit);

    return c.json(rows, 200, { 'cache-control': CACHE_HEADER });
  });

  return router;
}

function clampLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}
