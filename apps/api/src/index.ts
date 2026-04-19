import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createTickersRouter, type Env } from './routes/tickers';
import { createDatacentersRouter } from './routes/datacenters';
import { createPowerplantsRouter } from './routes/powerplants';
import { createAnnouncementsRouter } from './routes/announcements';
import { createOpenApiRouter } from './routes/openapi';
import { createOgRouter } from './routes/og';
import { createRateLimit } from './middleware/rate-limit';

/**
 * Worker entrypoint. Routes are mounted under `/api/v1/*`; the front door
 * (Cloudflare Pages or a Worker route in front of `gigawattmap.com`) is
 * responsible for forwarding the right host. Health check at `/healthz`
 * lets uptime monitors poll without burning Finnhub quota.
 *
 * Public-API surface (read-only):
 *   GET /api/v1/datacenters[?bbox&operator&status&limit]
 *   GET /api/v1/datacenters/{id}
 *   GET /api/v1/powerplants[?bbox&fuel_type&min_mw]
 *   GET /api/v1/announcements[?limit&category&since]
 *   GET /api/v1/openapi.json
 *   GET /api/v1/tickers
 *   GET /api/v1/og[?dc|?market]
 *
 * Cross-cutting policy on `/api/v1/*`:
 *   - CORS open to GET (no write endpoints exist).
 *   - 60 req / minute / IP rate limit; 429 + Retry-After when exceeded.
 *   - Healthz lives outside `/api/v1` so probes don't consume the budget.
 */
const app = new Hono<{ Bindings: Env }>();

app.get('/healthz', (c) => c.text('ok'));

// CORS first so the 429 path also gets the header.
app.use(
  '/api/v1/*',
  cors({
    origin: '*',
    allowMethods: ['GET'],
    allowHeaders: ['content-type'],
    maxAge: 86_400,
  }),
);

// Rate limit applies to every public-API call.
app.use(
  '/api/v1/*',
  createRateLimit({ limit: 60, windowSeconds: 60 }),
);

app.route('/api/v1/tickers', createTickersRouter());
app.route('/api/v1/datacenters', createDatacentersRouter());
app.route('/api/v1/powerplants', createPowerplantsRouter());
app.route('/api/v1/announcements', createAnnouncementsRouter());
app.route('/api/v1/openapi.json', createOpenApiRouter());
app.route('/api/v1/og', createOgRouter());

app.notFound((c) => c.json({ error: 'not_found' }, 404));

export default app;
