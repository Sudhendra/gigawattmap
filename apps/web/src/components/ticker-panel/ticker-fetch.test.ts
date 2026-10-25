import { expect, it, vi } from 'vitest';

it('fetches production quotes from the deployed Worker, not a developer server', async () => {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_API_BASE', 'http://localhost:8787');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]')));
  try {
    const { fetchTickers } = await import('./ticker-query');
    await fetchTickers();
    expect(fetch).toHaveBeenCalledWith('/api/v1/tickers', expect.any(Object));
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});
