# 049 — Direct cluster browsing and stable map selection

**Status:** in-progress
**Depends on:** 047, 048
**Estimate:** 1 day

## Context

Cluster expansion forces repeated clicks before a facility card is accessible. Map selection currently invokes route navigation for client-only URL state, and users report apparent refreshes.

## Acceptance criteria

- [ ] A cluster click opens a searchable facility list; selecting a row opens its card without intermediate zoom clicks. Explicit zoom remains available.
- [ ] Lists distinguish facilities by name, operator, region/country and ID; company matches sort first and are labeled. Large lists show bounded batches and search the full cluster.
- [ ] Loading, errors/retry, cancellation and stale cluster responses are handled; keyboard and mobile interactions work.
- [ ] Facility/operator/ticker selection retains the same document and map canvas and makes no route-data request. Same-value changes are no-ops; sequential URL updates preserve unrelated parameters/hash and deep links/back-forward still restore selection.
- [ ] Regression checks fail before fixes; relevant tests, strict typecheck/build, browser checks and production verification pass.

## Files to touch

- `apps/web/src/components/map/map.tsx`
- `apps/web/src/components/map/cluster-browser.tsx`
- `apps/web/src/components/map/cluster-facilities.ts`
- `apps/web/src/lib/map-selection-url.ts`
- `apps/web/src/lib/hooks/use-selected-dc-url-sync.ts`
- `apps/web/src/lib/hooks/use-operator-filter-url-sync.ts`
- `tests/e2e/map-selection-stability.js`

## Notes

User authorized improved UX while retaining clustering. Use existing Radix dialog for focus management; no new dependencies. Existing total-JavaScript budget blocker remains task 048; measure incremental impact.
