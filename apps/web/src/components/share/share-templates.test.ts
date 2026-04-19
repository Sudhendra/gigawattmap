import { describe, expect, it } from 'vitest';
import {
  buildTweetIntent,
  buildLinkedInIntent,
  buildOgImageUrl,
  buildShareCopy,
  type CampusForShare,
} from './share-templates';

const sampleCampus: CampusForShare = {
  id: 'crusoe-abilene-tx',
  name: 'Stargate I — Abilene',
  operator: 'Crusoe',
  country: 'US',
  est_mw_mid: 1200,
};

describe('buildShareCopy', () => {
  it('formats name, operator, MW, and country', () => {
    expect(buildShareCopy(sampleCampus)).toBe(
      'Just discovered Stargate I — Abilene on @gigawattmap — Crusoe · ~1,200 MW · US',
    );
  });

  it('omits the MW segment when est_mw_mid is null', () => {
    expect(
      buildShareCopy({ ...sampleCampus, est_mw_mid: null }),
    ).toBe(
      'Just discovered Stargate I — Abilene on @gigawattmap — Crusoe · US',
    );
  });

  it('rounds non-integer MW values', () => {
    expect(
      buildShareCopy({ ...sampleCampus, est_mw_mid: 1234.7 }),
    ).toContain('~1,235 MW');
  });
});

describe('buildTweetIntent', () => {
  it('targets twitter.com/intent/tweet with text + url query params', () => {
    const u = new URL(
      buildTweetIntent(sampleCampus, 'https://gigawattmap.com/?dc=crusoe-abilene-tx'),
    );
    expect(u.origin + u.pathname).toBe('https://twitter.com/intent/tweet');
    expect(u.searchParams.get('url')).toBe(
      'https://gigawattmap.com/?dc=crusoe-abilene-tx',
    );
    expect(u.searchParams.get('text')).toBe(buildShareCopy(sampleCampus));
  });

  it('encodes special characters in the share copy', () => {
    // raw URL must contain percent-encoded em dash (U+2014 = %E2%80%94)
    const raw = buildTweetIntent(
      sampleCampus,
      'https://gigawattmap.com/?dc=crusoe-abilene-tx',
    );
    expect(raw).toMatch(/%E2%80%94/i);
  });
});

describe('buildLinkedInIntent', () => {
  it('targets linkedin.com sharing endpoint with the url param', () => {
    const u = new URL(
      buildLinkedInIntent('https://gigawattmap.com/?dc=crusoe-abilene-tx'),
    );
    expect(u.origin + u.pathname).toBe(
      'https://www.linkedin.com/sharing/share-offsite/',
    );
    expect(u.searchParams.get('url')).toBe(
      'https://gigawattmap.com/?dc=crusoe-abilene-tx',
    );
  });
});

describe('buildOgImageUrl', () => {
  it('returns same-origin /api/v1/og?dc=<id> when apiBase is empty (production)', () => {
    expect(buildOgImageUrl(sampleCampus.id, '')).toBe(
      '/api/v1/og?dc=crusoe-abilene-tx',
    );
  });

  it('prefixes with apiBase when supplied (local dev)', () => {
    expect(
      buildOgImageUrl(sampleCampus.id, 'http://localhost:8787'),
    ).toBe('http://localhost:8787/api/v1/og?dc=crusoe-abilene-tx');
  });

  it('strips a trailing slash from apiBase', () => {
    expect(
      buildOgImageUrl(sampleCampus.id, 'http://localhost:8787/'),
    ).toBe('http://localhost:8787/api/v1/og?dc=crusoe-abilene-tx');
  });

  it('encodes the dc id', () => {
    expect(buildOgImageUrl('weird id/with chars', '')).toBe(
      '/api/v1/og?dc=weird%20id%2Fwith%20chars',
    );
  });
});
