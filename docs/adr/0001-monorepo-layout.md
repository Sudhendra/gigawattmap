# ADR 0001 — Monorepo layout with pnpm + Turbo

**Status:** Accepted
**Date:** 2026-04-17

## Context

Gigawatt Map is multi-surface from day one: a Next.js web app, a Cloudflare Workers API, shared TypeScript types, and a shared UI kit. A Python data pipeline lives alongside but is independent.

We have three obvious options:

1. **Polyrepo** — one repo per surface.
2. **Monorepo with Nx** — full-featured, but heavy for a solo project.
3. **Monorepo with pnpm workspaces + Turbo** — the minimal viable monorepo.

## Decision

Use pnpm workspaces + Turbo for the TypeScript monorepo. Keep the Python data pipeline in the same repo but outside the TS workspace (under `data-pipeline/` with its own `pyproject.toml`).

Structure:
```
apps/
  web/        # Next.js 15 (App Router)
  api/        # Cloudflare Workers
packages/
  types/      # @gigawattmap/types — shared Datacenter/PowerPlant/Cable/etc.
  ui/         # @gigawattmap/ui   — shared components (if needed)
data-pipeline/  # Python, uv-managed, entirely separate
docs/
  adr/
tasks/
```

## Consequences

**Positive:**
- One `pnpm install`, one CI pipeline, one version of shared types.
- Cross-package refactors are safe and atomic.
- Turbo caches builds — web + api build in parallel, fast CI.
- Python stays independent — no `poetry2nix` weirdness.

**Negative:**
- pnpm workspace quirks occasionally surprise (phantom deps, peer deps).
- Turbo adds a layer of config to learn.
- Mixing Python and TypeScript in one repo means two toolchains in CI (acceptable — this is already the stack for most modern data products).

## Alternatives considered

- **Nx:** too much machinery for one person. The plugin ecosystem is great but the generator complexity isn't worth it at this scale.
- **Yarn Berry PnP:** strict mode surfaces real bugs but fights Next.js and MapLibre's dynamic imports.
- **Bun workspaces:** promising but still immature for production Workers deployments.
