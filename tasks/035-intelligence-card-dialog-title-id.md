# 035 — Fix Radix DialogTitle warning on intelligence card

**Status:** done
**Depends on:** none
**Estimate:** 20m

## Context

Opening any intelligence card prints a Radix console error:
`DialogContent requires a DialogTitle for the component to be accessible…`

A `Dialog.Title` IS rendered (intelligence-card.tsx:135), but `Dialog.Title asChild`
wraps `<h2 id="intel-card-title">`. The explicit `id` overrides Radix's
auto-generated `titleId`, so Radix's `document.getElementById(titleId)` check
in `TitleWarning` returns `null` and the warning fires.

Fix: let Radix own the `id` (it auto-wires `aria-labelledby` on Content too),
removing both the manual `id="intel-card-title"` on the `<h2>` and the manual
`aria-labelledby="intel-card-title"` on `Dialog.Content`.

## Acceptance criteria

- [ ] No `id="intel-card-title"` literal in `intelligence-card.tsx`
- [ ] No `aria-labelledby="intel-card-title"` literal on `Dialog.Content`
- [ ] `Dialog.Title` still wraps the visible `<h2>` (asChild) so the heading
      is the accessible name (Radix injects its own id)
- [ ] Vitest test asserts the file no longer contains the literal id strings
- [ ] Opening a card in dev produces zero console errors/warnings from Radix
- [ ] `pnpm --filter web test` and `pnpm --filter web build` pass
- [ ] User visually confirms card still opens, title still shows, no warning

## Files to touch

- `apps/web/src/components/intelligence-card/intelligence-card.tsx`
- `apps/web/src/components/intelligence-card/intelligence-card.test.ts` (new)

## Notes

Radix v1.1.15 source: `react-dialog/dist/index.mjs:226` automatically sets
`aria-labelledby={context.titleId}` on Content when Title is mounted, and
line 247 sets `id={context.titleId}` on Title's underlying h2. Both are
unconditional — fighting them with custom values breaks the warning check.
