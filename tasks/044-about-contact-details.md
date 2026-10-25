# 044 — Correct About contact details

**Status:** todo
**Depends on:** 023
**Estimate:** 1 hour

## Context

The About page contains a placeholder contact address. Existing uncommitted changes
already correct repository links and must be preserved.

## Acceptance criteria

- [ ] About displays Sudhendra Kambhamettu and the exact public email supplied by the owner with a matching mailto link.
- [ ] Repository links point to `https://github.com/Sudhendra/gigawattmap`; any personal GitHub link points to the owner-confirmed profile.
- [ ] A regression check catches obsolete repository/contact links; relevant tests and frontend typecheck pass.
- [ ] About renders correctly on mobile and desktop, with an accurate last-updated date.

## Files to touch

- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/about/_components/sources-table.tsx`
- `apps/web/src/app/data/page.tsx`
- `tests/e2e/about.spec.ts` (new, if appropriate to existing test setup)

## Notes

Scope proposed for confirmation per AGENTS.md. Await the owner's public email; do not infer it from private Git configuration. Preserve the three pre-existing modified files and exclude unrelated screenshots from commits.
