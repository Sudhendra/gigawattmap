import { Hono } from 'hono';
import { readArtifact, type ArtifactsBindings } from '../lib/r2';

/** Each channel is one atomic snapshot. No isolate-lifetime cache: daily updates must appear. */
export function createUpdatesRouter(): Hono<{ Bindings: ArtifactsBindings }> {
  const router = new Hono<{ Bindings: ArtifactsBindings }>();
  router.get('/:channel', async (c) => {
    const channel = c.req.param('channel');
    if (channel !== 'news' && channel !== 'map') return c.json({ error: 'not_found' }, 404);
    try {
      const body = await readArtifact(c.env, `v1/live/${channel}.json`);
      if (body === null) return c.json({ error: 'refresh_unavailable' }, 503);
      const data: unknown = JSON.parse(body);
      if (
        !data ||
        typeof data !== 'object' ||
        !('schema_version' in data) ||
        data.schema_version !== 1 ||
        !('channel' in data) ||
        data.channel !== channel ||
        !('records' in data) ||
        !Array.isArray(data.records) ||
        data.records.length === 0
      ) {
        return c.json({ error: 'invalid_release' }, 503);
      }
      return c.body(body, 200, {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=300',
      });
    } catch {
      return c.json({ error: 'refresh_unavailable' }, 503);
    }
  });
  return router;
}
