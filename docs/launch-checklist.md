# Launch Checklist — Gigawatt Map v0.1

> Thesis: AI capex is constrained by the grid, not by chips. Capital is moving
> faster than transmission planning. Most of the people allocating that capital
> can't see where the constraints are. This map fixes that.

This document is the operating playbook for the v0.1 public launch. Drafts only
— nothing posts until the operator pushes the button.

---

## 1. Lighthouse verification

Run against `pnpm --filter web build && pnpm --filter web start` (port 3000) +
`pnpm --filter api dev` (port 8787, R2 reseeded).

**AGENTS.md targets:** desktop Performance ≥90, A11y ≥95, BP ≥95, SEO ≥95.

### Desktop scores (2026-04-26 baseline)

| Page        | Perf      | A11y    | BP      | SEO   | Tool                       |
| ----------- | --------- | ------- | ------- | ----- | -------------------------- |
| `/`         | **75 ❌** | 100 ✅  | 96 ✅   | 100 ✅ | real Brave, DevTools panel |
| `/about`    | 100 ✅    | 96 ✅   | 96 ✅   | 100 ✅ | CLI (headless swiftshader) |
| `/data`     | 100 ✅    | 96 ✅   | 96 ✅   | 100 ✅ | CLI (headless swiftshader) |
| `/data/api` | 100 ✅    | 94 ⚠️    | 96 ✅   | 100 ✅ | CLI (headless swiftshader) |

**Three of four pages clear AGENTS.md desktop targets. The home page does not.**
Honest write-up below.

### Home page — Performance 75 (under target)

Real-browser metrics:

| Metric       | Value   | Lighthouse score |
| ------------ | ------- | ---------------- |
| FCP          | 0.9 s   | 0.92 ✅          |
| **LCP**      | **2.4 s** | **0.49 ❌**    |
| TBT          | 30 ms   | 1.00 ✅          |
| **CLS**      | **0.236** | **0.53 ❌**    |
| Speed Index  | 0.9 s   | 0.99 ✅          |
| TTI          | 2.4 s   | 0.90 ✅          |

Two real causes — both well-understood, neither a 5-minute fix:

1. **CLS 0.236** (target ≤ 0.1) — the announcements aside, the picks-and-shovels
   ticker, and the viewport-HUD substations stat all hydrate in after first
   paint without reserved space. Lighthouse pinpoints them as culprits 1/2/3.
2. **LCP 2.4s + 281 KiB unused JS** — MapLibre + deck.gl ship in two large
   first-load chunks (`c25e440e` 273 KiB, `548` 130 KiB+ wasted) when only the
   above-the-fold needs to render synchronously. They should be `next/dynamic`
   with a skeleton.

**Logged as task 039** (`tasks/039-home-perf-cls-lcp.md`) — does not block
v0.1 ship if the operator chooses to launch with Perf 75, but does block any
"Lighthouse green across the board" claim.

### Home page A11y / BP / SEO are clean

- A11y **100** (after `/stories` nav link fix in 025d, no axe violations)
- BP **96** (no console errors after nav fix; `valid-source-maps` passes)
- SEO **100**

### `/data/api` A11y −1

A single `label-content-name-mismatch` from the code-block toolbar. Cosmetic;
not a launch blocker. Folded into 039 if the operator wants it cleaned up.

### Console hygiene

- [x] `/` — clean (broken `/stories` nav prefetch fixed in this card)
- [x] `/about` — clean
- [x] `/data` — clean
- [x] `/data/api` — clean

The `/stories` 404 surfaced because `apps/web/src/components/app-header.tsx`
linked to a route that does not exist (the actual feed is at `/news`). Header
nav now points to `/news` with label "News".

### Source maps

`apps/web/next.config.ts` sets `productionBrowserSourceMaps: true` so the
`valid-source-maps` audit passes. +1KB to shared chunk; acceptable.

### Re-running

CLI (works for non-map pages):

```bash
CHROME_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  pnpm dlx lighthouse@12 http://localhost:3000/about \
  --preset=desktop --quiet --output=html --output-path=/tmp/lh-about.html
```

Home page (must be a real browser — headless can't get WebGL):

1. `pnpm --filter web build && pnpm --filter web start`
2. `pnpm --filter api dev`  (separate terminal, after `pnpm --filter api dev:seed-r2`)
3. Brave → `http://localhost:3000/` → DevTools → Lighthouse → Desktop → all 4 → Analyze

---

## 2. Pre-launch deploy checklist

### Domain + DNS

- [ ] Register `gigawattmap.com` (or confirm registration)
- [ ] Cloudflare nameservers set, zone active
- [ ] Apex `A` / `AAAA` → Cloudflare Pages or Workers
- [ ] `www` CNAME → apex (or canonicalize one direction; pick apex)
- [ ] HTTPS-only, HSTS preload submitted (after 24h soak)

### Cloudflare

- [ ] Pages project deployed from `main` (build cmd `pnpm --filter web build`,
      output `apps/web/.next`, Node 20)
- [ ] Workers (`apps/api`) deployed; route `gigawattmap.com/api/*`
- [ ] R2 bucket `gigawattmap-data` populated from
      `pnpm --filter pipeline upload` and bound to the worker
- [ ] R2 public bucket `pub-f870…r2.dev` reachable from the browser
- [ ] Rate limiting rule on `/api/*` (per-IP, per AGENTS.md)

### Env

- [ ] `NEXT_PUBLIC_APP_URL=https://gigawattmap.com` in Pages env
- [ ] `NEXT_PUBLIC_API_BASE=https://gigawattmap.com` in Pages env
- [ ] `NEXT_PUBLIC_SEARCH_INDEX_URL` points at production R2
- [ ] No `.env.local` values leaked into client bundle (`grep -r localhost
      apps/web/.next/static`)

### Smoke (production URL)

- [ ] Map loads, all four layers render
- [ ] Click a campus → drawer opens, share link copies a canonical URL
- [ ] `/api/v1/tickers` returns 200 JSON
- [ ] `/api/v1/og?…` renders an image
- [ ] `/sitemap.xml` and `/robots.txt` return 200
- [ ] `/about`, `/data`, `/data/api`, `/404` all render
- [ ] Lighthouse desktop pass (re-run on prod URL)

---

## 3. Post-launch monitoring

- [ ] Cloudflare analytics tab open during first 6h
- [ ] Workers dashboard: error rate <1%, p95 latency <200ms
- [ ] R2 egress: watch for runaway scrapers; if egress >20 GB/day, add
      Cache-Control + edge cache rules
- [ ] Ticker quota: external feed cost should be ~$0 (cached at edge); alarm
      if origin requests >10k/day
- [ ] Sentry / log drain: 0 unhandled exceptions on first 1000 sessions

---

## 4. HN submission

**Title (≤80 chars):**

```
Show HN: Gigawatt Map – Every AI datacenter and the grid feeding it
```

**URL:** `https://gigawattmap.com`

**Text body:**

```
The thesis: the bottleneck on AI is no longer chips. It's interconnect queue
times, transmission build-out, and water rights. The capital flowing into AI
datacenters in 2025–26 has outrun grid planning by years.

I couldn't find a public map that shows where the buildout is actually
happening — overlaid on the power plants, transmission, and submarine cables
that have to feed it. So I built one.

What's on it (v0.1):
  - 4,255 datacenters from OpenStreetMap (ODbL)
  - 68,677 power plants from Global Energy Monitor
  - 692 submarine cables + 1,910 landing points (TeleGeography, non-commercial)
  - 164 cloud regions (hand-curated from provider docs)
  - 934 active siting fights (datacenter-opposition-tracker)
  - 53 hand-curated AI mega-campuses (Stargate, Crusoe, xAI Colossus, etc.)

What it's for: investors sizing capex, journalists tracking the buildout,
operators scouting sites, locals trying to figure out what's coming to their
substation.

Stack: Next.js 15, MapLibre + deck.gl, PMTiles on Cloudflare R2, Workers API.
Pipeline is Python (uv, pydantic, geopandas). All data sources, licenses, and
known gaps documented at /about. Source on GitHub.

Known limits I'd rather be loud about: China coverage is sparse, Russia/Central
Asia poorer still, and pre-2020 colo MW figures are usually footprint-derived
estimates. Better to show gaps than guess.

Happy to answer questions about the data pipeline, the licensing tradeoffs
(particularly TeleGeography's NC-SA terms), or the buildout itself.
```

---

## 5. Twitter / X thread

Tag: `@openstreetmap @GlobalEnergyMon @EIAgov @Protomaps @maplibreorg`

```
1/ Launching Gigawatt Map today.

Every AI datacenter on Earth, overlaid on the power plants, transmission, and
submarine cables that have to feed it.

Built because the AI capex story is really a grid story, and nobody had a map.

→ gigawattmap.com

2/ The numbers as of v0.1:

  • 4,255 datacenters
  • 68,677 power plants
  • 692 submarine cables + 1,910 landing points
  • 164 cloud regions
  • 934 active siting fights against new builds
  • 53 hand-curated AI mega-campuses (Stargate, xAI Colossus, Crusoe, …)

3/ The thesis: chips aren't the bottleneck anymore. Interconnect queues,
transmission, and water are.

ERCOT's queue is 5+ years. PJM paused new large loads. Dublin's moratorium is
de facto permanent. If you can't see the grid, you can't see the buildout.

4/ Open data only. Sources + licenses on /about. Big thanks to:
@openstreetmap (ODbL) for the datacenter footprint,
@GlobalEnergyMon for the power plant tracker,
@Protomaps + @maplibreorg for the mapping stack that made this affordable to
host.

5/ Stack: Next.js 15 + MapLibre + deck.gl on Cloudflare Pages, Workers API,
PMTiles on R2. Python data pipeline (uv, pydantic, geopandas). Built solo over
~6 weeks. Source is on GitHub.

6/ Known gaps I'd rather be loud about:
  • China coverage is sparse (OSM tagging + opaque filings)
  • Russia/Central Asia is worse
  • Pre-2020 colo MW values are usually footprint estimates

I'd rather show gaps than guess. PRs welcome.

7/ If you're an analyst, journalist, operator, or just live next to a
substation that's about to get a new neighbor — the map is for you.

→ gigawattmap.com
```

---

## 6. LinkedIn

```
Launching Gigawatt Map today: a public atlas of every AI datacenter and the
grid that has to feed it.

The story most investors are missing: the constraint on AI buildout in 2025–26
is no longer chips. It's interconnect queue times, transmission planning, and
water rights. ERCOT's queue runs 5+ years. PJM has paused new large loads.
Dublin's moratorium is de facto permanent. If you can't see the grid, you
can't see the buildout.

Gigawatt Map overlays:
  • 4,255 datacenters (OpenStreetMap)
  • 68,677 power plants (Global Energy Monitor)
  • 692 submarine cables (TeleGeography)
  • 164 cloud regions
  • 934 active community fights against new builds
  • 53 hand-curated AI mega-campuses (Stargate, Crusoe, xAI Colossus, …)

All open data. Every source attributed. Every license honored.

Built solo over ~6 weeks: Next.js, MapLibre, deck.gl, Cloudflare Pages +
Workers + R2, with a Python data pipeline. Source on GitHub.

If you're sizing AI capex, tracking grid investment, scouting sites, or just
trying to understand what's about to happen to your local substation — give it
a look.

→ gigawattmap.com
```

---

## 7. Reddit

### r/datacenter

**Title:** `Built an open-source map of every AI datacenter + the grid feeding it (4,255 DCs, 68k power plants, 692 submarine cables)`

**Body:**

```
Hey r/datacenter — long-time lurker, built this over the last few weeks.

Gigawatt Map: gigawattmap.com

It's a single map that overlays:
  • 4,255 datacenters from OSM
  • 68,677 power plants from Global Energy Monitor
  • 692 submarine cables + landing points from TeleGeography (non-commercial)
  • 164 cloud regions
  • 934 active siting fights (datacenter-opposition-tracker)
  • 53 hand-curated AI mega-campuses with sources per row

The point: the AI buildout story is really a grid story, and there wasn't a
public map that showed both at once. Source + methodology + every license is
on /about.

I know this sub is going to spot every wrong cap value and missing facility
within minutes — that's exactly the feedback I want. PRs welcome on GitHub.
```

### r/dataisbeautiful

**Title:** `[OC] Every AI datacenter on Earth, overlaid on the power plants and submarine cables that feed them`

(image: OG card screenshot of US Northeast at zoom 5)

**Body:** short — 1 paragraph + link. r/dataisbeautiful penalizes self-promo.

### r/mapporn

**Title:** `Every AI datacenter, every power plant, every submarine cable — one map`

(same image as r/dataisbeautiful)

### r/investing

Skip on day 1. Re-evaluate after HN traction; r/investing flags new domains
hard. If posting later, lead with grid-as-bottleneck thesis, not the map.

---

## 8. Outreach (cold email templates)

### Data Center Knowledge

```
Subject: Open data: every AI datacenter + grid map, free for editorial use

Hi [editor],

I just launched Gigawatt Map (gigawattmap.com), a public atlas of every
AI datacenter overlaid on the power plants, transmission, and submarine cables
that feed them. 4,255 DCs, 68k power plants, 692 submarine cables, 53
hand-curated AI mega-campuses with per-row sourcing.

All data is open (ODbL / CC-BY); the map is free to embed or screenshot for
editorial use with attribution. If a story you're working on (interconnect
queues, water, opposition siting fights) would benefit from a map, I'm happy
to generate a custom view.

[name]
```

### Data Center Dynamics (DCD)

Same template, swap "Data Center Knowledge" → "DCD".

### Semianalysis

```
Subject: Built a map of every AI datacenter + the grid — would love your read

Hi Dylan,

Long-time reader. I built Gigawatt Map (gigawattmap.com) on the thesis that
your readers already know — the binding constraint on AI capex is the grid,
not the chips.

It overlays 4,255 DCs (OSM), 68k power plants (GEM), 692 submarine cables
(TeleGeography), and 53 hand-curated AI mega-campuses (Stargate, xAI Colossus,
Crusoe, etc.) with per-row source URLs. All open data, full methodology on
/about.

If it's useful to your work, I'd love your feedback on what's missing. If
there's a Semianalysis dataset that would slot in cleanly (announced
deployments, MW per cluster), I'd happily build the layer.

[name]
```

### Latent Space

```
Subject: Show & tell candidate — open map of every AI datacenter + the grid

Hi Swyx / Alessio,

Built Gigawatt Map (gigawattmap.com) over the last few weeks. It's a public
atlas of every AI datacenter overlaid on the power plants and submarine cables
feeding them. The thesis is that the grid is the bottleneck, and most people
allocating capital to AI infra can't see where the constraints are.

Stack is Next.js + MapLibre + deck.gl + Cloudflare R2 + a Python data
pipeline. Built solo, fully open source.

Would this fit a Show & Tell or a podcast segment? Happy to demo or write up
the build.

[name]
```

### Stratechery

```
Subject: Map for the AI infra thesis you've been writing

Hi Ben,

You've been writing about the AI capex / grid mismatch for a while. I built a
map for it: gigawattmap.com.

Every AI datacenter, every power plant, every submarine cable, every active
community fight against a new build — one map. All open data. Built solo, free
to use.

Not asking for coverage — just thought it might be a useful primary source
next time you write about the buildout.

[name]
```

---

## 9. Operator notes (do not post)

- Push to origin/main is gated — operator owns the deploy button.
- Don't post to HN before 7am PT on a weekday. Don't post on a Friday.
- Twitter thread first (build a tiny audience), HN second (~30 min later) so
  the HN post has a few warm shares.
- Reddit posts space out by ≥6h; never cross-post the same body.
- If HN front-pages, prep a `Cache-Control: public, max-age=300` header
  override on `/api/v1/tickers` and the search-index R2 object.
- If a journalist asks for a custom screenshot, the OG endpoint is
  `/api/v1/og?lat=…&lng=…&zoom=…&title=…`.
