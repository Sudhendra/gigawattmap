# 022 — Cmd+K search

**Status:** in-progress
**Depends on:** 013, 021
**Estimate:** 2 hours

## Context

Fuzzy global search. User presses Cmd/Ctrl+K → popover opens → types "meta louisiana" → result list shows Hyperion campus → Enter flies the map + opens the card. Same pattern works for operators, tickers, and announcements.

## Acceptance criteria

- [ ] `components/search/command-palette.tsx` using Radix Dialog + a custom list (or `cmdk` library if it fits cleanly)
- [ ] Keybind: `⌘K` / `Ctrl+K` opens; `Esc` closes; arrow keys navigate results; `Enter` selects
- [ ] Three result categories rendered with section headers:
  - **Datacenters** — fuzzy match on `name`, `operator`, `tenant`, `city`, `region`
  - **Operators** — matches operator names from `operators.csv`; selecting shows "View 12 facilities" and pins `operatorFilter`
  - **Announcements** — matches title, summary; selecting navigates to `/news` or opens the card
- [ ] Search index built client-side with Fuse.js over a compact JSON (`/api/v1/search-index` — a Worker endpoint serving a pre-built index from R2)
- [ ] Pre-built index: `data-pipeline/opendc/search/build_index.py` emits a compact JSON (just the fields needed for search + the IDs) — keeps the client bundle lean
- [ ] Empty state: show "Try: Meta, Ashburn, Stargate, $NVDA, $TLN, nuclear"
- [ ] Top-right of app header has a subtle "⌘K" hint button that also opens the palette

## Files to touch

- `apps/web/src/components/search/command-palette.tsx`
- `apps/web/src/lib/search.ts` (Fuse.js config + scoring)
- `apps/api/src/routes/search-index.ts` (serve the pre-built index from R2)
- `data-pipeline/opendc/search/build_index.py`
- `apps/web/src/components/app-header.tsx` (add ⌘K hint)

## Notes

- Fuse.js tuning: `threshold: 0.35`, `keys: [{ name: 'name', weight: 2 }, { name: 'operator', weight: 1.5 }, { name: 'city', weight: 1 }]`.
- Don't index everything — only ~5K most relevant features. Index size >500KB hurts first-open latency.
