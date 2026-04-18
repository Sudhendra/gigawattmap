import { Hono } from 'hono';
import {
  filterFeatureCollection,
  parseBbox,
  type GeoJsonFeatureCollection,
} from '../lib/geojson';
import { readArtifact, type ArtifactsBindings } from '../lib/r2';

/**
 * `/api/v1/datacenters` — public read-only datacenter atlas.
 *
 * The route reads the published `datacenters.geojson` artifact (produced
 * by `opendc publish`) from R2, then applies in-memory bbox / operator /
 * status / limit filters before returning a fresh FeatureCollection.
 *
 * Why in-memory filtering instead of a spatial index: at v1 scale the
 * artifact fits in a few MB and the Worker isolate caches the parsed
 * payload across requests. Adding D1 / spatial DB now would solve a
 * problem we don't have, at the cost of a deploy we'd have to maintain.
 */

const ARTIFACT_KEY = 'v1/downloads/datacenters.geojson';
const CACHE_HEADER = 'public, max-age=300, stale-while-revalidate=3600';
const MAX_LIMIT = 5000;

type DatacenterProperties = {
  id?: unknown;
  operator?: unknown;
  status?: unknown;
  [key: string]: unknown;
};

export type DatacentersRouterOptions = {
  /**
   * Test seam: skip the in-Worker cache so each test starts fresh.
   * In production we keep the cache so repeat callers don't re-parse
   * a multi-MB JSON blob on every request.
   */
  noCache?: boolean;
};

export function createDatacentersRouter(
  options: DatacentersRouterOptions = {},
): Hono<{ Bindings: ArtifactsBindings }> {
  const router = new Hono<{ Bindings: ArtifactsBindings }>();

  let cached: GeoJsonFeatureCollection<DatacenterProperties> | null = null;

  async function load(
    env: ArtifactsBindings,
  ): Promise<GeoJsonFeatureCollection<DatacenterProperties> | null> {
    if (cached && !options.noCache) return cached;
    const text = await readArtifact(env, ARTIFACT_KEY);
    if (text === null) return null;
    const parsed = JSON.parse(text) as GeoJsonFeatureCollection<DatacenterProperties>;
    if (!options.noCache) cached = parsed;
    return parsed;
  }

  router.get('/', async (c) => {
    const fc = await load(c.env);
    if (fc === null) {
      return c.json({ error: 'artifact_unavailable' }, 503);
    }

    const bbox = parseBbox(c.req.query('bbox'));
    const operator = (c.req.query('operator') ?? '').trim().toLowerCase();
    const status = (c.req.query('status') ?? '').trim().toLowerCase();
    const limit = clampLimit(c.req.query('limit'));

    const filtered = filterFeatureCollection(fc, {
      bbox,
      limit,
      predicate: (props) => {
        if (operator) {
          const op = String(props.operator ?? '').toLowerCase();
          if (!op.includes(operator)) return false;
        }
        if (status) {
          const st = String(props.status ?? '').toLowerCase();
          if (st !== status) return false;
        }
        return true;
      },
    });

    return c.json(filtered, 200, { 'cache-control': CACHE_HEADER });
  });

  router.get('/:id', async (c) => {
    const fc = await load(c.env);
    if (fc === null) {
      return c.json({ error: 'artifact_unavailable' }, 503);
    }
    const id = c.req.param('id');
    const found = fc.features.find((f) => String(f.properties.id) === id);
    if (!found) {
      return c.json({ error: 'not_found', id }, 404);
    }
    return c.json(found, 200, { 'cache-control': CACHE_HEADER });
  });

  return router;
}

function clampLimit(raw: string | undefined): number {
  if (!raw) return MAX_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return MAX_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}
