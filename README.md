# Gigawatt Map

> **Every AI datacenter and the grid that feeds it.**
>
> A public intelligence atlas for the AI-infrastructure era. Where datacenters are. Who operates them. How much power they pull. Where that power comes from. Which utilities serve them. Which submarine cables land nearby. Which projects got blocked. Which deals just closed. And which stocks it all flows through.

**Status:** pre-v0.1 (build plan ready, no code yet)

---

## What's in this folder

This is a **build plan**, not source code. Hand it to OpenCode (or any capable coding agent) and it will scaffold the real repo from these documents.

| File | Purpose |
|---|---|
| [`SPEC.md`](./SPEC.md) | Product spec: what we're building, why, feature roadmap, data sources, tech stack, licensing |
| [`AGENTS.md`](./AGENTS.md) | How to write code in this repo: conventions, testing, commits, dependency policy |
| [`CLAUDE.md`](./CLAUDE.md) | Execution prompt for OpenCode — read this first if you're an AI coding agent |
| [`tasks/`](./tasks/) | 25 numbered, sequenced task cards — one day of work each |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records |

## How to use this with OpenCode

1. Create an empty git repo named `gigawattmap` on GitHub.
2. Copy `SPEC.md`, `AGENTS.md`, `CLAUDE.md`, `tasks/`, and `docs/` into the repo root.
3. Delete this `README.md` (handoff note) — or keep it, your call.
4. Point OpenCode at the repo with the prompt in `CLAUDE.md`.
5. OpenCode executes tasks `000` → `025` in order. Each task produces exactly one commit.

**Expected time to v0.1:** ~3 weeks of OpenCode runs, with you reviewing each commit.

## Executive summary

**Product.** A free, beautiful, global map of every datacenter — contextualized with power, cables, water, opposition, deals, and public-market exposure. Built for the AI-infrastructure era.

**Stack.** Next.js 15 + MapLibre v5 + deck.gl v9 + PMTiles on Cloudflare (web) · Python + uv + tippecanoe (data pipeline) · Cloudflare Workers (API).

**Target user.** AI-infra investor / analyst / developer who wants to know where the next GW is landing, which utility serves it, and which stocks are exposed — in under 30 seconds.

**Why now.** FERC's large-load interconnection rulemaking lands April 30, 2026. Blackstone just filed for a $2B data-center REIT IPO. Hyperscaler capex will exceed $600B in 2026. No free, beautiful, global map of all this exists today.

See [`SPEC.md`](./SPEC.md) for the full picture.

## Data sources (summary — full list in SPEC.md §3)

| Source | License | Role |
|---|---|---|
| OpenStreetMap (`telecom=data_center`) | ODbL | Primary datacenter geometry |
| IM3 PNNL Data Center Atlas | ODbL | US-specific validation layer |
| Global Energy Monitor (GIPT) | CC BY 4.0 | Global power plants |
| WRI Global Power Plant Database | CC BY 4.0 | Power plant backfill |
| EIA-860 / 860M | Public domain | US generator inventory |
| TeleGeography Submarine Cable Map | CC BY-NC-SA 3.0 | Cables (non-commercial only) |
| Data Center Watch | Editorial citation | US project opposition |
| Hand-curated AI campuses | CC BY-SA 4.0 (ours) | The 50+ biggest AI buildouts |

## License

- **Code:** MIT
- **Derived data:** per-source (see `/data/attribution.md` when live)
- Attribution required whenever displaying or redistributing

## Credit

Inspired by [OpenGridWorks](https://opengridworks.com), [Open Infrastructure Map](https://openinframap.org), and the [IM3 PNNL Data Center Atlas](https://im3.pnnl.gov/datacenter-atlas). We build on their shoulders and aim to complement, not replace.
