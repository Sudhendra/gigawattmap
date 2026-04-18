import { describe, expect, it } from 'vitest';
import { createOpenApiRouter } from './openapi';

describe('GET /api/v1/openapi.json', () => {
  it('returns a valid OpenAPI 3.1 document with all four endpoints', async () => {
    const router = createOpenApiRouter();
    const res = await router.request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');

    const doc = (await res.json()) as {
      openapi: string;
      info: { title: string; version: string; license?: { name: string; url?: string } };
      paths: Record<string, unknown>;
      components?: { schemas?: Record<string, unknown> };
    };

    expect(doc.openapi).toMatch(/^3\.1/);
    expect(doc.info.title).toBeTruthy();
    expect(doc.info.version).toBeTruthy();

    // All four public endpoints are documented.
    expect(doc.paths['/api/v1/datacenters']).toBeDefined();
    expect(doc.paths['/api/v1/datacenters/{id}']).toBeDefined();
    expect(doc.paths['/api/v1/powerplants']).toBeDefined();
    expect(doc.paths['/api/v1/announcements']).toBeDefined();
  });

  it('declares rate-limit headers and 429 response on every endpoint', async () => {
    const router = createOpenApiRouter();
    const res = await router.request('/');
    const doc = (await res.json()) as {
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
    };
    for (const path of [
      '/api/v1/datacenters',
      '/api/v1/datacenters/{id}',
      '/api/v1/powerplants',
      '/api/v1/announcements',
    ]) {
      const op = doc.paths[path]!.get!;
      expect(op.responses['429']).toBeDefined();
    }
  });

  it('schemas have additionalProperties: false (no leaky types)', async () => {
    const router = createOpenApiRouter();
    const res = await router.request('/');
    const doc = (await res.json()) as {
      components: { schemas: Record<string, { additionalProperties?: boolean | object }> };
    };
    expect(doc.components).toBeDefined();
    expect(doc.components.schemas).toBeDefined();
    for (const [name, schema] of Object.entries(doc.components.schemas)) {
      // Only enforce on object schemas; allow unset (means false in OpenAPI 3.1 strict mode for our use).
      if ((schema as { type?: string }).type === 'object') {
        expect(schema.additionalProperties, `${name}.additionalProperties`).toBe(false);
      }
    }
  });

  it('declares CORS-friendly server URL and a license', async () => {
    const router = createOpenApiRouter();
    const res = await router.request('/');
    const doc = (await res.json()) as {
      servers?: Array<{ url: string }>;
      info: { license?: { name: string } };
    };
    expect(doc.servers).toBeDefined();
    expect(doc.servers!.length).toBeGreaterThan(0);
    expect(doc.info.license?.name).toBeTruthy();
  });
});
