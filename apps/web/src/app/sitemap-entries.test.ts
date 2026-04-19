import { describe, expect, it } from 'vitest';
import { buildSitemapEntries } from './sitemap-entries';

describe('buildSitemapEntries', () => {
  const appUrl = 'https://gigawattmap.com';
  const now = new Date('2026-04-18T12:00:00Z');

  it('emits one entry per public route', () => {
    const entries = buildSitemapEntries(appUrl, now);
    const paths = entries.map((e) => new URL(e.url).pathname);
    expect(paths).toEqual(['/', '/about', '/data', '/data/api', '/news']);
  });

  it('uses the supplied appUrl as origin and a deterministic lastModified', () => {
    const entries = buildSitemapEntries(appUrl, now);
    for (const e of entries) {
      expect(e.url.startsWith(appUrl)).toBe(true);
      expect(e.lastModified).toBe(now);
      expect(e.changeFrequency).toBeDefined();
      expect(typeof e.priority).toBe('number');
    }
  });

  it('marks the home page highest priority', () => {
    const entries = buildSitemapEntries(appUrl, now);
    const home = entries.find((e) => e.url === `${appUrl}/`);
    expect(home?.priority).toBe(1.0);
  });

  it('rejects an appUrl with a trailing slash', () => {
    expect(() => buildSitemapEntries('https://gigawattmap.com/', now)).toThrow(
      /trailing slash|end with/i,
    );
  });
});
