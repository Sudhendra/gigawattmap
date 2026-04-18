# 022b — Intelligence card cleanup

**Status:** done
**Depends on:** 020, 021, 022
**Estimate:** 3 hours

## Context

`intelligence-card.tsx` still ships three placeholders that explicitly
reference task numbers — "Press notes attach when the deals feed lands
(task 021)", "Ticker links activate with the market panel (task 020)",
and a "OpenStreetMap once the pipeline lands" Sources line. Tasks 020,
021, and 017 (substation enrichment) are all done. The placeholders are
now actively misleading: the data is there, it just isn't wired.

Splitting this from 022 keeps each card to one logical commit per
`AGENTS.md`, isolates the editorial-copy + small-helper work from the
search engineering, and unblocks a clean 023 (about page) where the
intelligence card is the canonical product surface we'll point readers at.

## Acceptance criteria

- [x] "Context" section renders up to 3 newest announcements joined to the selected campus by `datacenter_id` OR `operator_id`. Each row shows date · category · title; the title is a link to the announcement's primary `source_url` (opens in a new tab with `rel="noreferrer"`). Empty state: a single muted line "No recent announcements." — no dashed placeholder box.
- [x] "Market exposure" section renders a ticker chip when the selected campus's operator has a public ticker; clicking it calls `setTickerFilter(symbol)` (same store action the ticker panel uses). Empty state: muted "No public ticker linked." line.
- [x] "Sources" section copy rewritten to honestly describe the live state: curated CSV, primary-source URLs, and OSM/GEM substation enrichment (task 017). No "once the pipeline lands" wording.
- [x] "Water" placeholder kept as-is (genuinely v1.5 — no task card exists yet).
- [x] No string `"task 020"`, `"task 021"`, or `"task 022"` remains anywhere in `apps/web/src/components/intelligence-card/`.
- [x] New pure helpers covered by vitest: `selectAnnouncementsForCampus(announcements, campusId, operatorId, limit=3)` and `tickerForOperator(operatorDisplayName)`. Both tested against edge cases (null/missing operator_id, operator with no ticker, multiple matches sorted by date).
- [x] `pnpm --filter web test` green; `pnpm --filter web build` green.

## Files to touch

- `apps/web/src/components/intelligence-card/intelligence-card.tsx`
- `apps/web/src/components/intelligence-card/intelligence-card-helpers.ts` (new)
- `apps/web/src/components/intelligence-card/intelligence-card-helpers.test.ts` (new)
- `apps/web/src/lib/ticker-map.ts` (add inverse lookup `tickerForOperator`)

## Notes

- **Operator-name → ticker resolution:** the existing `OPERATORS_BY_TICKER` map in `ticker-map.ts` is keyed by ticker symbol with display-name values (e.g. `MSFT: ['Microsoft']`). Build the inverse as a memoized `Map<string, string>` derived from the same source — keeps a single editorial source of truth. When an operator appears under multiple tickers (e.g. "Amazon" under both AMZN and TLN's offtake), prefer the **direct hyperscaler** ticker — encode this rule by iterating in declaration order and skipping if already set; AMZN is declared before TLN.
- **Announcement → campus join:** the GeoJSON properties expose `operator` as a display string, not a slug. Resolve display → slug via the search-index payload that `useSearchIndex` already loads (its `operators[].name` and `operators[].id`). If the search index hasn't loaded yet, fall back to `datacenter_id`-only matching — the announcements section degrades gracefully rather than blocking on a second fetch.
- **Announcements query reuse:** call the existing `fetchAnnouncements()` via TanStack Query (`['announcements']` key, 1h staleTime) — same pattern as `announcements-feed`. Don't introduce a new fetch.
- **Link target:** `/news` does NOT read URL params (it ships local-state filters only — verified in `news-page-client.tsx`). Linking each announcement title directly to its primary `source_url` is more useful anyway and matches how `announcements-feed.tsx` already surfaces sources.
- **TDD:** write helper tests first (RED), then implement (GREEN). Helpers are pure — no React, no fetch.
- **Out of scope:** layer-controls.tsx "coming in v1" hints (those toggles are partially live; defer to a separate audit). Replacing the seed `ai-campuses.geojson` with a curated.py-generated one (would expand scope; the search-index lookup is sufficient).
- **Verify before claiming done:** open the card on a Microsoft campus (expect MSFT chip), a Crusoe campus (no public ticker, expect empty state), a campus with announcements (expect rows), and a campus without (expect empty state).
