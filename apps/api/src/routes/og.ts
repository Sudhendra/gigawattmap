import { Hono } from 'hono';
import { createElement, type CSSProperties, type ReactElement } from 'react';
import { readArtifact, type ArtifactsBindings } from '../lib/r2';

// `workers-og` loads a wasm module at top-level import time. Node's vitest
// pool cannot resolve `.wasm`, so we dynamic-import inside the request
// handler. This keeps `resolveOgRequest` (and the rest of this module's
// types) importable from unit tests without dragging the renderer in.
type ImageResponseCtor = new (
  element: ReactElement,
  options: { width: number; height: number; headers: Record<string, string> },
) => Response;
let cachedImageResponse: ImageResponseCtor | null = null;
async function getImageResponse(): Promise<ImageResponseCtor> {
  if (cachedImageResponse) return cachedImageResponse;
  const mod = (await import('workers-og')) as {
    ImageResponse: ImageResponseCtor;
  };
  cachedImageResponse = mod.ImageResponse;
  return cachedImageResponse;
}

/**
 * `/api/v1/og` — dynamically generated Open Graph card.
 *
 * Variants:
 *   GET /api/v1/og                  → default Gigawatt Map splash
 *   GET /api/v1/og?dc=<id>          → datacenter-specific (name, op, MW)
 *   GET /api/v1/og?market=<slug>    → market-specific
 *
 * Output is always a 1200×630 PNG with content-type image/png. Aggressive
 * caching is safe: the underlying data only changes when the pipeline
 * republishes the datacenters artifact, and OG consumers (Twitter, Slack,
 * LinkedIn) do their own snapshotting on first crawl.
 *
 * Templates intentionally use system fonts on the first iteration. Custom
 * font fetch is the largest perf hit on cold starts; deferring until we
 * decide on the brand face.
 *
 * We split routing/lookup (`resolveOgRequest`) from rendering (the
 * `render*Card` functions) so the routing logic — including the unknown-dc
 * 404 contract — can be unit-tested under Node, while the actual
 * `workers-og` PNG synthesis is verified against `wrangler dev`. workers-og
 * pulls in a wasm module at top-level import which Node's vitest cannot
 * load; isolating it behind the renderer keeps tests fast and meaningful.
 */

const ARTIFACT_KEY = 'v1/downloads/datacenters.geojson';
const CACHE_HEADER = 'public, max-age=86400, s-maxage=3600';

const COLOR_BG = '#0a0b0f';
const COLOR_TEXT = '#e8e8ec';
const COLOR_MUTED = '#8b8b95';
const COLOR_ACCENT = '#7dd3fc';

const FONT_MONO =
  'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace';
const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

type DatacenterProperties = {
  id?: unknown;
  name?: unknown;
  operator?: unknown;
  country?: unknown;
  est_mw_mid?: unknown;
  [key: string]: unknown;
};

type GeoJsonFC = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: DatacenterProperties;
  }>;
};

export type OgRouterOptions = {
  /** Test seam: bypass in-Worker datacenter cache. */
  noCache?: boolean;
};

/**
 * Pure routing/lookup result for an OG request. Renderer-agnostic so the
 * branch logic (which template, what data, what error) is unit-testable
 * without loading the wasm-backed renderer.
 */
export type OgRequestResolution =
  | { kind: 'default' }
  | { kind: 'datacenter'; props: DatacenterProperties }
  | { kind: 'market'; slug: string }
  | { kind: 'not-found-dc'; dc: string };

export async function resolveOgRequest(
  query: { dc?: string | undefined; market?: string | undefined },
  loadDcs: () => Promise<GeoJsonFC | null>,
): Promise<OgRequestResolution> {
  if (query.dc) {
    const fc = await loadDcs();
    const feature = fc?.features.find((f) => String(f.properties.id) === query.dc);
    if (!feature) return { kind: 'not-found-dc', dc: query.dc };
    return { kind: 'datacenter', props: feature.properties };
  }
  if (query.market) {
    return { kind: 'market', slug: query.market };
  }
  return { kind: 'default' };
}

export function createOgRouter(
  options: OgRouterOptions = {},
): Hono<{ Bindings: ArtifactsBindings }> {
  const router = new Hono<{ Bindings: ArtifactsBindings }>();

  let cached: GeoJsonFC | null = null;

  async function loadDcs(env: ArtifactsBindings): Promise<GeoJsonFC | null> {
    if (cached && !options.noCache) return cached;
    const text = await readArtifact(env, ARTIFACT_KEY);
    if (text === null) return null;
    const parsed = JSON.parse(text) as GeoJsonFC;
    if (!options.noCache) cached = parsed;
    return parsed;
  }

  router.get('/', async (c) => {
    const resolution = await resolveOgRequest(
      { dc: c.req.query('dc'), market: c.req.query('market') },
      () => loadDcs(c.env),
    );

    switch (resolution.kind) {
      case 'not-found-dc':
        return c.json({ error: 'not_found', dc: resolution.dc }, 404);
      case 'datacenter':
        return await renderDatacenterCard(resolution.props);
      case 'market':
        return await renderMarketCard(resolution.slug);
      case 'default':
        return await renderDefaultCard();
    }
  });

  return router;
}

// --- Templates --------------------------------------------------------------

async function renderDefaultCard(): Promise<Response> {
  const ImageResponse = await getImageResponse();
  const tree = div(
    rootStyle(),
    div(
      {
        fontFamily: FONT_MONO,
        fontSize: 96,
        fontWeight: 700,
        color: COLOR_TEXT,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
      },
      'GIGAWATT MAP',
    ),
    div(
      {
        marginTop: 28,
        fontFamily: FONT_SANS,
        fontSize: 36,
        color: COLOR_MUTED,
        lineHeight: 1.25,
        maxWidth: 920,
      },
      'Every AI datacenter and the grid that feeds it.',
    ),
    wordmarkFooter(),
  );

  return new ImageResponse(tree, imageOptions());
}

async function renderDatacenterCard(p: DatacenterProperties): Promise<Response> {
  const ImageResponse = await getImageResponse();
  const name = String(p.name ?? 'Unnamed facility');
  const operator = String(p.operator ?? 'Unknown operator');
  const country = String(p.country ?? '');
  const mw =
    typeof p.est_mw_mid === 'number' && Number.isFinite(p.est_mw_mid)
      ? `~${Math.round(p.est_mw_mid)} MW`
      : null;

  const subtitleParts = [operator, mw, country].filter(Boolean) as string[];

  const tree = div(
    rootStyle(),
    div(
      {
        fontFamily: FONT_MONO,
        fontSize: 24,
        color: COLOR_ACCENT,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      },
      'Datacenter',
    ),
    div(
      {
        marginTop: 18,
        fontFamily: FONT_SANS,
        fontSize: 76,
        fontWeight: 700,
        color: COLOR_TEXT,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        maxWidth: 1080,
      },
      name,
    ),
    div(
      {
        marginTop: 28,
        fontFamily: FONT_MONO,
        fontSize: 32,
        color: COLOR_MUTED,
        letterSpacing: '0.02em',
      },
      subtitleParts.join(' · '),
    ),
    wordmarkFooter(),
  );

  return new ImageResponse(tree, imageOptions());
}

async function renderMarketCard(slug: string): Promise<Response> {
  const ImageResponse = await getImageResponse();
  const title = slugToTitle(slug);
  const tree = div(
    rootStyle(),
    div(
      {
        fontFamily: FONT_MONO,
        fontSize: 24,
        color: COLOR_ACCENT,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      },
      'Market',
    ),
    div(
      {
        marginTop: 18,
        fontFamily: FONT_SANS,
        fontSize: 84,
        fontWeight: 700,
        color: COLOR_TEXT,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
      },
      title,
    ),
    wordmarkFooter(),
  );

  return new ImageResponse(tree, imageOptions());
}

// --- Helpers ----------------------------------------------------------------

/**
 * Small wrapper so template code stays readable without a JSX runtime.
 * Accepts a style object, followed by any number of children (strings or
 * elements). Always emits a <div>.
 */
function div(
  style: CSSProperties,
  ...children: Array<ReactElement | string>
): ReactElement {
  return createElement('div', { style }, ...children);
}

function rootStyle(): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    backgroundColor: COLOR_BG,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '80px 90px',
    position: 'relative',
  };
}

function wordmarkFooter(): ReactElement {
  return div(
    {
      position: 'absolute',
      bottom: 60,
      right: 90,
      fontFamily: FONT_MONO,
      fontSize: 22,
      color: COLOR_MUTED,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
    },
    'gigawattmap.com',
  );
}

function imageOptions() {
  return {
    width: 1200,
    height: 630,
    headers: {
      'cache-control': CACHE_HEADER,
    },
  };
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
