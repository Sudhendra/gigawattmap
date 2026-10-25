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

Local verification: 140 web tests, strict typecheck/production build pass. A dateline camera-count regression was observed failing and fixed. research-workspace-flow.js verifies company search, Only matches/Fit (182 Equinix facilities), both basemaps with cloud overlays, panel collapse, shared facility card, Back restoration, mobile sizes and no document/canvas replacement or route-data navigation. cluster-card-flow.js passes with the embedded card. Native-Metal 10k pan responsiveness proxy: 60.20 fps (16.8 ms p95). Simulated gzip cold-4G FCP: 972/1016/1032 ms, median 1016 ms. Same caveats as docs/operations/map-performance.md apply. Next initial JS: 139 KB (previously 137 KB); the complete-JS budget remains separately blocked in 048. Visual checks cover dark/light desktop and mobile preview/expanded/collapsed states.
