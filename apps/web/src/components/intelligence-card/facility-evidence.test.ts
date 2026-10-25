import { expect, it } from 'vitest';
import { facilityEvidence, publicationLabel, safeEvidenceUrl } from './facility-evidence';
import type { AiCampusProperties } from '@/components/map/layers/datacenters-layer';
const facility: AiCampusProperties = {
  id: 'osm-way-123',
  name: 'A',
  operator: 'Unknown',
  tenant: '',
  country: 'XX',
  tier: 'colo',
  status: null,
  est_mw_mid: null,
  sources: ['osm'],
};
it('preserves unknown fields and links an exact OSM record without claiming verification', () => {
  const result = facilityEvidence(facility);
  expect(result.provenance).toBe('OpenStreetMap record');
  expect(result.links).toEqual([
    { label: 'OpenStreetMap record', url: 'https://www.openstreetmap.org/way/123' },
  ]);
  expect(result.operatorKnown).toBe(false);
  expect(result.statusKnown).toBe(false);
  expect(result.capacityKnown).toBe(false);
  expect(facilityEvidence({ ...facility, est_mw_mid: 0 }).capacityKnown).toBe(true);
});
it('does not manufacture attribution or OSM provenance for merged IDs', () => {
  expect(facilityEvidence({ ...facility, sources: [] }).provenance).toBe(
    'Source attribution not recorded',
  );
  expect(facilityEvidence({ ...facility, sources: [] }).links).toEqual([]);
  expect(
    facilityEvidence({ ...facility, id: 'curated-a', sources: ['curated', 'osm'] }).links,
  ).toEqual([]);
});
it('accepts only explicit safe source URLs and never formats an invalid publication date', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hi',
    'https://name:password@example.com/',
    '/local',
  ])
    expect(safeEvidenceUrl(url)).toBeNull();
  expect(safeEvidenceUrl('https://example.com/source')).toBe('https://example.com/source');
  expect(publicationLabel(null)).toBe('Not available');
  expect(publicationLabel('invalid')).toBe('Not available');
  expect(publicationLabel('2026-10-25T12:30:00Z')).toContain('UTC');
});
