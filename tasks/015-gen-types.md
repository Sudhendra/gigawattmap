# 015 — Generate TypeScript types from Pydantic schemas

**Status:** in-progress
**Depends on:** 009, 002
**Estimate:** 2 hours

## Context

`opendc/schemas.py` (Pydantic v2) is the canonical schema. Hand-syncing TS types in `packages/types` is fragile. Generate TS from Pydantic on every pipeline build.

## Acceptance criteria

- [ ] `data-pipeline/opendc/cli.py` adds a `gen-types` command that:
  - Emits JSON Schema from every Pydantic model via `.model_json_schema()`
  - Writes to `packages/types/src/generated/schema.json`
  - Runs `json-schema-to-typescript` (via pnpm) to produce `packages/types/src/generated/schema.ts`
  - Output is committed (not gitignored) so TS users don't need Python to build
- [ ] `packages/types/src/index.ts` re-exports the generated types alongside the hand-written ones (generated overrides where name collides; hand-written supplements with UI-specific aliases like `LayerId`)
- [ ] Pre-commit hook: if `schemas.py` changed without regenerating, commit fails
- [ ] Smoke test: modify a Pydantic model, run `make gen-types`, verify TS file diff

## Files to touch

- `data-pipeline/opendc/cli.py` (new `gen-types` command)
- `data-pipeline/opendc/typegen.py` (extraction logic)
- `packages/types/src/generated/.gitkeep`
- `packages/types/src/index.ts` (update re-exports)
- `packages/types/package.json` (add json-schema-to-typescript as devDep)
- `.husky/pre-commit` or `lint-staged` config
- `data-pipeline/Makefile` (add `gen-types` target)

## Notes

- Pydantic → JSON Schema → TS is the least-magic path. It handles enums, optionals, nested models predictably.
- Flagging unions (discriminated unions) require `Literal` types in Pydantic — already handled by pydantic v2.
