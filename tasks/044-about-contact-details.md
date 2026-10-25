# 044 — Correct About contact details

**Status:** done
**Depends on:** 023
**Estimate:** 1 hour

## Context

The About page contains a placeholder contact address. Existing uncommitted changes
already correct repository links and must be preserved.

## Acceptance criteria

- [x] About displays Sudhendra Kambhamettu and the exact public email supplied by the owner with a matching mailto link.
- [x] Repository links point to `https://github.com/Sudhendra/gigawattmap`; any personal GitHub link points to the owner-confirmed profile.
- [x] A regression check catches obsolete repository/contact links; relevant tests and frontend typecheck pass.
- [x] About renders correctly on mobile and desktop, with an accurate last-updated date.

## Files to touch

- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/about/_components/sources-table.tsx`
- `apps/web/src/app/data/page.tsx`
- `apps/web/src/app/about/contact.test.ts`
- `apps/web/src/components/app-header.tsx`
- `apps/web/src/components/cmdk-hint-button.tsx`

## Notes

Scope proposed for confirmation per AGENTS.md. Await the owner's public email; do not infer it from private Git configuration. Preserve the three pre-existing modified files and exclude unrelated screenshots from commits.

Owner confirmed the repository URL and public email on October 24. Contact regression test, strict typecheck, and isolated production build pass. Playwright confirmed the email link and no document overflow at 390 px (previously 437 px); desktop checked at 1440 px. Corrected the curated-data link to the actual CSV path. Shared header spacing was required to satisfy the mobile acceptance criterion. Deployment follows this commit.
