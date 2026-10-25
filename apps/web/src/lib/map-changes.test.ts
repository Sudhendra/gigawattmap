import { describe, expect, it } from 'vitest';
import { parseMapChanges } from './map-changes';

const baseline = { baseline_at: '2026-10-25T00:00:00Z', compared_at: null, events: [] };
const event = {
  id: 'event',
  facility_id: 'one',
  facility_name: 'Facility',
  kind: 'updated',
  detected_at: '2026-11-01T00:00:00Z',
  sources: ['osm'],
  fields: [{ field: 'est_mw_mid', before: null, after: 100 }],
};
const history = { ...baseline, compared_at: baseline.baseline_at, events: [event] };
const ids = new Set(['one']);

describe('map change history', () => {
  it('distinguishes a legacy snapshot from a baseline and an empty comparison', () => {
    expect(parseMapChanges(undefined, ids)).toBeNull();
    expect(parseMapChanges(baseline, ids)?.compared_at).toBeNull();
    expect(parseMapChanges({ ...history, events: [] }, ids)?.compared_at).toBe(
      baseline.baseline_at,
    );
  });
  it('preserves unknown capacity and source provenance', () => {
    expect(parseMapChanges(history, ids)?.events[0]).toEqual(event);
  });
  it('rejects broken links, duplicate events, malformed values and fake baseline discoveries', () => {
    for (const value of [
      { ...history, events: [{ ...event, facility_id: 'missing' }] },
      { ...history, events: [event, event] },
      { ...baseline, events: [event] },
      {
        ...history,
        events: [{ ...event, fields: [{ field: 'est_mw_mid', before: null, after: -1 }] }],
      },
      { ...history, events: [{ ...event, detected_at: 'bad' }] },
    ])
      expect(() => parseMapChanges(value, ids)).toThrow();
  });
});
