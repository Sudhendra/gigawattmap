import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createRateLimit, type RateLimitStore } from './rate-limit';

/**
 * In-memory store under test is built into the middleware. These tests
 * inject a controlled clock so we don't sleep through real seconds, and
 * exercise both under-limit / over-limit / window-reset paths.
 */

function makeApp(opts: {
  limit: number;
  windowSeconds: number;
  now: () => number;
  store?: RateLimitStore;
}): Hono {
  const app = new Hono();
  app.use('*', createRateLimit(opts));
  app.get('/', (c) => c.text('ok'));
  return app;
}

function get(app: Hono, ip = '1.2.3.4'): Promise<Response> {
  return Promise.resolve(
    app.request('/', {
      headers: { 'cf-connecting-ip': ip },
    }),
  );
}

describe('createRateLimit', () => {
  it('allows requests under the limit', async () => {
    let t = 1000;
    const app = makeApp({ limit: 3, windowSeconds: 60, now: () => t });
    expect((await get(app)).status).toBe(200);
    expect((await get(app)).status).toBe(200);
    expect((await get(app)).status).toBe(200);
  });

  it('returns 429 with Retry-After when the limit is exceeded', async () => {
    let t = 1000;
    const app = makeApp({ limit: 2, windowSeconds: 60, now: () => t });
    await get(app);
    await get(app);
    const res = await get(app);
    expect(res.status).toBe(429);
    const retry = res.headers.get('retry-after');
    expect(retry).not.toBeNull();
    // Retry-After is seconds-from-now and must fit in the window.
    const seconds = Number(retry);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(60);
  });

  it('resets the window once it elapses', async () => {
    let t = 1000;
    const app = makeApp({ limit: 1, windowSeconds: 60, now: () => t });
    expect((await get(app)).status).toBe(200);
    expect((await get(app)).status).toBe(429);
    // Advance past the window.
    t += 61_000;
    expect((await get(app)).status).toBe(200);
  });

  it('tracks each IP independently', async () => {
    let t = 1000;
    const app = makeApp({ limit: 1, windowSeconds: 60, now: () => t });
    expect((await get(app, '1.1.1.1')).status).toBe(200);
    expect((await get(app, '2.2.2.2')).status).toBe(200);
    expect((await get(app, '1.1.1.1')).status).toBe(429);
    expect((await get(app, '2.2.2.2')).status).toBe(429);
  });

  it('falls back to a stable key when no IP header is present', async () => {
    let t = 1000;
    const app = new Hono();
    app.use(
      '*',
      createRateLimit({ limit: 1, windowSeconds: 60, now: () => t }),
    );
    app.get('/', (c) => c.text('ok'));
    expect((await app.request('/')).status).toBe(200);
    expect((await app.request('/')).status).toBe(429);
  });
});
