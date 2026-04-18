'use client';

import { useEffect, useMemo, useState } from 'react';
import { SEARCH_INDEX_URL } from '@/lib/env';
import { buildSearchIndex, type SearchCorpus, type SearchIndex } from '@/lib/search';

/** Local-dev fallback: this file is published by `opendc build-index`. */
const SEED_URL = '/seed/search-index.json';

/**
 * Fetch the pre-built search corpus once (R2 in prod, seed JSON in dev) and
 * memoize a Fuse index over it. Returns `null` until the corpus arrives —
 * the palette renders an empty hint state during that window.
 *
 * We deliberately avoid TanStack Query here: the corpus is small (<500 KB),
 * static across a session, and only needed by one consumer, so a one-shot
 * fetch with module-level cache keeps the dependency surface flat.
 */
export function useSearchIndex(): SearchIndex | null {
  const [corpus, setCorpus] = useState<SearchCorpus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = SEARCH_INDEX_URL ?? SEED_URL;
    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`search-index fetch failed: ${res.status}`);
        const next = (await res.json()) as SearchCorpus;
        if (!cancelled) setCorpus(next);
      } catch (err) {
        // Non-fatal: the palette degrades to an empty-state hint.
        // eslint-disable-next-line no-console
        console.error('Failed to load search index', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => (corpus ? buildSearchIndex(corpus) : null), [corpus]);
}
