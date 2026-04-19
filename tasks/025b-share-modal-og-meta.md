# 025b — Share modal + dynamic OG metadata

**Status:** done
**Depends on:** 025a
**Estimate:** 50m

## Context

The intelligence card has a share button that copies the URL. Replace the
direct copy with a modal exposing: copy link, tweet, post to LinkedIn,
download PNG (the OG image from 025a). Wire dynamic `openGraph` and `twitter`
metadata into the route layout so unfurls show the right image per page.

## Acceptance criteria

**Share modal:**

- [x] New `apps/web/src/components/share/share-modal.tsx` (Radix Dialog)
- [x] Triggered from intelligence card share button
- [x] Renders 4 actions: Copy link · Tweet · LinkedIn · Download PNG
- [x] Copy link: writes `buildShareUrl(id)` (already exists), toast confirms
- [x] Tweet: opens `https://twitter.com/intent/tweet?text=...&url=...` with template
      "Just discovered {name} on @gigawattmap — {operator} · ~{mw} MW · {country}"
- [x] LinkedIn: opens `https://www.linkedin.com/sharing/share-offsite/?url=...`
- [x] Download PNG: anchors to `/api/v1/og?dc=<id>` with `download` attribute
- [x] Modal a11y-correct (Dialog.Title via VisuallyHidden if not visible)
- [x] Vitest covers the URL builders for tweet/linkedin templates

**Dynamic OG metadata:**

- [x] `apps/web/src/app/layout.tsx` exports default `openGraph` + `twitter`
      pointing at `/api/v1/og`
- [x] `apps/web/src/app/about/page.tsx` overrides with about-specific title
- [x] `apps/web/src/app/data/page.tsx` overrides with data-specific title
- [x] All metadata uses `NEXT_PUBLIC_APP_URL` (new env, default `https://gigawattmap.com`)
      so absolute URLs work for unfurlers

**Verification:**

- [x] `pnpm --filter web test` passes (104/104 incl. share-templates + seed-ids)
- [x] `pnpm --filter web build` passes
- [x] User visually confirms modal opens, all 4 actions work in dev
      (verified on previously-failing campuses post-038 fix)

## Files to touch

- `apps/web/src/components/share/share-modal.tsx` (new)
- `apps/web/src/components/share/share-templates.ts` (new — pure URL builders)
- `apps/web/src/components/share/share-templates.test.ts` (new)
- `apps/web/src/components/intelligence-card/intelligence-card.tsx` (wire modal)
- `apps/web/src/app/layout.tsx` (default OG metadata)
- `apps/web/src/app/about/page.tsx` (override)
- `apps/web/src/app/data/page.tsx` (override)
- `apps/web/.env.example` (document `NEXT_PUBLIC_APP_URL`)

## Notes

- Pure URL builders live in their own `.ts` file so vitest (no JSX runtime)
  can test them directly — same pattern as other testable logic in apps/web.
- Twitter intent URL must encode params with `encodeURIComponent`.
- Share modal triggered from existing `Share2` button; keep the icon.
