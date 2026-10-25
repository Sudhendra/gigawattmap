# 052 — Contextual map activity

**Status:** done
**Depends on:** 051
**Estimate:** 1 day

## Context

Activity should follow the area or company being researched while preserving the distinction between news and dataset changes. Associations must use recorded IDs, not guessed headline mentions.

## Acceptance criteria

- [x] Activity offers All activity, This map area and Selected company; states explain missing selection, missing links and loading/errors.
- [x] Map-area news requires an explicit facility link to a current facility in the viewport; company-only stories are not assigned to every company location.
- [x] Company matching uses canonical operator IDs or a directly linked facility's recorded operator, without supplier/revenue inference. Explicit company links can work even with no mapped facilities.
- [x] News and dataset changes remain separately labeled and both respect the scope; source-less or unmatched items stay available under All activity.
- [x] Facility card context labels direct facility news versus wider operator context and avoids an extra stale seed-search lookup.
- [x] Tests cover no selection, missing IDs, dateline bounds, direct/operator links and no keyword inference; desktop/mobile browser checks, build and production verification pass.

## Files to touch

- `apps/web/src/components/map/research-panel.tsx`
- `apps/web/src/components/map/recent-changes.tsx`
- `apps/web/src/components/announcements-feed/`
- `apps/web/src/components/intelligence-card/`
- `apps/web/src/lib/ticker-map.ts`

## Notes

Owner approved. Keep the existing activity tab and no-route-navigation behavior. Do not build comparison, saved views or watchlists in this increment. Canonical company IDs come from the existing operator registry; unnamed/unlinked RSS stories must not be silently attributed.


## Verification — 2026-10-25

- Web unit suite: 148 tests passed; typecheck and production static build passed. Map initial JS: 140 kB. Existing complete-map bundle budget work remains tracked separately in task 048.
- Cloudflare Pages deployment `ba480fbe` (application commit `df81c81`) verified on https://gigawattmap.com.
- `tests/e2e/contextual-activity-flow.js`: explicit area/company links, no headline inference, missing selection, scoped dataset changes, card operator-context labeling, mobile layout, and unchanged document/map passed.
- Existing real-data research workspace flow passed. Live desktop/mobile scope controls and company selection verified. Upstream basemap sprite/glyph fallback warnings remain unrelated to this change.
