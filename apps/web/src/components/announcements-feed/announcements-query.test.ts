import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fetchAnnouncements } from './announcements-query';

beforeEach(() => vi.stubEnv('NODE_ENV', 'production'));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function respond(date: string, url = 'https://example.com/news'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          schema_version: 1,
          channel: 'news',
          updated_at: '2026-10-25T00:00:00Z',
          records: [
            {
              id: 'news-1',
              title: 'Data center news',
              date,
              category: 'news',
              source_url: url,
              source_name: 'Publisher',
            },
          ],
        }),
      ),
    ),
  );
}

it('uses the live feed and preserves publisher attribution without invented metadata', async () => {
  respond('2026-10-24');
  const rows = await fetchAnnouncements();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/updates/news'),
    expect.any(Object),
  );
  expect(rows[0]?.source_name).toBe('Publisher');
  expect(rows[0]?.datacenter_id).toBeNull();
  expect(rows[0]?.amount_usd).toBeNull();
});

it('rejects invalid calendar dates', async () => {
  respond('2026-02-30');
  await expect(fetchAnnouncements()).rejects.toThrow();
});

it('rejects unsafe publisher URLs', async () => {
  respond('2026-10-24', 'javascript:alert(1)');
  await expect(fetchAnnouncements()).rejects.toThrow();
});
