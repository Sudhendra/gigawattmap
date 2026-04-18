import { describe, expect, it } from 'vitest';
import {
  buildSearchIndex,
  searchAll,
  type SearchableAnnouncement,
  type SearchableDatacenter,
  type SearchableOperator,
} from './search';

const DATACENTERS: SearchableDatacenter[] = [
  {
    id: 'meta-hyperion-la',
    name: 'Meta Hyperion',
    operator: 'meta',
    operator_name: 'Meta Platforms',
    tenant: null,
    city: 'Richland Parish',
    region: 'US-LA',
    country: 'US',
  },
  {
    id: 'aws-ashburn-us-east-1',
    name: 'AWS Ashburn US-East-1',
    operator: 'amazon',
    operator_name: 'Amazon Web Services',
    tenant: null,
    city: 'Ashburn',
    region: 'US-VA',
    country: 'US',
  },
  {
    id: 'crusoe-abilene-tx',
    name: 'Crusoe Abilene Stargate',
    operator: 'crusoe',
    operator_name: 'Crusoe Energy',
    tenant: 'openai',
    city: 'Abilene',
    region: 'US-TX',
    country: 'US',
  },
];

const OPERATORS: SearchableOperator[] = [
  {
    id: 'meta',
    name: 'Meta Platforms',
    aliases: ['Facebook', 'Meta'],
    ticker: 'META',
    facility_count: 12,
  },
  {
    id: 'amazon',
    name: 'Amazon Web Services',
    aliases: ['AWS', 'Amazon'],
    ticker: 'AMZN',
    facility_count: 47,
  },
  {
    id: 'talen',
    name: 'Talen Energy',
    aliases: [],
    ticker: 'TLN',
    facility_count: 1,
  },
];

const ANNOUNCEMENTS: SearchableAnnouncement[] = [
  {
    id: '2025-01-21-stargate-project',
    title: 'Stargate Project announced',
    summary: 'OpenAI, SoftBank, and Oracle launch $500B Stargate joint venture.',
    date: '2025-01-21',
    category: 'deal',
  },
  {
    id: '2026-04-15-meta-richland',
    title: 'Meta breaks ground on Hyperion phase II',
    summary: 'Louisiana megacampus expands to 2 GW.',
    date: '2026-04-15',
    category: 'launch',
  },
];

describe('buildSearchIndex', () => {
  it('returns an index that can answer queries against all three corpora', () => {
    const index = buildSearchIndex({
      datacenters: DATACENTERS,
      operators: OPERATORS,
      announcements: ANNOUNCEMENTS,
    });
    const results = searchAll(index, 'meta', 5);
    expect(results.datacenters.length).toBeGreaterThan(0);
    expect(results.operators.length).toBeGreaterThan(0);
    expect(results.announcements.length).toBeGreaterThan(0);
  });
});

describe('searchAll — datacenters', () => {
  const index = buildSearchIndex({
    datacenters: DATACENTERS,
    operators: OPERATORS,
    announcements: ANNOUNCEMENTS,
  });

  it('matches a datacenter by city name', () => {
    const results = searchAll(index, 'ashburn', 5);
    expect(results.datacenters[0]?.id).toBe('aws-ashburn-us-east-1');
  });

  it('matches a datacenter by combining operator and city across fields (multi-token AND)', () => {
    const results = searchAll(index, 'meta richland', 5);
    const ids = results.datacenters.map((r) => r.id);
    expect(ids).toContain('meta-hyperion-la');
  });

  it('matches a datacenter by tenant', () => {
    const results = searchAll(index, 'openai', 5);
    const ids = results.datacenters.map((r) => r.id);
    expect(ids).toContain('crusoe-abilene-tx');
  });

  it('returns empty arrays for an empty query', () => {
    const results = searchAll(index, '', 5);
    expect(results.datacenters).toEqual([]);
    expect(results.operators).toEqual([]);
    expect(results.announcements).toEqual([]);
  });

  it('respects the per-category limit', () => {
    const results = searchAll(index, 'a', 1);
    expect(results.datacenters.length).toBeLessThanOrEqual(1);
    expect(results.operators.length).toBeLessThanOrEqual(1);
    expect(results.announcements.length).toBeLessThanOrEqual(1);
  });
});

describe('searchAll — operators', () => {
  const index = buildSearchIndex({
    datacenters: DATACENTERS,
    operators: OPERATORS,
    announcements: ANNOUNCEMENTS,
  });

  it('matches operators by their public ticker', () => {
    const results = searchAll(index, 'TLN', 5);
    const ids = results.operators.map((r) => r.id);
    expect(ids).toContain('talen');
  });

  it('matches operators by alias', () => {
    const results = searchAll(index, 'AWS', 5);
    const ids = results.operators.map((r) => r.id);
    expect(ids).toContain('amazon');
  });

  it('exposes the facility count on operator results so the UI can render "View N facilities"', () => {
    const results = searchAll(index, 'amazon', 5);
    const amazon = results.operators.find((r) => r.id === 'amazon');
    expect(amazon?.facility_count).toBe(47);
  });
});

describe('searchAll — announcements', () => {
  const index = buildSearchIndex({
    datacenters: DATACENTERS,
    operators: OPERATORS,
    announcements: ANNOUNCEMENTS,
  });

  it('matches announcements by title', () => {
    const results = searchAll(index, 'stargate', 5);
    const ids = results.announcements.map((r) => r.id);
    expect(ids).toContain('2025-01-21-stargate-project');
  });

  it('matches announcements by summary', () => {
    const results = searchAll(index, 'softbank', 5);
    const ids = results.announcements.map((r) => r.id);
    expect(ids).toContain('2025-01-21-stargate-project');
  });
});
