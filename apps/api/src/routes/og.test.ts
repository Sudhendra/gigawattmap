import { describe, expect, it } from 'vitest';
import { resolveOgRequest } from './og';

const sampleGeojson = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-99.7331, 32.4487] as [number, number] },
      properties: {
        id: 'crusoe-abilene-tx',
        name: 'Stargate I — Abilene',
        operator: 'Crusoe',
        status: 'construction',
        country: 'US',
        est_mw_mid: 1200,
      },
    },
  ],
};

/**
 * These tests cover the routing/lookup contract of /api/v1/og.
 *
 * Actual PNG rendering is performed by `workers-og`, which loads a wasm
 * module at top-level import — Node's vitest pool cannot resolve `.wasm`
 * imports, so the renderer is exercised end-to-end via `wrangler dev` (see
 * the smoke section in tasks/025a-og-image-endpoint.md). Splitting the
 * routing into a pure `resolveOgRequest` keeps the contract under test
 * without dragging wasm into the unit suite.
 */
describe('resolveOgRequest', () => {
  it('returns the default variant when no query params are present', async () => {
    const r = await resolveOgRequest({}, async () => null);
    expect(r).toEqual({ kind: 'default' });
  });

  it('returns the market variant for ?market=<slug>', async () => {
    const r = await resolveOgRequest(
      { market: 'northern-virginia' },
      async () => null,
    );
    expect(r).toEqual({ kind: 'market', slug: 'northern-virginia' });
  });

  it('returns the datacenter variant with full props when ?dc matches', async () => {
    const r = await resolveOgRequest(
      { dc: 'crusoe-abilene-tx' },
      async () => sampleGeojson,
    );
    expect(r.kind).toBe('datacenter');
    if (r.kind !== 'datacenter') throw new Error('unreachable');
    expect(r.props.name).toBe('Stargate I — Abilene');
    expect(r.props.operator).toBe('Crusoe');
    expect(r.props.est_mw_mid).toBe(1200);
  });

  it('returns not-found-dc (so the route can answer 404 JSON, not a broken image) for unknown dc', async () => {
    const r = await resolveOgRequest(
      { dc: 'does-not-exist' },
      async () => sampleGeojson,
    );
    expect(r).toEqual({ kind: 'not-found-dc', dc: 'does-not-exist' });
  });

  it('returns not-found-dc when the artifact is missing entirely', async () => {
    const r = await resolveOgRequest(
      { dc: 'crusoe-abilene-tx' },
      async () => null,
    );
    expect(r).toEqual({ kind: 'not-found-dc', dc: 'crusoe-abilene-tx' });
  });

  it('prefers ?dc over ?market when both are supplied', async () => {
    const r = await resolveOgRequest(
      { dc: 'crusoe-abilene-tx', market: 'ignored' },
      async () => sampleGeojson,
    );
    expect(r.kind).toBe('datacenter');
  });
});
