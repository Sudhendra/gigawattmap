# 036 — Fix duplicate @types/react resolution breaking web build

**Status:** done
**Depends on:** none
**Estimate:** 30 min

## Context

`pnpm --filter web build` failed at HEAD with ~23 `Suspense cannot be used as a JSX component` errors. Root cause via `tsc --traceResolution`: web simultaneously resolved `@types/react@18.3.28` (pulled by `next` and `sonner` peer-dep `*`) AND `@types/react@19.2.14`. `react/jsx-runtime` resolved to 18.x while `react` resolved to 19.x, producing JSX type mismatches.

This blocked verification of task 025b, but the fix is unrelated to share-modal/OG work and warrants its own commit per AGENTS.md "never mix two task cards" rule.

## Acceptance criteria

- [x] Root `package.json` pins a single `@types/react` + `@types/react-dom` major via pnpm `overrides`.
- [x] `pnpm install --force` regenerates lockfile with single resolution.
- [x] `pnpm --filter web build` exits 0.
- [x] `pnpm --filter web test` passes (84/84).
- [x] `pnpm --filter api typecheck` exits 0 (api consumes React only via `createElement`, compatible with both 18 and 19).
- [x] `pnpm --filter api test` passes (61/61).

## Files to touch

- `package.json` — add `pnpm.overrides` block
- `pnpm-lock.yaml` — regenerated

## Notes

- Pre-existing 3 typecheck errors in `apps/web/src/components/announcements-feed/announcements-helpers.test.ts` (`noUncheckedIndexedAccess` on test arrays) are unrelated, do not block the Next build, and will be addressed in a separate chore.
