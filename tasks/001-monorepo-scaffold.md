# 001 — Monorepo scaffold (pnpm + turbo)

**Status:** done
**Depends on:** 000
**Estimate:** 45 min

## Context

We need a monorepo because we have: (a) a Next.js web app, (b) a Cloudflare Workers API, (c) shared types, (d) UI kit. pnpm workspaces + Turbo is the default stack.

## Acceptance criteria

- [ ] `pnpm-workspace.yaml` declares `apps/*` and `packages/*`
- [ ] `package.json` at root has `packageManager: "pnpm@9.12.0"`, turbo devDep, scripts `dev/build/lint/typecheck/test`
- [ ] `turbo.json` with pipeline for `build`, `lint`, `typecheck`, `test`
- [ ] `tsconfig.base.json` with `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`, `paths: { "@gigawattmap/*": ["./packages/*/src"] }`
- [ ] Empty stubs at `apps/web/`, `apps/api/`, `packages/types/`, `packages/ui/` (each with its own `package.json` extending base)
- [ ] `pnpm install` runs clean with zero warnings
- [ ] `pnpm typecheck` exits 0 (even if empty — proves wiring)

## Files to touch

- `pnpm-workspace.yaml`
- `package.json` (root)
- `turbo.json`
- `tsconfig.base.json`
- `apps/web/package.json` + `tsconfig.json`
- `apps/api/package.json` + `tsconfig.json`
- `packages/types/package.json` + `tsconfig.json` + `src/index.ts` (empty export)
- `packages/ui/package.json` + `tsconfig.json` + `src/index.ts` (empty export)

## Notes

Set all packages to `"private": true` except eventually `@gigawattmap/types` if we want to publish. For now keep everything private.
