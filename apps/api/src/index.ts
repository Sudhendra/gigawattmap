import { Hono } from 'hono';
import { createTickersRouter, type Env } from './routes/tickers';

/**
 * Worker entrypoint. Routes are mounted under `/api/v1/*`; the front door
 * (Cloudflare Pages or a Worker route in front of `gigawattmap.com`) is
 * responsible for forwarding the right host. Health check at `/healthz`
 * lets uptime monitors poll without burning Finnhub quota.
 */
const app = new Hono<{ Bindings: Env }>();

app.get('/healthz', (c) => c.text('ok'));

app.route('/api/v1/tickers', createTickersRouter());

app.notFound((c) => c.json({ error: 'not_found' }, 404));

export default app;
