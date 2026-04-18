# Task Index

Tasks are numbered and executed in order. Each card is one commit.

## Week 1 — scaffolding and first pixels

- [000 — Bootstrap](./000-bootstrap.md) · repo baseline files
- [001 — Monorepo scaffold](./001-monorepo-scaffold.md) · pnpm + Turbo + tsconfig base
- [002 — @gigawattmap/types](./002-types-package.md) · shared type definitions
- [003 — Next.js web scaffold](./003-web-app-scaffold.md) · App Router + Tailwind v4 + design tokens
- [004 — MapLibre hello world](./004-maplibre-hello-world.md) · dark basemap + PMTiles protocol
- [005 — Seed data + deck.gl](./005-seed-data-deckgl.md) · 20 hand-curated AI campuses rendered
- [006 — Intelligence card](./006-intelligence-card.md) · the signature drawer UI
- [007 — Viewport HUD](./007-viewport-hud.md) · live in-bounds stats strip
- [008 — Layer controls](./008-layer-controls.md) · top-left toggles
- [009 — Pipeline scaffold](./009-pipeline-scaffold.md) · Python side (uv + typer + pydantic)

## Week 2 — real data

- [010 — OSM ingestion](./010-osm-ingestion.md) · the foundation
- [011 — GEM power plants](./011-gem-power-plants.md) · global power-plant layer
- [012 — Submarine cables](./012-cables-im3.md) · TeleGeography v3 API
- [013 — PMTiles build + R2 upload](./013-tiles-upload.md) · the publish pipeline
- [014 — Curated AI campuses](./014-curated-campuses.md) · 50+ hand-curated + merge logic
- [015 — Generate TS types from Pydantic](./015-gen-types.md) · keep schemas in sync
- [016 — Cloud provider regions](./016-cloud-regions.md) · AWS/Azure/GCP/Oracle/Alibaba metros
- [017 — Substation proximity](./017-substation-proximity.md) · the "magic" join
- [018 — Opposition layer](./018-opposition-layer.md) · Data Center Watch
- [019 — Submarine cable animation](./019-cables-animation.md) · the signature visual

## Week 3 — intelligence + launch

- [020 — Ticker panel](./020-ticker-panel.md) · market overlay + Finnhub proxy
- [021 — Announcements feed](./021-announcements-feed.md) · curated news strip (engineering + 10-entry seed)
- [021b — Announcements editorial backfill](./021b-announcements-backfill.md) · grow seed from 10 → ≥50 entries
- [022 — Cmd+K search](./022-search.md) · Fuse.js-powered command palette
- [023 — About page](./023-about-page.md) · methodology + attribution
- [024 — Downloads + public API](./024-downloads-api.md) · data as first-class output
- [025 — OG images + share flow + launch](./025-og-share-launch.md) · ship it

---

## Task card states

- `todo` — ready to be picked up (if dependencies are `done`)
- `in-progress` — currently being worked
- `blocked` — flagged blocker in Notes
- `done` — committed and passing acceptance criteria

## Protocol summary

See [`CLAUDE.md`](../CLAUDE.md) at the repo root for the full execution protocol.

Short form:
1. Pick lowest-numbered `todo` with all deps `done`
2. Mark `in-progress`, commit
3. Implement, test, verify acceptance criteria
4. Mark `done`, commit with `feat(NNN): <title>`
5. Move to next
