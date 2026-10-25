# 048 — Reduce map loading and rendering cost

**Status:** blocked
**Depends on:** 043
**Estimate:** 1 day

## Context

The map loads two rendering engines and unclustered facilities. Previous cleanup left dynamic map chunks at 465,451 bytes gzip before shared application code.

## Acceptance criteria

- [x] Measure current page JavaScript and establish reproducible browser performance checks.
- [x] Render facilities with native MapLibre clustering; cluster selection expands and facility selection/deep links continue working.
- [x] Load secondary rendering code and datasets only when needed, preserving layer controls and failure feedback.
- [x] Reduce initial UI code where it does not affect immediate interaction or content.
- [x] Verify ticker matching, marker selection, optional layers, reduced-motion behavior and mobile layout after changes.
- [x] Record measured gzip payload, cold-4G FCP and 10k-feature pan timing. Do not claim a budget passed without evidence; document any remaining hard limit.
- [ ] Relevant tests/typechecks/build pass and production deployment is verified.

## Files to touch

- `apps/web/src/components/map/`
- `apps/web/src/app/_components/map-view.tsx`
- `apps/web/src/lib/hooks/use-animation-clock.ts`
- `docs/operations/map-performance.md`

## Notes

Owner explicitly authorized remaining optimizations. Preserve the existing basemap and optional layers. No dependency additions or invented facilities in production; synthetic 10k features are browser-test fixtures only. Performance targets remain those in AGENTS.md; an unmet target keeps the performance task unfinished.

Blocked by: the complete map JavaScript remains approximately 426 KB gzip, above the 350 KB budget. Native clustering and lazy secondary layers are implemented; measured cold-4G FCP is 968 ms median and the 10k pan proxy is 60.19 fps. See docs/operations/map-performance.md for reproducible measurements and their limits. This is a shipped improvement, not a claim that every performance requirement is complete.
