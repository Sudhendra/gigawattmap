import { describe, expect, it } from 'vitest';
import { createUpdatesRouter } from './updates';
import type { ArtifactsBindings } from '../lib/r2';

function env(getText: () => string | null): ArtifactsBindings {
  return {
    ARTIFACTS: {
      get: async () => {
        const text = getText();
        return text === null ? null : { text: async () => text };
      },
    } as unknown as R2Bucket,
  };
}

describe('live releases', () => {
  it('returns 503 for missing or malformed data instead of a successful empty feed', async () => {
    for (const body of [null, 'invalid', '{}']) {
      const response = await createUpdatesRouter().request(
        '/news',
        {},
        env(() => body),
      );
      expect(response.status).toBe(503);
    }
  });
  it('observes a replacement without restarting the Worker', async () => {
    const router = createUpdatesRouter();
    let title = 'before';
    const bindings = env(() =>
      JSON.stringify({ schema_version: 1, channel: 'news', records: [{ title }] }),
    );
    expect(await (await router.request('/news', {}, bindings)).text()).toContain('before');
    title = 'after';
    const response = await router.request('/news', {}, bindings);
    expect(await response.text()).toContain('after');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
  });
  it('does not accept arbitrary R2 keys', async () => {
    expect(
      (
        await createUpdatesRouter().request(
          '/secrets',
          {},
          env(() => null),
        )
      ).status,
    ).toBe(404);
  });
});
