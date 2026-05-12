import { afterEach, describe, expect, it, vi } from 'vitest';
import app from './index';

describe('front-door routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('proxies non-api requests to the Pages deployment', async () => {
    const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
      const url = request instanceof Request ? request.url : String(request);
      return new Response('pages home', {
        status: 200,
        headers: { 'x-upstream-url': url },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await app.request('https://gigawattmap.com/about?source=launch');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('pages home');
    expect(fetchMock).toHaveBeenCalledOnce();
    const upstream = fetchMock.mock.calls[0]?.[0] as Request;
    expect(upstream.url).toBe('https://gigawattmap.pages.dev/about?source=launch');
  });
});
