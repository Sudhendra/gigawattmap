# 015 — Generate TypeScript types from Pydantic schemas

**Status:** done
**Depends on:** 009, 002
**Estimate:** 2 hours

## Context

`opendc/schemas.py` (Pydantic v2) is the canonical schema. Hand-syncing TS types in `packages/types` is fragile. Generate TS from Pydantic on every pipeline build.

## Acceptance criteria

- [x] `data-pipeline/opendc/cli.py` adds a `gen-types` command that:
  - Emits JSON Schema from every Pydantic model via `.model_json_schema()`
  - Writes to `packages/types/src/generated/schema.json`
  - Runs `json-schema-to-typescript` (via pnpm) to produce `packages/types/src/generated/schema.ts`
  - Output is committed (not gitignored) so TS users don't need Python to build
- [x] `packages/types/src/index.ts` re-exports the generated types alongside the hand-written ones (generated overrides where name collides; hand-written supplements with UI-specific aliases like `LayerId`)
- [x] Pre-commit hook: if `schemas.py` changed without regenerating, commit fails
- [x] Smoke test: modify a Pydantic model, run `make gen-types`, verify TS file diff

## Files to touch

- `data-pipeline/opendc/cli.py` (new `gen-types` command)
- `data-pipeline/opendc/typegen.py` (extraction logic)
- `packages/types/src/generated/.gitkeep`
- `packages/types/src/index.ts` (update re-exports)
- `packages/types/package.json` (add json-schema-to-typescript as devDep)
- `.githooks/pre-commit` (activated via `git config core.hooksPath .githooks`)
- `data-pipeline/Makefile` (`gen-types` and `check-types-fresh` targets)

## Notes

- Pydantic → JSON Schema → TS is the least-magic path. It handles enums, optionals, nested models predictably.
- Flagging unions (discriminated unions) require `Literal` types in Pydantic — already handled by pydantic v2.
- Chose `.githooks/` + `core.hooksPath` over husky to avoid a Node devDep for a single hook (per AGENTS.md dependency policy).
- Generated TS exports model interfaces (`Datacenter`, `Operator`, `PowerPlant`, `Cable`, `CableLanding`, `Announcement`); hand-written modules continue to export documented enum aliases (`DatacenterTier`, `FuelType`, ...) and the UI-only `LayerId`.
- Smoke test verified: adding `smoke_test_field: str | None = None` to `Operator` produced a `smoke_test_field?: SmokeTestField` line in the generated TS.
