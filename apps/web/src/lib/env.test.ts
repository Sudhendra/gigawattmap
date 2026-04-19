import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * `process.env.NEXT_PUBLIC_*` values are inlined by Next.js at build time, so
 * we have to reset module cache between tests to re-evaluate the constant.
 */
describe('lib/env', () => {
  const original = process.env.NEXT_PUBLIC_PMTILES_BASE;
  const originalAnnouncements = process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalApiBase = process.env.NEXT_PUBLIC_API_BASE;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_PMTILES_BASE;
    else process.env.NEXT_PUBLIC_PMTILES_BASE = original;

    if (originalAnnouncements === undefined) delete process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL;
    else process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL = originalAnnouncements;

    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;

    if (originalApiBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE;
    else process.env.NEXT_PUBLIC_API_BASE = originalApiBase;
  });

  test('PMTILES_BASE is null when env var is unset', async () => {
    delete process.env.NEXT_PUBLIC_PMTILES_BASE;
    const mod = await import('./env');
    expect(mod.PMTILES_BASE).toBeNull();
    expect(mod.pmtilesUrl('datacenters')).toBeNull();
  });

  test('PMTILES_BASE strips trailing slash', async () => {
    process.env.NEXT_PUBLIC_PMTILES_BASE = 'https://pub-abc.r2.dev/v1/';
    const mod = await import('./env');
    expect(mod.PMTILES_BASE).toBe('https://pub-abc.r2.dev/v1');
  });

  test('pmtilesUrl composes the layer URL with pmtiles:// scheme', async () => {
    process.env.NEXT_PUBLIC_PMTILES_BASE = 'https://pub-abc.r2.dev/v1';
    const mod = await import('./env');
    expect(mod.pmtilesUrl('datacenters')).toBe(
      'pmtiles://https://pub-abc.r2.dev/v1/datacenters.pmtiles',
    );
  });

  test('ANNOUNCEMENTS_URL is null when env var is unset', async () => {
    delete process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL;
    const mod = await import('./env');
    expect(mod.ANNOUNCEMENTS_URL).toBeNull();
  });

  test('ANNOUNCEMENTS_URL strips trailing slash', async () => {
    process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL =
      'https://pub-abc.r2.dev/v1/announcements.json/';
    const mod = await import('./env');
    expect(mod.ANNOUNCEMENTS_URL).toBe('https://pub-abc.r2.dev/v1/announcements.json');
  });

  test('API_BASE is empty string when env var is unset (same-origin in prod)', async () => {
    delete process.env.NEXT_PUBLIC_API_BASE;
    const mod = await import('./env');
    expect(mod.API_BASE).toBe('');
  });

  test('API_BASE strips trailing slash', async () => {
    process.env.NEXT_PUBLIC_API_BASE = 'http://localhost:8787/';
    const mod = await import('./env');
    expect(mod.API_BASE).toBe('http://localhost:8787');
  });

  test('APP_URL falls back to production origin when env var is unset', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const mod = await import('./env');
    expect(mod.APP_URL).toBe('https://gigawattmap.com');
  });

  test('APP_URL strips trailing slash from override', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.gigawattmap.com/';
    const mod = await import('./env');
    expect(mod.APP_URL).toBe('https://preview.gigawattmap.com');
  });
});
