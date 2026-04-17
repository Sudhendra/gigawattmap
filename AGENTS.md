# AGENTS.md — Operating Manual for AI Coding Agents

> This file is the canonical source of truth for how code in the **Gigawatt Map** repo should be written, tested, and shipped. Read it in full before touching any other file. Re-read it when you are unsure.

## Core principles

1. **DRY, but pragmatic.** Duplicate twice before you abstract. No speculative base classes.
2. **Explicit > clever.** No magic. If someone reading the code in 6 months has to look up what it means, it is wrong.
3. **Production-ready by default.** Every function handles its own error cases. Every API call has a timeout. Every file parse has a schema check.
4. **Tests prove behavior, not coverage.** A test that passes but does not describe a user-visible behavior is worthless.
5. **Small, reversible commits.** One task card = one logical commit. Never mix refactors with features.
6. **The user is one person.** This is a solo project. Do not introduce microservices, Kubernetes, GraphQL, or anything else that requires a platform engineer.

## Before you start any task

1. Read `SPEC.md` if you have not already.
2. Read the relevant task card in `tasks/`.
3. `git status` to confirm a clean working tree.
4. Check for a matching open PR — do not duplicate work.
5. If the task's acceptance criteria are unclear, write them out in the task card first, commit that change, and ask for confirmation before implementing.

## Task card protocol

Task cards live in `tasks/NNN-kebab-case-title.md`. They have this structure:

```markdown
# NNN — Task title

**Status:** todo | in-progress | blocked | done
**Depends on:** [list of task NNNs, or none]
**Estimate:** <time>

## Context
(why this exists, 2-3 sentences)

## Acceptance criteria
- [ ] Mechanically checkable criteria (a command exits 0, a page renders, a test passes)

## Files to touch
- Specific paths

## Notes
Links, gotchas, design hints.
```

**Rules:**
- One card = at most one day of work. If it's bigger, split it.
- `Acceptance criteria` must be mechanically checkable.
- When finished, update `Status: done` in the card, commit with `feat(NNN): <title>`.
- If blocked, add `Blocked by:` note, commit, move on to next independent task.
- **Do not merge multiple task cards into one commit.**

## Commit conventions

Conventional Commits, with the task number:

```
feat(NNN): add intelligence card drawer
fix(NNN): handle missing operator field in OSM
refactor(NNN): extract PMTiles URL builder
chore(NNN): bump maplibre-gl to 5.1.0
docs(NNN): add ADR for choosing deck.gl over L7
test(NNN): cover operator fuzzy-match edge cases
```

The body of the commit says _why_, not _what_.

## Language-specific rules

### TypeScript

- `strict: true` is non-negotiable. No `any`, no `@ts-ignore` without an inline comment explaining why.
- Prefer `type` over `interface` except when declaration merging is needed.
- Shared types live in `packages/types/src/` and import as `@gigawattmap/types`.
- Every function with a return type more complex than a primitive gets an explicit return annotation.
- Error handling: throw typed errors (e.g. `class DataSourceError extends Error`). Never `throw "string"`.
- Async: prefer `async/await`. Never mix `.then()` with `await` in the same function.
- No barrel re-exports (`index.ts` files that just re-export) — they break tree-shaking and editor jump-to-definition. Exception: the pure-types package may use one.

### React / Next.js

- App Router only. No `pages/` directory.
- Server Components by default. Only add `"use client"` where you need state, effects, or browser APIs.
- Co-locate components with their routes in `app/` when route-specific. Shared components go in `src/components/`.
- One component per file. File name matches the component.
- Styling: Tailwind v4 via CSS variables in `styles/globals.css`. No CSS-in-JS.
- Never use `localStorage` / `sessionStorage` without a `typeof window !== 'undefined'` guard.

### Python (data pipeline)

- 3.11+. `uv` for dependency management. `ruff` for lint + format.
- Type hints everywhere (`mypy --strict` passes).
- CLI via `typer`. Data validation via `pydantic` v2. Geo ops via `geopandas` / `shapely`.
- HTTP via `httpx`.
- Never `print()` — use `rich.console.Console` or `logging`.
- Every external API call wrapped in a retry+backoff helper in `opendc/utils/http.py`.

## Where things live

**TypeScript:**
- Shared between web and api → `packages/types` or `packages/ui`
- Only web → `apps/web/src/`
- A route → `apps/web/src/app/<route>/`
- Pure function, no React → `apps/web/src/lib/`
- UI component → `apps/web/src/components/`
- Route-specific UI → `apps/web/src/app/<route>/_components/`

**Data:**
- Fetched from the internet → `data-pipeline/opendc/sources/` (Python)
- Hand-maintained by humans → `data/curated/<n>.csv` with a schema comment at the top
- Small sample for local dev → `data/seeds/`
- Built artifacts (PMTiles, merged GeoJSON) → `data-pipeline/out/` (gitignored, uploaded to R2)

## Testing strategy

Three tiers — each task card specifies which are required.

1. **Unit** — pure functions, in same dir as code. `foo.test.ts` next to `foo.ts`. Vitest.
2. **Integration** — crosses one boundary (DB, HTTP, file). `tests/integration/` per app. Mocks OK.
3. **E2E** — full user flow. `tests/e2e/` at repo root. Playwright. Only for critical paths (load the map, click a DC, open the card, share the URL).

**Every bug fix starts with a failing test.** No exceptions.

Coverage is not a target. Meaningful tests are.

## Data pipeline rules

- Every `source` module exposes `fetch()`, `normalize()`, `validate()` with a `--sample` flag (~100 rows).
- Every `transform` module is a pure function: input DataFrame → output DataFrame. No side effects.
- Every pipeline run produces `out/manifest.json` with source versions, row counts, timestamps, hashes.
- Never commit files >10 MB. Large artifacts → R2.
- Schemas are Pydantic models in `opendc/schemas.py` — the source of truth. TypeScript types in `packages/types` are generated from these (task 015).

## Performance budgets

- First contentful paint <1.5s on cold 4G
- Map: 60fps panning at zoom 4 with 10k features (after clustering)
- JS bundle <350KB gzipped on the map page
- API: p95 <200ms for bbox queries

If a change blows a budget, the task is not done. Profile before optimizing; do not guess.

## Licensing + attribution (non-negotiable)

- Every data source appearing in the UI has visible attribution on `/about` AND in relevant tooltips.
- OSM data is ODbL: share-alike applies. Ship per-source downloads, never a single merged download.
- TeleGeography cables are CC BY-NC-SA 3.0: **non-commercial only.** If we ever add ads, paid tiers, or enterprise licensing, remove or replace this layer.
- Never scrape a source that robots.txt forbids.
- Never commit copyrighted content to the repo.

## Dependency policy

Before adding a new package, answer in the commit message:

1. What does this do that I cannot do in 30 lines of my own code?
2. When was it last published? (>1y ago → find an alternative)
3. Weekly download count? (<10k → find an alternative)
4. TypeScript types shipped or via DefinitelyTyped?
5. Bundle size impact? (check bundlephobia.com)

Auto-approved: packages listed in `SPEC.md §4`. Everything else needs an ADR.

## When you're stuck

1. Re-read the task card. Is the acceptance criteria really clear?
2. Search the codebase for similar patterns (`grep -r`).
3. Check `docs/adr/` for relevant decisions.
4. Write the blocker in the task card's `Notes`, commit, mark `Status: blocked`.
5. Move to the next independent task.

Do NOT:
- Silently change scope.
- Invent features not in the task card.
- Merge a refactor PR into a feature task.
- Disable a failing test to get green CI.
- Add a dependency without an ADR.

## Security baseline

- No secrets in repo. `.env.local` gitignored. Document in `.env.example`.
- All API routes rate-limit by IP at the Worker edge.
- All user-provided strings validated before use in queries, URLs, or HTML.
- CSP headers set in `next.config.ts`.
- `pnpm audit` runs in CI. High-severity findings block merge.

## The bar

If a reasonable senior engineer reviewed your PR, would they merge it without comments? If not, keep polishing. This repo is a showcase. Every commit is part of a portfolio.
