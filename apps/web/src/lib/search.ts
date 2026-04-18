/**
 * Cmd+K search index — pure helpers wrapping Fuse.js.
 *
 * Three corpora (datacenters, operators, announcements) are indexed
 * independently so the palette can render section headers and so per-category
 * limits keep the popover compact even when a query matches everything.
 *
 * Lives outside React intentionally: the unit tests run under vitest's node
 * environment (no JSX plugin), and the index can be re-used by ad-hoc tools.
 */
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { AnnouncementCategory } from '@gigawattmap/types';

/** Compact datacenter shape served by the search-index Worker route. */
export type SearchableDatacenter = {
  id: string;
  name: string;
  /** Canonical operator slug, or null when unknown. */
  operator: string | null;
  /** Operator display name; redundant but indexed so "meta" matches "Meta Platforms". */
  operator_name: string | null;
  /** Tenant slug (e.g. "openai" for the Stargate / Crusoe Abilene campus). */
  tenant: string | null;
  city: string | null;
  /** ISO 3166-2 subdivision (e.g. "US-LA"). */
  region: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string;
};

/** Compact operator shape served by the search-index Worker route. */
export type SearchableOperator = {
  id: string;
  name: string;
  /** Aliases / subsidiaries (e.g. "AWS" for amazon). */
  aliases: string[];
  /** Public ticker (e.g. "META"); empty string when private. */
  ticker: string | null;
  /** Number of facilities the operator owns/operates — drives "View N facilities". */
  facility_count: number;
};

/** Compact announcement shape served by the search-index Worker route. */
export type SearchableAnnouncement = {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: AnnouncementCategory;
};

export type SearchCorpus = {
  datacenters: SearchableDatacenter[];
  operators: SearchableOperator[];
  announcements: SearchableAnnouncement[];
};

export type SearchIndex = {
  datacenters: Fuse<SearchableDatacenter>;
  operators: Fuse<SearchableOperator>;
  announcements: Fuse<SearchableAnnouncement>;
};

export type SearchResults = {
  datacenters: SearchableDatacenter[];
  operators: SearchableOperator[];
  announcements: SearchableAnnouncement[];
};

// Tuned per task notes: threshold 0.35, name weight 2, operator 1.5, city 1.
// Tenant gets a small weight so "openai" surfaces the Crusoe campus without
// drowning more direct matches.
const DATACENTER_OPTIONS: IFuseOptions<SearchableDatacenter> = {
  threshold: 0.35,
  ignoreLocation: true,
  includeScore: false,
  keys: [
    { name: 'name', weight: 2 },
    { name: 'operator_name', weight: 1.5 },
    { name: 'operator', weight: 1.2 },
    { name: 'tenant', weight: 1 },
    { name: 'city', weight: 1 },
    { name: 'region', weight: 0.5 },
  ],
};

// Operators must match by name, alias, OR ticker — power users hit "$AMZN" or
// "AWS" rather than the canonical "Amazon Web Services". Lower threshold so
// short tokens like "TLN" don't fuzz into unrelated rows.
const OPERATOR_OPTIONS: IFuseOptions<SearchableOperator> = {
  threshold: 0.3,
  ignoreLocation: true,
  includeScore: false,
  keys: [
    { name: 'name', weight: 2 },
    { name: 'aliases', weight: 1.5 },
    { name: 'ticker', weight: 1.5 },
    { name: 'id', weight: 0.5 },
  ],
};

const ANNOUNCEMENT_OPTIONS: IFuseOptions<SearchableAnnouncement> = {
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: false,
  keys: [
    { name: 'title', weight: 2 },
    { name: 'summary', weight: 1 },
  ],
};

export function buildSearchIndex(corpus: SearchCorpus): SearchIndex {
  return {
    datacenters: new Fuse(corpus.datacenters, DATACENTER_OPTIONS),
    operators: new Fuse(corpus.operators, OPERATOR_OPTIONS),
    announcements: new Fuse(corpus.announcements, ANNOUNCEMENT_OPTIONS),
  };
}

/**
 * Run a single Fuse instance over each whitespace-separated token, then
 * intersect by id and preserve the first-token ordering. This lets queries
 * like "meta louisiana" match items where "meta" hits the operator field and
 * "louisiana" hits the region field — Fuse's default per-key fuzzy search
 * cannot bridge fields on its own.
 */
function searchTokens<T extends { id: string }>(
  fuse: Fuse<T>,
  query: string,
  limit: number,
): T[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  if (tokens.length === 1) {
    return fuse.search(tokens[0]!, { limit }).map((r) => r.item);
  }
  const perToken = tokens.map((token) => fuse.search(token).map((r) => r.item));
  const [head, ...rest] = perToken as [T[], ...T[][]];
  const allowed = rest.reduce<Set<string>>(
    (acc, items) => {
      const ids = new Set(items.map((it) => it.id));
      const next = new Set<string>();
      for (const id of acc) if (ids.has(id)) next.add(id);
      return next;
    },
    new Set(head.map((it) => it.id)),
  );
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of head) {
    if (allowed.has(item.id) && !seen.has(item.id)) {
      out.push(item);
      seen.add(item.id);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * Run `query` against all three corpora, returning at most `limit` items per
 * category. Empty / whitespace-only queries return empty arrays so the UI can
 * render its empty-state hint without filtering noise.
 */
export function searchAll(index: SearchIndex, query: string, limit: number): SearchResults {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { datacenters: [], operators: [], announcements: [] };
  }
  return {
    datacenters: searchTokens(index.datacenters, trimmed, limit),
    operators: searchTokens(index.operators, trimmed, limit),
    announcements: searchTokens(index.announcements, trimmed, limit),
  };
}
