import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * `process.env.NEXT_PUBLIC_*` values are inlined by Next.js at build time, so
 * we have to reset module cache between tests to re-evaluate the constant.
 */
describe('lib/env', () => {
  const original = process.env.NEXT_PUBLIC_PMTILES_BASE;
  const originalAnnouncements = process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_PMTILES_BASE;
    else process.env.NEXT_PUBLIC_PMTILES_BASE = original;

    if (originalAnnouncements === undefined) delete process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL;
    else process.env.NEXT_PUBLIC_ANNOUNCEMENTS_URL = originalAnnouncements;
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
});
