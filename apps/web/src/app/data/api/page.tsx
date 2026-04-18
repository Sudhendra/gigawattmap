import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { type Endpoint, EndpointDoc } from './_components/endpoint-doc';

export const metadata = {
  title: 'API — Gigawatt Map',
  description:
    'Public JSON API for the Gigawatt Map dataset. Bbox queries, per-id lookups, free for non-commercial use, 60 req/min/IP.',
};

const API_BASE = 'https://api.gigawattmap.com';

const ENDPOINTS: ReadonlyArray<Endpoint> = [
  {
    method: 'GET',
    path: '/api/v1/datacenters',
    summary: 'List datacenters',
    description:
      'Returns a GeoJSON FeatureCollection of AI campuses, optionally filtered by bbox, operator, status, or limit. Backed by the same merged dataset that powers the map.',
    params: [
      {
        name: 'bbox',
        type: 'string',
        description: 'minLon,minLat,maxLon,maxLat (WGS84). Excludes anything outside the box.',
      },
      {
        name: 'operator',
        type: 'string',
        description: 'Case-insensitive substring match on the operator field.',
      },
      {
        name: 'status',
        type: 'enum',
        description: 'One of operational | construction | announced | blocked.',
      },
      {
        name: 'limit',
        type: 'integer',
        description: 'Cap the result count. Server max 5000.',
      },
    ],
    exampleCurl: `curl '${API_BASE}/api/v1/datacenters?bbox=-100,30,-95,35&limit=10'`,
    exampleResponse: `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-99.7339, 32.4487] },
      "properties": {
        "id": "stargate-i-abilene",
        "name": "Stargate I — Abilene",
        "operator": "OpenAI / Oracle / Crusoe",
        "status": "construction",
        "capacity_mw": 1200,
        "confidence": "high"
      }
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/datacenters/:id',
    summary: 'Single datacenter by id',
    description:
      'Returns a single GeoJSON Feature. 404 when id does not match. Useful for resolving a permalink without scanning the full collection.',
    exampleCurl: `curl '${API_BASE}/api/v1/datacenters/stargate-i-abilene'`,
    exampleResponse: `{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-99.7339, 32.4487] },
  "properties": { "id": "stargate-i-abilene", "name": "Stargate I — Abilene", ... }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/powerplants',
    summary: 'List power plants',
    description:
      'Returns a GeoJSON FeatureCollection of utility-scale power plants from the Global Energy Monitor dataset. Same bbox / status / limit filters as datacenters.',
    params: [
      { name: 'bbox', type: 'string', description: 'minLon,minLat,maxLon,maxLat (WGS84).' },
      { name: 'fuel', type: 'string', description: 'Filter by fuel type, e.g. "gas", "nuclear".' },
      { name: 'limit', type: 'integer', description: 'Cap the result count.' },
    ],
    exampleCurl: `curl '${API_BASE}/api/v1/powerplants?bbox=-100,30,-95,35&fuel=gas'`,
    exampleResponse: `{ "type": "FeatureCollection", "features": [ ... ] }`,
  },
  {
    method: 'GET',
    path: '/api/v1/announcements',
    summary: 'Recent capex announcements',
    description:
      'Returns the curated list of operator capex announcements with source URL and date. Hand-maintained; treat as a reading list, not a high-frequency feed.',
    exampleCurl: `curl '${API_BASE}/api/v1/announcements'`,
    exampleResponse: `[
  {
    "id": "openai-stargate-2024-09",
    "operator": "OpenAI",
    "headline": "OpenAI announces Stargate buildout",
    "source_url": "https://...",
    "announced_at": "2024-09-23"
  }
]`,
  },
  {
    method: 'GET',
    path: '/api/v1/tickers',
    summary: 'Operator → ticker mappings',
    description:
      'Returns the curated mapping from operator names to public-equity tickers. Used by the map ticker overlay; useful for joining capex exposure to listed companies.',
    exampleCurl: `curl '${API_BASE}/api/v1/tickers'`,
    exampleResponse: `{
  "tickers": [
    { "symbol": "MSFT", "operators": ["Microsoft Azure"] },
    { "symbol": "GOOGL", "operators": ["Google Cloud"] }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/openapi.json',
    summary: 'Machine-readable spec',
    description:
      'OpenAPI 3.1 description of every public endpoint. Generate clients with openapi-generator; the document is hand-curated so additionalProperties is always false.',
    exampleCurl: `curl '${API_BASE}/api/v1/openapi.json'`,
    exampleResponse: `{ "openapi": "3.1.0", "info": { "title": "Gigawatt Map API", ... } }`,
  },
];

export default function ApiDocsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-bg-base">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent-focus focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:text-bg-base"
      >
        Skip to content
      </a>
      <AppHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-[80ch] px-4 py-12 font-serif text-text-primary md:py-16"
      >
        <header className="mb-10 border-b border-bg-elevated pb-8">
          <h1 className="font-sans text-3xl font-semibold tracking-tight md:text-4xl">
            API
          </h1>
          <p className="mt-3 font-serif text-base text-text-muted">
            A read-only JSON API over the same dataset you can{' '}
            <Link
              href="/data"
              className="underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
            >
              download wholesale
            </Link>
            . No auth, no API keys; rate-limited per IP. Best for low-volume integrations and
            spot lookups — for analytical workloads, fetch the GeoJSON or CSV directly.
          </p>
        </header>

        <section className="mb-10 grid gap-3 rounded border border-bg-elevated bg-bg-panel px-5 py-4 font-serif text-sm md:grid-cols-2">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-subtle">
              Base URL
            </h2>
            <code className="font-mono text-sm text-text-primary">{API_BASE}</code>
          </div>
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-subtle">
              Rate limit
            </h2>
            <p className="font-mono text-sm text-text-primary">60 requests / minute / IP</p>
          </div>
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-subtle">
              Response cache
            </h2>
            <p className="font-mono text-sm text-text-primary">
              5 min fresh · 1 hr stale-while-revalidate
            </p>
          </div>
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-subtle">
              Spec
            </h2>
            <a
              href={`${API_BASE}/api/v1/openapi.json`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-text-primary underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
            >
              openapi.json
            </a>
          </div>
        </section>

        <section className="mb-10 rounded border border-status-blocked/40 bg-status-blocked/5 px-5 py-4 font-serif text-sm text-text-muted">
          <h2 className="mb-1 font-sans text-sm font-semibold uppercase tracking-widest text-status-blocked">
            License inheritance
          </h2>
          <p>
            API responses inherit the license of the underlying source. Cables endpoints carry
            CC BY-NC-SA 3.0 (non-commercial). OSM-derived data is ODbL (share-alike). See the{' '}
            <Link
              href="/data"
              className="underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
            >
              Data page
            </Link>{' '}
            for the full per-source breakdown.
          </p>
        </section>

        <div className="space-y-10">
          {ENDPOINTS.map((endpoint) => (
            <EndpointDoc key={endpoint.path + endpoint.method} endpoint={endpoint} />
          ))}
        </div>
      </main>
    </div>
  );
}
