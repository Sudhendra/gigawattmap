# 033 — De-duplicate header bars on /data /data/api /about

**Status:** done
**Depends on:** none
**Estimate:** 15m

## Context
The sticky `AppHeader` carries `border-b border-white/5` and the page-
level `<header>` on `/data`, `/data/api`, and `/about` carries
`border-b border-bg-elevated pb-8`. Stacked, they read as two
header bars. The page header is semantically correct (it wraps the
`<h1>` + intro), it just shouldn't read as a bar. Drop the divider line
on each, keep the spacing.

## Acceptance criteria
- [ ] `apps/web/src/app/data/page.tsx`, `.../data/api/page.tsx`, and
      `.../about/page.tsx` page-level `<header>` elements no longer
      render `border-b border-bg-elevated`.
- [ ] `pb-8` (or equivalent vertical spacing) preserved so the title
      still has room before the first section.
- [ ] No new `border-b` introduced; existing section dividers below the
      header are left intact.
- [ ] `pnpm --filter web build` exits 0.

## Files to touch
- `apps/web/src/app/data/page.tsx`
- `apps/web/src/app/data/api/page.tsx`
- `apps/web/src/app/about/page.tsx`

## Notes
- News page (`/news`) was not reported as having the issue \u2014 leave it
  alone unless inspection shows the same pattern.
- Sticky `AppHeader` border stays; that's the only nav divider.
