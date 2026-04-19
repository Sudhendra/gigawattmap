# 034 — Remove duplicate AppHeader on /about /data /data/api

**Status:** done
**Depends on:** none
**Estimate:** 20m

## Context

`apps/web/src/app/layout.tsx` mounts `<AppHeader />` globally for every route.
Three pages — `/about`, `/data`, `/data/api` — also import and render
`<AppHeader />` themselves, producing two identical sticky header bars stacked
on top of each other (confirmed via screenshot). Task 033 misdiagnosed this as
a redundant `border-b` on the inner page-title `<header>` and was reverted.

## Acceptance criteria

- [ ] `apps/web/src/app/about/page.tsx` no longer imports or renders `AppHeader`
- [ ] `apps/web/src/app/data/page.tsx` no longer imports or renders `AppHeader`
- [ ] `apps/web/src/app/data/api/page.tsx` no longer imports or renders `AppHeader`
- [ ] `grep -rn "AppHeader" apps/web/src/app` shows exactly one render site (`layout.tsx`)
- [ ] Vitest test asserts these three pages do not contain `AppHeader` in their source
- [ ] `pnpm --filter web test` passes
- [ ] `pnpm --filter web build` succeeds
- [ ] Visual confirmation from user that only one header bar renders on each page

## Files to touch

- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/data/page.tsx`
- `apps/web/src/app/data/api/page.tsx`
- `apps/web/src/app/__tests__/header-singleton.test.ts` (new)

## Notes

The semantic page-title `<header>` element inside each `<main>` (e.g. the
"About Gigawatt Map / Last updated …" block) stays — that is a distinct
landmark and not a duplicate of the global app chrome. Only the
`<AppHeader />` component import/render is being removed.
