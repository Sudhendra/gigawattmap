# 045 — Restore typechecking of news test fixtures

**Status:** done
**Depends on:** none
**Estimate:** 10 minutes

## Context

The existing news tests index three known fixture entries through an array type.
Strict indexed-access checking makes those expressions possibly undefined and blocks production builds.

## Acceptance criteria

- [x] The three fixture lookups explicitly assert their known presence, without suppressing TypeScript diagnostics.
- [x] News helper tests and frontend typecheck pass.

## Files to touch

- `apps/web/src/components/announcements-feed/announcements-helpers.test.ts`

## Notes

Release prerequisite discovered while validating task 044. No runtime behavior changes.
