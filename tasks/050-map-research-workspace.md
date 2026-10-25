# 050 — A unified map research workspace

**Status:** in-progress
**Depends on:** 049
**Estimate:** 1 day

## Context

Floating markets, news and layer panels obscure the map and compete visually. The owner approved a unified research sidebar, restrained visual styling and persistent company selection controls as the next design increment.

## Acceptance criteria

- [ ] Desktop uses one collapsible sidebar with Companies, Activity and Layers tabs; mobile uses a collapsed/preview/expanded bottom sheet without horizontal overflow.
- [ ] Facility details open within the research panel; Back to results restores the prior tab/list context. Existing share/source/search/cluster flows remain usable.
- [ ] Selected company remains visible on the map. Highlight/Only matches controls are explicit, counts use loaded records, Fit moves only on request, and clear restores all facilities. Unmapped companies cannot imply matched exposure.
- [ ] Dark default and light basemaps retain attribution, clustering, selection and optional layers across switches; resizing/collapsing the panel preserves the map instance.
- [ ] News and dataset changes live in Activity; layer switches and source descriptions live in Layers. No fabricated financial claims or sponsor placements.
- [ ] Relevant tests/typecheck/build and desktop/mobile browser checks pass; changes are deployed and verified.

## Files to touch

- `apps/web/src/app/_components/map-view.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/map/`
- `apps/web/src/components/ticker-panel/ticker-panel.tsx`
- `apps/web/src/components/announcements-feed/announcements-feed.tsx`
- `apps/web/src/components/intelligence-card/intelligence-card.tsx`
- `apps/web/src/lib/store/map-store.ts`

## Notes

No new dependencies. Initial implementation focuses on layout, selection and styling; contextual news scopes and deeper investment briefs remain separate future work. Existing total JS budget blocker stays tracked in 048. Preserve user screenshots and untracked browser artifacts.
