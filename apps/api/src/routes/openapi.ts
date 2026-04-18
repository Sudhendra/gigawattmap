import { Hono } from 'hono';

/**
 * `/api/v1/openapi.json` — OpenAPI 3.1 description of the public API.
 *
 * Hand-written rather than auto-generated: the source of truth for our
 * field shapes lives in Pydantic on the data side; the API layer is a
 * thin in-memory filter on top. Hand-writing the spec lets us guarantee
 * `additionalProperties: false` (no leaky types — investor-grade docs)
 * without dragging in a code-gen toolchain.
 *
 * Why a function and not a static import: the served document must
 * include the request's host as a server entry on production deploys.
 * For now the document is static; the indirection keeps a future
 * runtime-aware variant a one-line change.
 */

const CACHE_HEADER = 'public, max-age=300, stale-while-revalidate=3600';

const RATE_LIMIT_HEADERS = {
  'X-RateLimit-Limit': {
    schema: { type: 'integer' },
    description: 'Requests allowed per window (60).',
  },
  'X-RateLimit-Remaining': {
    schema: { type: 'integer' },
    description: 'Requests remaining in the current window.',
  },
  'X-RateLimit-Reset': {
    schema: { type: 'integer' },
    description: 'Epoch seconds at which the current window resets.',
  },
};

const ERROR_429 = {
  description: 'Rate limit exceeded (60 req / minute / IP).',
  headers: {
    'Retry-After': {
      schema: { type: 'integer' },
      description: 'Seconds until the caller may retry.',
    },
  },
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

const ERROR_503 = {
  description: 'Underlying artifact temporarily unavailable.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

const BBOX_PARAM = {
  name: 'bbox',
  in: 'query',
  required: false,
  description: 'Comma-separated `lon_min,lat_min,lon_max,lat_max` filter.',
  schema: { type: 'string', example: '-100,30,-90,40' },
};

const LIMIT_PARAM = {
  name: 'limit',
  in: 'query',
  required: false,
  description: 'Maximum rows returned (clamped server-side).',
  schema: { type: 'integer', minimum: 1, maximum: 5000 },
};

function buildDocument(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Gigawatt Map Public API',
      version: '1.0.0',
      summary: 'Read-only access to AI datacenters, power plants, and announcements.',
      description:
        'A public, rate-limited (60 req/min/IP) JSON API. Datasets are republished from R2; per-source licenses are surfaced via `/api/v1/manifest` and on the website attribution page.',
      license: {
        name: 'Per dataset — see manifest',
        url: 'https://gigawatt.map/about',
      },
      contact: {
        name: 'Gigawatt Map',
        url: 'https://gigawatt.map',
      },
    },
    servers: [
      { url: 'https://api.gigawatt.map', description: 'Production' },
    ],
    paths: {
      '/api/v1/datacenters': {
        get: {
          summary: 'List datacenters as a GeoJSON FeatureCollection',
          parameters: [
            BBOX_PARAM,
            {
              name: 'operator',
              in: 'query',
              required: false,
              description: 'Substring match (case-insensitive) on operator name.',
              schema: { type: 'string' },
            },
            {
              name: 'status',
              in: 'query',
              required: false,
              description: 'Exact match (case-insensitive). One of `operational`, `construction`, `planned`, `announced`.',
              schema: { type: 'string' },
            },
            LIMIT_PARAM,
          ],
          responses: {
            '200': {
              description: 'Filtered FeatureCollection of datacenters.',
              headers: RATE_LIMIT_HEADERS,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DatacenterFeatureCollection' },
                },
              },
            },
            '429': ERROR_429,
            '503': ERROR_503,
          },
        },
      },
      '/api/v1/datacenters/{id}': {
        get: {
          summary: 'Fetch one datacenter by id',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Stable datacenter id (e.g. `crusoe-abilene-tx`).',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'A single GeoJSON Feature.',
              headers: RATE_LIMIT_HEADERS,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DatacenterFeature' },
                },
              },
            },
            '404': {
              description: 'No datacenter with that id.',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Error' } },
              },
            },
            '429': ERROR_429,
            '503': ERROR_503,
          },
        },
      },
      '/api/v1/powerplants': {
        get: {
          summary: 'List power plants as a GeoJSON FeatureCollection',
          parameters: [
            BBOX_PARAM,
            {
              name: 'fuel_type',
              in: 'query',
              required: false,
              description: 'Exact match (case-insensitive). e.g. `coal`, `gas`, `nuclear`, `solar`, `wind`, `hydro`.',
              schema: { type: 'string' },
            },
            {
              name: 'min_mw',
              in: 'query',
              required: false,
              description: 'Minimum nameplate capacity in MW.',
              schema: { type: 'number', minimum: 0 },
            },
            LIMIT_PARAM,
          ],
          responses: {
            '200': {
              description: 'Filtered FeatureCollection of power plants.',
              headers: RATE_LIMIT_HEADERS,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PowerplantFeatureCollection' },
                },
              },
            },
            '429': ERROR_429,
            '503': ERROR_503,
          },
        },
      },
      '/api/v1/announcements': {
        get: {
          summary: 'List recent announcements (funding, groundbreakings, opposition)',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Max rows returned. Default 50, hard cap 500.',
              schema: { type: 'integer', minimum: 1, maximum: 500 },
            },
            {
              name: 'category',
              in: 'query',
              required: false,
              description: 'Exact match (case-insensitive). e.g. `funding`, `groundbreaking`, `opposition`, `expansion`.',
              schema: { type: 'string' },
            },
            {
              name: 'since',
              in: 'query',
              required: false,
              description: 'ISO date `YYYY-MM-DD`; rows with `date >= since`.',
              schema: { type: 'string', format: 'date' },
            },
          ],
          responses: {
            '200': {
              description: 'Announcements sorted newest-first.',
              headers: RATE_LIMIT_HEADERS,
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Announcement' },
                  },
                },
              },
            },
            '429': ERROR_429,
            '503': ERROR_503,
          },
        },
      },
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          additionalProperties: false,
          required: ['error'],
          properties: {
            error: { type: 'string' },
            id: { type: 'string' },
          },
        },
        Point: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'coordinates'],
          properties: {
            type: { type: 'string', enum: ['Point'] },
            coordinates: {
              type: 'array',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 3,
            },
          },
        },
        DatacenterProperties: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'status'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            operator: { type: 'string', nullable: true },
            tenant: { type: 'string', nullable: true },
            tier: { type: 'string', nullable: true },
            est_mw_mid: { type: 'number', nullable: true },
            status: {
              type: 'string',
              enum: ['operational', 'construction', 'planned', 'announced'],
            },
            country: { type: 'string', nullable: true },
            nearest_substation_id: { type: 'string', nullable: true },
            nearest_substation_distance_km: { type: 'number', nullable: true },
            nearest_substation_voltage_kv: { type: 'number', nullable: true },
          },
        },
        DatacenterFeature: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'geometry', 'properties'],
          properties: {
            type: { type: 'string', enum: ['Feature'] },
            geometry: { $ref: '#/components/schemas/Point' },
            properties: { $ref: '#/components/schemas/DatacenterProperties' },
          },
        },
        DatacenterFeatureCollection: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'features'],
          properties: {
            type: { type: 'string', enum: ['FeatureCollection'] },
            features: {
              type: 'array',
              items: { $ref: '#/components/schemas/DatacenterFeature' },
            },
          },
        },
        PowerplantProperties: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'fuel_type'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            fuel_type: { type: 'string' },
            capacity_mw: { type: 'number', nullable: true },
            operator: { type: 'string', nullable: true },
            country: { type: 'string', nullable: true },
            commissioning_year: { type: 'integer', nullable: true },
          },
        },
        PowerplantFeature: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'geometry', 'properties'],
          properties: {
            type: { type: 'string', enum: ['Feature'] },
            geometry: { $ref: '#/components/schemas/Point' },
            properties: { $ref: '#/components/schemas/PowerplantProperties' },
          },
        },
        PowerplantFeatureCollection: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'features'],
          properties: {
            type: { type: 'string', enum: ['FeatureCollection'] },
            features: {
              type: 'array',
              items: { $ref: '#/components/schemas/PowerplantFeature' },
            },
          },
        },
        Announcement: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'date', 'title', 'category', 'source_url'],
          properties: {
            id: { type: 'string' },
            date: { type: 'string', format: 'date' },
            title: { type: 'string' },
            operator_id: { type: 'string', nullable: true },
            datacenter_id: { type: 'string', nullable: true },
            amount_usd: { type: 'number', nullable: true },
            category: { type: 'string' },
            source_url: { type: 'string', format: 'uri' },
            summary: { type: 'string', nullable: true },
          },
        },
      },
    },
  };
}

export function createOpenApiRouter(): Hono {
  const router = new Hono();
  const doc = buildDocument();

  router.get('/', (c) => {
    return c.json(doc, 200, {
      'cache-control': CACHE_HEADER,
      'content-type': 'application/json; charset=utf-8',
    });
  });

  return router;
}
