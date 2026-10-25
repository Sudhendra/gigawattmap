# 052 — Contextual map activity

**Status:** in-progress
**Depends on:** 051
**Estimate:** 1 day

## Context

Activity should follow the area or company being researched while preserving the distinction between news and dataset changes. Associations must use recorded IDs, not guessed headline mentions.

## Acceptance criteria

- [ ] Activity offers All activity, This map area and Selected company; states explain missing selection, missing links and loading/errors.
- [ ] Map-area news requires an explicit facility link to a current facility in the viewport; company-only stories are not assigned to every company location.
- [ ] Company matching uses canonical operator IDs or a directly linked facility's recorded operator, without supplier/revenue inference. Explicit company links can work even with no mapped facilities.
- [ ] News and dataset changes remain separately labeled and both respect the scope; source-less or unmatched items stay available under All activity.
- [ ] Facility card context labels direct facility news versus wider operator context and avoids an extra stale seed-search lookup.
- [ ] Tests cover no selection, missing IDs, dateline bounds, direct/operator links and no keyword inference; desktop/mobile browser checks, build and production verification pass.

## Files to touch

- `apps/web/src/components/map/research-panel.tsx`
- `apps/web/src/components/map/recent-changes.tsx`
- `apps/web/src/components/announcements-feed/`
- `apps/web/src/components/intelligence-card/`
- `apps/web/src/lib/ticker-map.ts`

## Notes

Owner approved. Keep the existing activity tab and no-route-navigation behavior. Do not build comparison, saved views or watchlists in this increment. Canonical company IDs come from the existing operator registry; unnamed/unlinked RSS stories must not be silently attributed.
