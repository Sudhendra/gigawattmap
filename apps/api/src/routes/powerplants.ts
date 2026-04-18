import { Hono } from 'hono';
import {
  filterFeatureCollection,
  parseBbox,
  type GeoJsonFeatureCollection,
} from '../lib/geojson';
import { readArtifact, type ArtifactsBindings } from '../lib/r2';

/**
 * `/api/v1/powerplants` — public read-only powerplant atlas.
 *
 * Reads the published `powerplants.geojson` artifact (Global Energy
 * Monitor data, CC BY 4.0) from R2 and applies in-memory bbox /
 * fuel_type / min_mw filters. Same caching rationale as datacenters:
 * Worker isolate caches the parsed payload across requests.
 */

const ARTIFACT_KEY = 'v1/downloads/powerplants.geojson';
const CACHE_HEADER = 'public, max-age=300, stale-while-revalidate=3600';
const MAX_LIMIT = 5000;

type PowerplantProperties = {
  id?: unknown;
  fuel_type?: unknown;
  capacity_mw?: unknown;
  [key: string]: unknown;
};

export type PowerplantsRouterOptions = {
  /** Test seam: skip the in-Worker cache so each test starts fresh. */
  noCache?: boolean;
};

export function createPowerplantsRouter(
  options: PowerplantsRouterOptions = {},
): Hono<{ Bindings: ArtifactsBindings }> {
  const router = new Hono<{ Bindings: ArtifactsBindings }>();

  let cached: GeoJsonFeatureCollection<PowerplantProperties> | null = null;

  async function load(
    env: ArtifactsBindings,
  ): Promise<GeoJsonFeatureCollection<PowerplantProperties> | null> {
    if (cached && !options.noCache) return cached;
    const text = await readArtifact(env, ARTIFACT_KEY);
    if (text === null) return null;
    const parsed = JSON.parse(text) as GeoJsonFeatureCollection<PowerplantProperties>;
    if (!options.noCache) cached = parsed;
    return parsed;
  }

  router.get('/', async (c) => {
    const fc = await load(c.env);
    if (fc === null) {
      return c.json({ error: 'artifact_unavailable' }, 503);
    }

    const bbox = parseBbox(c.req.query('bbox'));
    const fuelType = (c.req.query('fuel_type') ?? '').trim().toLowerCase();
    const minMwRaw = c.req.query('min_mw');
    const minMw = parseMinMw(minMwRaw);
    const limit = clampLimit(c.req.query('limit'));

    const filtered = filterFeatureCollection(fc, {
      bbox,
      limit,
      predicate: (props) => {
        if (fuelType) {
          const ft = String(props.fuel_type ?? '').toLowerCase();
          if (ft !== fuelType) return false;
        }
        if (minMw !== null) {
          const mw = Number(props.capacity_mw);
          if (!Number.isFinite(mw) || mw < minMw) return false;
        }
        return true;
      },
    });

    return c.json(filtered, 200, { 'cache-control': CACHE_HEADER });
  });

  return router;
}

function parseMinMw(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clampLimit(raw: string | undefined): number {
  if (!raw) return MAX_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return MAX_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}
