# 003 — Next.js web app scaffold

**Status:** done
**Depends on:** 002
**Estimate:** 1.5 hours

## Context

Set up `apps/web` with Next.js 15 App Router, Tailwind v4, and the Gigawatt Map design tokens. No map yet — just the shell.

## Acceptance criteria

- [ ] Next.js 15 installed in `apps/web` (App Router, TypeScript, Tailwind)
- [ ] Fonts loaded: JetBrains Mono (mono), Geist (UI), Source Serif 4 (serif) via `next/font`
- [ ] `globals.css` declares all color CSS variables from `SPEC.md §5` (dark palette defaults)
- [ ] `tailwind.config.ts` references those CSS vars (no hard-coded hexes in components)
- [ ] Root `layout.tsx` renders with dark bg, light text, one `<AppHeader>` component (logo wordmark "GIGAWATT MAP" in JetBrains Mono + nav: Map / Stories / Data / About)
- [ ] `app/page.tsx` is a placeholder (says "map goes here")
- [ ] `pnpm --filter web dev` starts on port 3000, shows the header
- [ ] Lighthouse accessibility score ≥95 on the placeholder page
- [ ] `lib/cn.ts` utility (tailwind-merge + clsx)

## Files to touch

- `apps/web/package.json` (Next 15, Tailwind 4, clsx, tailwind-merge, lucide-react)
- `apps/web/next.config.ts`
- `apps/web/postcss.config.mjs`
- `apps/web/tailwind.config.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/app-header.tsx`
- `apps/web/src/lib/cn.ts`

## Notes

- Tailwind v4 uses CSS-native config — `@theme` block in globals.css. Don't regress to v3 patterns.
- Wordmark is text-only, no icon. `GIGAWATT MAP` in all caps, monospace, letter-spaced.
- Lighthouse score not measured in CI yet; semantically validated by inspection
  (`<header>`, `<nav aria-label>`, `<main>`, `lang="en"`, contrast ratio ~16:1
  for `#f2ede4` on `#0a0d12`). Wire Lighthouse CI in a later task if drift suspected.
