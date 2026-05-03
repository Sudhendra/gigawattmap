# Gigawatt Map

> **Every AI datacenter and the grid that feeds it.**

An open-source intelligence atlas for the AI-infrastructure era. Where
datacenters are. Who owns them. How much power they pull. Which substations
serve them. Which projects got blocked. And which stocks it all flows through.

**[gigawattmap.com](https://gigawattmap.com)** · [SPEC.md](./SPEC.md) · [AGENTS.md](./AGENTS.md) · [tasks/](./tasks/)

---

## What it is

Gigawatt Map is a map-first web app that turns public datasets — OpenStreetMap,
Global Energy Monitor, TeleGeography, WRI Aqueduct, Data Center Watch — into a
single navigable picture of the AI infrastructure buildout.

Every pin is contextualized. Clicking a datacenter opens an **intelligence
card**: nearest substation, likely power source, known tenants, community
opposition, and market-ticker exposure. Nothing is invented; if a value is
unknown we say so and link to the contribute form.

**Target audience (in priority order):**

1. The AI infra investor — "I hold VRT/EQIX and want to know where the next
   10 GW is landing."
2. The analyst / journalist — "Meta just announced Hyperion. Show me every
   adjacent utility filing."
3. The developer / operator — "I'm scouting a 200 MW site in ERCOT."
4. The curious technologist or policy person.
5. The educator / student.

---

## Features (v1 — shipped / in-progress)

| Feature | Status |
|---------|--------|
| 10 000+ datacenter polygons worldwide (OSM) | shipped |
| ~50 hand-curated AI campuses (Stargate, Hyperion…) with real MW + tenants | shipped |
| 164 cloud-provider region markers (AWS / Azure / GCP / Oracle / Alibaba) | shipped |
| Intelligence card — substation proximity, power plant linkage, operator, status | shipped |
| Submarine cable animation (TeleGeography, deck.gl ArcLayer) | shipped |
| Ticker panel — real-time-ish prices + click-to-filter map by operator | shipped |
| Viewport HUD — "Visible: 247 DCs · ~8.4 GW est · 62 operators" | shipped |
| Deals & announcements feed (curated, map-pinned) | shipped |
| Cmd+K search (Fuse.js) | shipped |
| Opposition layer — 934 blocked / delayed projects (Data Center Watch) | shipped |
| About + attribution page, methodology, confidence badges | shipped |
| OG images + share flow | in-progress (task 025) |
| Downloads API — GeoJSON / CSV / PMTiles, per-source, per-operator | in-progress (task 024) |

---

## Tech stack

```
apps/web       Next.js 15 (App Router) · TypeScript strict · Tailwind v4
               MapLibre GL JS v5  — basemap, vector layers, globe toggle
               deck.gl v9         — arcs, heatmaps, 3D extrusions
               PMTiles            — serverless tiles from Cloudflare R2
               Zustand            — UI state
               TanStack Query     — data fetching + cache
               Fuse.js            — Cmd+K search
               Radix UI           — accessible primitives
               Motion             — animations

apps/api       Cloudflare Workers
               /api/v1/datacenters — bbox/filter queries
               /api/v1/tickers    — proxied Finnhub (10-min cache)
               /api/v1/og         — OG image generation (task 025)

data-pipeline  Python 3.11 · uv · ruff · mypy --strict
               opendc/sources/    — OSM, GEM, WRI, TeleGeography, …
               opendc/transform/  — normalize, enrich, merge
               opendc/tiles/      — tippecanoe → PMTiles → R2
```

Hosting: **Cloudflare Pages + R2 + Workers**. At 100 K MAU the infrastructure
cost is under $50/month (R2 has no egress fees).

---

## Local development

### Prerequisites

- **Node 22.x + pnpm** — `corepack enable && corepack prepare pnpm@latest --activate`
- **Python 3.11+ + uv** — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **tippecanoe** — `brew install tippecanoe` (macOS) or build from source

Full setup notes: [`docs/dev-setup.md`](./docs/dev-setup.md)

### Run the web app

```sh
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in values
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local   # optional for ticker/OG endpoints

# 3. Start the dev server
pnpm dev
```

The app loads bundled seed GeoJSON by default (no R2 required). Set
`NEXT_PUBLIC_PMTILES_BASE` to a real R2 URL to load full tiles.

### Run the data pipeline

```sh
cd data-pipeline

# Ingest a small sample of every source (~100 rows each)
uv run python -m opendc.cli ingest all --sample

# Build PMTiles from local data
uv run python -m opendc.cli tiles build

# Upload to R2 (requires R2 credentials in .env.local)
uv run python -m opendc.cli tiles upload --dry-run
uv run python -m opendc.cli tiles upload
```

### Run tests

```sh
pnpm test          # all workspaces via Turbo
pnpm typecheck     # strict TypeScript across all packages
pnpm lint          # ESLint + ruff
```

---

## Data sources

Every dataset rendered on the map is documented below with its upstream URL,
license, and ingest module. Per-row provenance is stored in each feature's
`source_url` property — open the intelligence card on any object to see
exactly where the claim came from.

When a layer ships in production it must also appear in the `/about` page
attribution panel (task 023). This table is the canonical source of truth.

| # | Layer | Source | License | Ingest |
|---|-------|--------|---------|--------|
| 1 | AI campuses (~50) | Hand-curated from operator press releases, FERC filings, county permits, news | Our own work — CC0 | [`opendc/sources/curated.py`](./data-pipeline/opendc/sources/curated.py) |
| 2 | Cloud regions (164) | Hand-curated from each provider's public regions docs | Our own work — CC0 | [`opendc/sources/cloud_regions.py`](./data-pipeline/opendc/sources/cloud_regions.py) |
| 3 | Datacenter footprints | [OpenStreetMap](https://www.openstreetmap.org/) Overpass API | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — share-alike | [`opendc/sources/osm.py`](./data-pipeline/opendc/sources/osm.py) |
| 4 | Substations, plants, lines | [OpenStreetMap](https://www.openstreetmap.org/) Overpass API | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — share-alike | [`opendc/sources/osm_power.py`](./data-pipeline/opendc/sources/osm_power.py) |
| 5 | Submarine cables | [TeleGeography Submarine Cable Map](https://www.submarinecablemap.com/) API v3 | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) — **non-commercial only** | [`opendc/sources/telegeography.py`](./data-pipeline/opendc/sources/telegeography.py) |
| 6 | Basemap tiles | [OpenFreeMap](https://openfreemap.org/) Liberty (OSM-derived) | ODbL for data, MIT for style | Loaded by MapLibre in [`map.tsx`](./apps/web/src/components/map/map.tsx) |
| 7 | Opposition tracker (934 entries) | [`Georgeingebretsen/datacenter-opposition-tracker`](https://github.com/Georgeingebretsen/datacenter-opposition-tracker) compiled from Data Center Watch, Robert Bryce, FracTracker | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [`opendc/sources/opposition.py`](./data-pipeline/opendc/sources/opposition.py) |

**Sources scaffolded, not yet rendering:**

| Source | Status | License | Module |
|--------|--------|---------|--------|
| [Global Energy Monitor — GIPT](https://globalenergymonitor.org/projects/global-integrated-power-tracker/) | CLI wired, not yet rendered | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [`opendc/sources/gem.py`](./data-pipeline/opendc/sources/gem.py) |

### Licensing rules we follow

- **Per-row `source_url` is mandatory** for every feature in the UI. A claim
  with no audit trail is a bug.
- **OSM (ODbL) is share-alike.** We publish per-source downloads so downstream
  users get OSM-flagged data separately from other licensed sources.
- **TeleGeography cables are CC BY-NC-SA.** Any monetization requires removing
  or replacing this layer first.
- **No scraping anything `robots.txt` forbids.** No copyrighted content
  committed to this repo. Large artifacts (PMTiles, raw fetches) live in
  Cloudflare R2, not git.
- If you find a source used without proper attribution, open an issue — it is
  a bug we will fix immediately.

---

## Repository layout

```
gigawattmap/
├── apps/
│   ├── web/          Next.js app — map, intelligence card, all UI
│   └── api/          Cloudflare Worker — tickers, OG images, data API
├── packages/
│   ├── types/        Shared TypeScript types (generated from Pydantic schemas)
│   └── ui/           Shared UI primitives
├── data-pipeline/    Python data pipeline (opendc/)
│   └── opendc/
│       ├── sources/  One module per upstream source
│       ├── transform/ Normalize, enrich, merge
│       └── tiles/    tippecanoe → PMTiles → R2
├── data/
│   └── seeds/        Small GeoJSON/CSV samples for local dev (no R2 needed)
├── docs/             ADRs, dev-setup guide, launch notes
├── tasks/            Task cards (NNN-kebab-title.md)
├── SPEC.md           Full product spec + data architecture
└── AGENTS.md         Engineering conventions for humans and AI agents
```

---

## Contributing

The map is only as good as its data. The easiest way to contribute is to
improve the hand-curated datasets:

- **`data-pipeline/opendc/data/ai-campuses.csv`** — add a missing AI campus
  or correct a MW estimate. Schema is documented at the top of the file.
- **`data-pipeline/opendc/data/operators.csv`** — add a missing operator
  canonical name or ticker mapping.
- **`data-pipeline/opendc/data/cloud-regions.json`** — update a cloud
  provider region that has launched or been deprecated.

For code contributions, read [`AGENTS.md`](./AGENTS.md) before opening a PR —
it covers conventions, commit format, testing requirements, and the dependency
policy. One-task-card = one PR is the rule.

Found a data error? Open an issue with a source URL. Found a licensing
problem? Flag it immediately — those get same-day fixes.

---

## Performance targets

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint (cold 4G) | < 1.5 s | ~1.2 s |
| Map panning at zoom 4, 10 K features | 60 fps | 60 fps |
| JS bundle (map page, gzipped) | < 350 KB | ~280 KB |
| API p95 (bbox query) | < 200 ms | — |

---

## License

Code: **MIT** — see [`LICENSE`](./LICENSE).

Data outputs: license depends on the upstream source (see table above). The
hand-curated AI campus and cloud-region datasets are released under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) — do whatever
you want with them.

---

*Maintained by Sudhendra. Open for contributors.*
*FERC large-load interconnection rulemaking lands April 30, 2026 — the timing is not accidental.*
