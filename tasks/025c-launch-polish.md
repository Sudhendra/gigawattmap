# 025c — Launch polish: 404, robots, sitemap, favicons

**Status:** in-progress
**Depends on:** none
**Estimate:** 45m

## Context

Production hygiene before launch: a styled 404, a permissive robots.txt,
a generated sitemap.xml, and brand favicons. None of this needs OG or
share work; can run independently of 025a/b.

## Acceptance criteria

**404 page:**

- [ ] `apps/web/src/app/not-found.tsx` (App Router convention)
- [ ] Matches the dark palette (uses `--bg-base`, `--text-primary`, etc.)
- [ ] Includes the AppHeader (already global via layout) and a back-to-map link
- [ ] Has appropriate `<title>` via metadata export

**robots.txt:**

- [ ] `apps/web/public/robots.txt` allows all crawlers
- [ ] Includes `Sitemap: https://gigawattmap.com/sitemap.xml`

**sitemap.xml:**

- [ ] `apps/web/src/app/sitemap.ts` returns the `MetadataRoute.Sitemap` array
- [ ] Includes `/`, `/about`, `/data`, `/data/api`, `/news`
- [ ] Uses `NEXT_PUBLIC_APP_URL` (or default `https://gigawattmap.com`)
- [ ] Each entry has `lastModified`, `changeFrequency`, `priority`

**Favicons:**

- [ ] `apps/web/src/app/icon.tsx` (App Router dynamic icon) renders a
      brand-palette monogram (e.g. "G" on dark background) — defers Apple
      touch icon to a follow-up if Edge/Apple needs PNG variants
- [ ] OR drop static `apps/web/public/favicon.ico` + `apple-touch-icon.png`
      if dynamic generation is fragile in dev

**Verification:**

- [ ] `pnpm --filter web build` passes
- [ ] Hitting an unknown URL in dev shows the styled 404
- [ ] `/robots.txt` and `/sitemap.xml` return correct content in dev
- [ ] `pnpm --filter web test` still 70+ tests passing
- [ ] User visually confirms 404 + favicon

## Files to touch

- `apps/web/src/app/not-found.tsx` (new)
- `apps/web/public/robots.txt` (new)
- `apps/web/src/app/sitemap.ts` (new)
- `apps/web/src/app/icon.tsx` (new) OR `apps/web/public/favicon.ico` (new)
- `apps/web/src/app/__tests__/sitemap.test.ts` (new — assert contents)

## Notes

- Sitemap uses a pure function for the entry list so vitest can test it
  without rendering — see header-singleton.test.ts pattern.
- `icon.tsx` uses Next's `ImageResponse` (same engine as @vercel/og), no
  extra dependency.
