# Gigawatt Map — Full Build Spec

> **Every AI datacenter and the grid that feeds it.**
>
> A public intelligence atlas for the AI-infrastructure era. Where datacenters are. Who owns them. How much power they pull. Where that power comes from. Which projects got blocked. Which deals just closed. And which stocks it all flows through.

**Reference inspiration:** [OpenGridWorks](https://opengridworks.com) (shape), [openinframap.org](https://openinframap.org) (depth), [datacentertracker.org](https://datacentertracker.org) (community), [Data Center Watch](https://www.datacenterwatch.org) (opposition). We absorb all of them and become the canonical reference for the AI infra buildout.

**Target user personas (in priority order):**
1. **The AI infra investor** — "I hold NVDA/VRT/ETN and want to know where the next 10GW is landing, which utility serves it, and which REIT benefits."
2. **The analyst / journalist** — "Meta just announced Hyperion. Show me every adjacent utility filing, substation, water source, and opposition group."
3. **The developer / operator** — "I'm scouting a 200MW site in ERCOT. Show me existing DC density, substation capacity, gas plant proximity, and moratoria."
4. **The curious technologist / policy person** — "How big is this thing? What's the shape of the global buildout?"
5. **The educator / student** — self-explanatory.

The product must produce actionable insight within **30 seconds of first page load** for persona 1. That's the bar.

---

## 1. Core thesis — what makes this different

Every existing tool is missing at least one of four things we ship in v1:

| Existing | Missing |
|---|---|
| datacentermap.com, Baxtel | Power-plant linkage, financial framing, free API |
| Open Infrastructure Map | Datacenters as a first-class subject; AI-era context |
| TeleGeography cable map | Cables don't link to the DCs they serve |
| FracTracker, Data Center Watch | Neutral framing; global scope; investment lens |
| Synergy / DCD / industry analysts | Open, visual, free, shareable |
| IM3 PNNL Atlas | Beauty, global scope, market intelligence |

**Our wedge:** every datacenter on the map is **contextualized** — with its closest substation, its likely power source, its PPA disclosures (where public), its operator's ticker, its competitor REITs, and any community/regulatory friction. Clicking a facility opens an **intelligence card**, not just a pin.

---

## 2. Feature roadmap

### v1 — Atlas (launch scope, ~3 weeks solo)

The map-first MVP. Ship to HN. All of the below **must** be live on day 1.

**A. The Map**
- Dark-mode vector basemap (Protomaps PMTiles)
- Globe view toggle (MapLibre v5)
- 10K+ datacenters worldwide from OSM `telecom=data_center` + `building=data_center`
- Campus polygons with 3D extrusion at zoom 14+
- Animated submarine cables (deck.gl ArcLayer + particle flow)
- Power plant layer (GEM + WRI) color-coded by fuel
- Cloud provider region markers (AWS/Azure/GCP/Oracle/Alibaba)
- Live viewport HUD: `Visible: 247 DCs · ~8.4 GW est · 62 operators · 14 substations`

**B. The Intelligence Card** (right-side drawer, permalinked)

When you click a datacenter, you see:

```
┌─ CRUSOE PROJECT LIGHTNING ─────────────────┐
│ Abilene, TX · Under Construction           │
│ Est. 1.2 GW · 450K GB200 GPUs              │
│                                             │
│ OPERATOR    Crusoe (private)                │
│ TENANTS     OpenAI, Oracle (Stargate I)     │
│ CAPEX       $100B announced (Stargate)      │
│                                             │
│ POWER                                       │
│ ├─ Utility: Oncor / AEP (ERCOT)             │
│ ├─ Gas plant: ExxonMobil-NextEra 1.2GW      │
│ │   (carbon-capture, under dev)             │
│ └─ Nearest substation: 3.2 km, 345kV        │
│                                             │
│ WATER                                       │
│ └─ WRI Aqueduct stress: HIGH                │
│                                             │
│ CONTEXT                                     │
│ ├─ TX: 80.6 GW gas-in-dev for DCs           │
│ ├─ 2.1 mi from competing Vantage Frontier   │
│ └─ No active opposition                     │
│                                             │
│ MARKET EXPOSURE                             │
│ ├─ $VRT cooling · $ETN power                │
│ ├─ $ORCL tenant · $NVDA silicon             │
│ └─ No REIT (Crusoe owned)                   │
│                                             │
│ SOURCES                                     │
│ OSM · GEM · press releases (12)             │
└─────────────────────────────────────────────┘
[Share] [Download GeoJSON] [Open chat →]
```

Every field is linked to its source. Nothing is invented — if we don't have a value, we show "unknown" with a link to the contribute form.

**C. The Ticker Panel** (collapsible top-right)

Real-time-ish (15-min delayed is fine) overlay of the public comps:
- **REITs:** EQIX, DLR, IRM
- **Picks & shovels:** VRT, ETN, NVT, SU, MOD, JCI
- **Silicon:** NVDA, AVGO, AMD, MRVL, MU
- **Power adjacents:** TLN (Talen — AWS nuclear PPA), VST (Vistra), CEG (Constellation), NRG
- **Neoclouds:** CRWV, NBIS (as available)
- **Hyperscaler parents:** MSFT, GOOGL, AMZN, META, ORCL

Each ticker shows price + % day, and **clicking a ticker filters the map to their exposed facilities** (Meta → all Meta DCs; VRT → any DC with known Vertiv install; TLN → Susquehanna + linked AWS campuses).

Free price data: **Finnhub free tier**, **Yahoo Finance unofficial**, or **Polygon.io starter** (~$29/mo).

**D. Deals & Announcements Feed** (bottom strip, horizontal scroll)

A curated, dated feed of every material AI-infra announcement. Each card has a pin → clicking zooms the map:

```
NOV 10 ▪ $18B · Talen–Amazon nuclear PPA expanded    📍 Susquehanna PA
OCT 27 ▪ $27B · Meta Hyperion LA JV w/ Blue Owl       📍 Richland Parish
OCT 15 ▪ $11B · Amazon Project Rainier operational     📍 Jeffersonville IN
SEP 18 ▪ 1.2GW · Stargate I Abilene launches           📍 Abilene TX
```

Source this from: DCD, Converge Digest, Data Center Frontier, SEC 8-Ks, press releases. Store as simple `announcements.csv` — update manually weekly. Once it's big enough, this becomes v2's main navigational spine.

**E. Opposition Layer**

Every blocked/delayed project from Data Center Watch as a red X marker. Clicking shows: the project, the opposition groups, the specific concern (water / noise / grid / tax), the outcome, and dollar value at stake. $162B+ blocked or delayed to date — this data is *important* and nobody visualizes it well.

**F. Power Flow Layer** (visual signature piece)

deck.gl-powered animation showing MW flowing from power plants → substations → datacenters, scaled by capacity. This is the screenshot that goes viral. Dial it to "ambient" by default — alive but not distracting.

**G. Shareable snapshots**
- Any view generates an OG image server-side (Satori/Vercel OG)
- Share button → copies URL with full viewport + layer state + selected feature
- Screenshot button → PNG with legend + attribution baked in

**H. Downloads**
- Full dataset as GeoJSON, CSV, PMTiles
- Per-country / per-operator filtered exports
- `/data` page with schema docs and examples
- Public, unauthenticated, rate-limited API: `GET /api/v1/datacenters?bbox=&operator=&status=`

**I. About & methodology**
- Full attribution page listing every dataset
- Methodology section on how we estimate MW from sqft
- Confidence badges on each facility: `verified` / `osm-only` / `press-release-only`
- GitHub link — the data pipeline is public

### v1.5 — Intelligence (weeks 4-8)

**J. Operator pages** (`/operator/meta`)
- Every facility globally, total GW, % of market, tenants
- Financial snapshot (if public), competitor comparison
- "Facilities where competitor [Microsoft] is <50mi away" — competitive heat map

**K. Market pages** (`/market/northern-virginia`, `/market/dfw`, etc.)
- Top 20 datacenter markets globally
- Total MW operational + under-construction + announced
- Power mix, water stress, opposition heat, permitting speed score
- Land prices, vacancy, lease rates (CBRE / JLL / Cushman public quarterlies)

**L. Utility pages** (`/utility/dominion-energy`, `/utility/oncor`)
- Which DCs they serve
- Interconnection queue status (FERC / ISO public filings: PJM, ERCOT, MISO, CAISO, SPP, NYISO, ISO-NE)
- Announced generation additions
- Current load vs. projected

**M. Story pages** (`/stories/`) — editorial long-form anchored to map features:
- "Anatomy of Stargate" — interactive scrollytelling
- "The Virginia pushback" — timeline + map
- "How much water does AI drink?"
- "The neocloud map" — CoreWeave, Nebius, Nscale, Lambda
- "Nuclear's second life" — SMR + DC pairings
- Built with [Scrollama](https://github.com/russellsamora/scrollama).

**N. Watchlist & alerts** (email auth, no passwords)
- Save operators, markets, or bounding boxes
- Weekly digest: "3 new announcements in your DFW watchlist"
- "Opposition activity near your saved project"
- Monetization hook — can go freemium later without breaking the free map.

**O. Diff view / time slider**
- "What changed this month" list
- Scrub 2018 → today, watch facilities pop in
- Embed as `<iframe>` anywhere

### v2 — Professional tier (months 3-6)

Optional paid layer for serious users. Keep the base product fully free forever.

- Interconnection queue integration (auto-scraped from PJM/ERCOT/MISO/CAISO — all public)
- FERC filings linked to facilities
- SEC 8-K auto-tagging — when DLR announces a lease, pin it to the right facility
- County permit tracking (top 20 markets)
- CSV export of any market cut
- Slack/webhook alerts
- Pro API tier with higher rate limits

Pricing concept: $49/mo individual, $299/mo team, custom enterprise. You've proven you can build indie SaaS ($50 Dataset on Gumroad) — this has 100x the audience.

---

## 3. The data stack — every source, every license

### 3.1 Datacenter geometry (the foundation)

| Source | Coverage | Fields | License | How to ingest |
|---|---|---|---|---|
| **OpenStreetMap** | Global, crowdsourced | name, operator, building area, campus polygon | ODbL | Overpass API queries for `telecom=data_center` OR `building=data_center`; refresh weekly via cron |
| **IM3 Open Source Data Center Atlas (PNNL)** | US-only, validated | sqft, county, state, campus/building/point layers | ODbL | Download GeoJSON from `data.msdlive.org/records/65g71-a4731` monthly |
| **NewCloudAtlas** | Global, OSM-reimported every 15 min | Same as OSM | ODbL | Sanity check, not primary |
| **Hand-curated AI campuses** | ~50 tracked AI sites | Everything above plus MW, GPU count, tenant, status, CAPEX | Our own, CC BY-SA 4.0 | Maintained as `ai-campuses.csv` in the repo — PRs welcome |

**Ingestion strategy:**
1. OSM is authoritative for "does it exist, where is it, what shape"
2. IM3 overrides for US — better sqft, better polygons
3. Hand-curated overrides for the ~50 biggest AI campuses — real MW numbers, real tenant info
4. We compute `est_mw_low/est_mw_high` from sqft using a published heuristic (see §6.1), store `mw_source` = `announcement|utility-filing|estimate`

**Missing operator inference:** For OSM features without `operator=*`, use fuzzy match against a curated operator list + domain lookups from any `website=*` tag + reverse geocoding against public filings.

### 3.2 Power infrastructure

| Source | Coverage | License | Use |
|---|---|---|---|
| **Global Energy Monitor (GIPT)** | 27 global trackers, ~1M plants | CC BY 4.0 | Primary power-plant layer globally |
| **WRI Global Power Plant Database** | 35K plants, 167 countries | CC BY 4.0 | Secondary / backfill |
| **EIA-860, 860M** | US monthly generator inventory | Public domain | US accuracy layer |
| **Catalyst PUDL** | Clean API over EIA + FERC | CC BY 4.0 | US analytics |
| **OSM `power=*`** | Substations, lines, plants | ODbL | Substation proximity queries (the magic) |
| **GEM Gas Finance Tracker** | 252GW US gas-for-DCs | CC BY 4.0 | The AI-era story layer |

**The substation query that powers the intelligence card:**
```python
# For each datacenter, find OSM power=substation within 10km, ranked by voltage
nearby_substations = overpass_query(
  f"node[power=substation](around:10000,{lat},{lon})"
)
```
This is a genuine differentiator. Nobody else does it at this scale.

### 3.3 Network / cables

| Source | License | Use |
|---|---|---|
| **TeleGeography Submarine Cable Map API** (`submarinecablemap.com/api/v3/cable/cable-geo.json`) | CC BY-NC-SA 3.0 | **Non-commercial only** — fine for the free product, requires licensing if/when we monetize |
| **OSM `telecom=exchange`** | ODbL | Internet exchanges |
| **PeeringDB** (free API) | CC BY 4.0 | IX/ASN data |

**Legal note.** If v2 becomes paid and still includes submarine cables, we need a TeleGeography commercial license. Cheaper alternative: rebuild from open sources (ITU, AIS ship-tracking, press releases) — ~40-60 hours of work. **Plan:** use TeleGeography now, flag as a v2 issue, quietly build the open replacement in parallel.

### 3.4 Cloud provider regions

Scraped + hand-maintained `cloud-regions.json` from:
- AWS: https://docs.aws.amazon.com/about-aws/global-infrastructure/regions_az/
- Azure: https://azure.microsoft.com/en-us/explore/global-infrastructure/geographies/
- GCP: https://cloud.google.com/about/locations
- Oracle: https://www.oracle.com/cloud/data-regions/
- Alibaba: https://www.alibabacloud.com/global-locations
- IBM, DigitalOcean, Vultr, Linode/Akamai for completeness

**Important:** cloud providers do NOT publish exact coordinates (security policy). We use metro-area centroids shown as 10km buffer circles, not pins. Label this clearly.

**Google's CFE% dataset** (`cloud.google.com/sustainability/region-carbon`) gives us carbon intensity per region — ship as a choropleth overlay.

### 3.5 Opposition / regulatory / environmental

| Source | License | Use |
|---|---|---|
| **Data Center Watch** (datacenterwatch.org) | Editorial — cite, don't bulk-redistribute | Blocked/delayed project pins |
| **datacentertracker.org** | Unclear — contact for API | Community legislation/action |
| **FracTracker National Data Centers Tracker** | Attribution required | Environmental/regulatory context |
| **WRI Aqueduct** | CC BY 4.0 | Water stress overlay (critical for AI DC siting) |
| **EPA FRS / Echo** (public) | Public domain | Air permits, NPDES |

### 3.6 Financial / market

| Source | License / cost | Use |
|---|---|---|
| **SEC EDGAR** (free, public) | Public | 8-Ks, 10-Ks, tenant disclosures |
| **Finnhub free tier** (60 calls/min) | Free | Stock tickers on the Ticker Panel |
| **Yahoo Finance unofficial** | Free but unstable | Backup price data |
| **Alpha Vantage** (free tier) | Free | Backup |
| **Polygon.io** | $29/mo | Upgrade path if free tiers fail |
| **Hyperscaler capex disclosures** | Public (quarterly earnings) | Manually compiled CSV, refreshed quarterly |
| **REIT tenant filings** (DLR, EQIX) | Public | Manual extraction → link to facilities |

### 3.7 Announcements / deals

No free structured feed exists — this is one of our moats. Build a tiny internal CMS (`announcements/` as YAML files in the repo, or Sanity/Notion-backed). Curate from:
- DCD, Converge Digest, Data Center Frontier, Data Center Knowledge (RSS feeds)
- SEC 8-K filing scraper (keywords: "data center", "AI infrastructure", "megawatt", "PPA")
- Press releases from hyperscalers, REITs, neoclouds, utilities

**Eventually:** an LLM pipeline that reads RSS + 8-Ks and proposes new entries for human approval.

### 3.8 Interconnection queues (v2)

All public but ugly (Excel, PDF). Scraping them is annoying but very high-value recurring work — real IP.

- **PJM Queue:** https://www.pjm.com/planning/services-requests/interconnection-queues
- **ERCOT GIS:** https://www.ercot.com/gridinfo/resource
- **MISO Queue:** https://www.misoenergy.org/planning/resource-utilization/generator-interconnection-queue/
- **CAISO Queue:** https://www.caiso.com/planning/Pages/GeneratorInterconnection/Default.aspx
- **SPP, ISO-NE, NYISO** — all have public queues

---

## 4. Tech stack — opinionated

### 4.1 Frontend

```
Next.js 15 (App Router)  ← TypeScript strict
├─ MapLibre GL JS v5     ← vector basemap + globe
├─ deck.gl v9            ← custom layers, arcs, heatmaps, extrusions
├─ PMTiles               ← serverless tiles from R2
├─ Tailwind v4           ← styling
├─ Motion                ← animations
├─ Zustand               ← UI state
├─ TanStack Query        ← data fetching + cache
├─ Fuse.js               ← Cmd+K search
└─ Radix UI              ← primitives (dialog, popover, tooltip)
```

**Why Next.js over SvelteKit/Astro:** `/operator/[slug]` and `/market/[slug]` pages want ISR + SSG. Next does this best.

**Why deck.gl over pure MapLibre:** MapLibre handles basemap + styled vector layers. deck.gl is for the *wow* — arcs, heatmaps, 3D extrusions, particle flows. Use `@deck.gl/mapbox` `MapboxOverlay` in overlaid mode.

### 4.2 Data pipeline

```
data-pipeline/
├─ pyproject.toml         ← uv + ruff
├─ opendc/
│  ├─ sources/
│  │  ├─ osm.py           ← Overpass queries, PBF fallback
│  │  ├─ im3.py           ← PNNL monthly download
│  │  ├─ gem.py           ← Global Energy Monitor
│  │  ├─ wri.py           ← WRI GPPD
│  │  ├─ submarine.py     ← TeleGeography v3 API
│  │  ├─ cloud_regions.py ← scraper + hand-curated JSON
│  │  ├─ opposition.py    ← Data Center Watch scraper
│  │  └─ announcements.py ← RSS + SEC 8-K pipeline (v1.5)
│  ├─ transform/
│  │  ├─ normalize_operators.py    ← fuzzy match to canonical
│  │  ├─ estimate_mw.py            ← sqft → MW heuristics
│  │  ├─ enrich_substations.py     ← OSM power proximity
│  │  └─ merge.py                  ← unified GeoJSON
│  ├─ tiles/
│  │  ├─ build_pmtiles.sh          ← tippecanoe pipeline
│  │  └─ upload_r2.py              ← Cloudflare R2 push
│  └─ cli.py
└─ .github/workflows/
   ├─ refresh-weekly.yml  ← OSM + opposition
   └─ refresh-monthly.yml ← GEM, WRI, IM3
```

`tippecanoe` command for the main dataset:
```bash
tippecanoe \
  -o datacenters.pmtiles \
  --layer=datacenters \
  --minimum-zoom=2 \
  --maximum-zoom=14 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --coalesce \
  --reorder \
  datacenters.geojson
```

### 4.3 Backend (thin)

v1 should be **mostly static**. PMTiles + static JSON on R2 + a single edge worker:

```
apps/web/              ← Next.js, static where possible
apps/api/              ← Cloudflare Workers
├─ /api/v1/datacenters ← bbox/filter queries (reads from R2)
├─ /api/v1/og          ← OG image generation
├─ /api/v1/tickers     ← proxied Finnhub (10-min cache)
├─ /api/v1/announcements ← cached feed
└─ /api/v1/alerts      ← watchlist emails (v1.5)
```

**Cost estimate** at 100K MAU: <$50/mo. R2 has no egress fees. Workers has a generous free tier.

### 4.4 Hosting

- **Cloudflare Pages** for the Next.js app (same provider as R2 — aligns with the serverless maps thesis)
- **Cloudflare R2** for PMTiles + static data (zero egress cost)
- **Cloudflare Workers** for the tiny API
- **Cloudflare D1** (SQLite) for watchlists/auth in v1.5
- **Resend** for transactional email
- **PostHog** for analytics (free tier)

---

## 5. Aesthetic direction

Commit to: **editorial cartography.** Feel: *FT Graphics* × *NASA Eyes on the Solar System* × *Bloomberg Terminal, but legible*.

**Palette (dark default):**
```css
--bg-base:      #0a0d12;   /* not quite black */
--bg-panel:     #131820;
--bg-elevated:  #1b2230;
--text-primary: #f2ede4;   /* warm off-white */
--text-muted:   #8a94a8;
--text-subtle:  #828b9e;   /* WCAG AA: 5.07:1 on --bg-panel */

/* data categories */
--dc-hyperscale: #ffb74d;  /* amber — the AI campuses, prominent */
--dc-colo:       #64b5f6;  /* cool blue */
--dc-neocloud:   #ba68c8;  /* magenta — neoclouds are the weird ones */
--dc-enterprise: #78909c;  /* muted */

/* power fuels */
--fuel-coal:     #2e2e2e;
--fuel-gas:      #ff7043;
--fuel-nuclear:  #e91e63;  /* bold — nuclear is the AI story */
--fuel-solar:    #ffd54f;
--fuel-wind:     #4dd0e1;
--fuel-hydro:    #1e88e5;

/* state / status */
--status-operational:  #66bb6a;
--status-construction: #fdd835;
--status-announced:    #42a5f5;
--status-blocked:      #ef5350;

/* accents */
--accent-cable:  #00e5ff;  /* submarine cables */
--accent-focus:  #ffeb3b;  /* selected feature */
```

**Typography:**
- Display: **JetBrains Mono** for data labels (free, open)
- UI: **Geist** or **Switzer** (free, distinctive)
- Body: **Source Serif 4** for essay/story pages (free, open)
- Avoid: Inter, Space Grotesk, Manrope — too 2023 AI-SaaS

**Motion:**
- Map layer fade-ins: 300ms ease-out, staggered 40ms
- Submarine cable particles: 6-10s cycle, low-opacity
- Intelligence card slide: spring(damping:25, stiffness:300)
- Idle globe rotation after 30s of inactivity
- `prefers-reduced-motion` respected everywhere

**Signature details:**
- Bottom-of-viewport HUD is **always visible**, updates on pan/zoom. This is our signature.
- Every numeric stat uses **tabular-nums** and a subtle underline on hover that reveals the source.
- Datacenter markers pulse softly when <7 days old (new announcements)
- Active submarine cable tooltips show traffic direction with an arrow glyph

---

## 6. Technical hard problems

### 6.1 How do we estimate MW from sqft?

Hyperscaler public numbers give us the calibration set. Industry heuristic: 100-300 W/sqft for modern builds, higher for AI campuses (up to 500 W/sqft for liquid-cooled).

```python
def estimate_mw(sqft: float, operator: str, year_built: int, is_ai_campus: bool) -> tuple[float, float]:
    """Returns (low, high) estimate in MW."""
    if sqft is None:
        return None, None

    if is_ai_campus:
        w_per_sqft_low, w_per_sqft_high = 300, 500
    elif operator in HYPERSCALERS and year_built >= 2020:
        w_per_sqft_low, w_per_sqft_high = 200, 350
    elif year_built >= 2015:
        w_per_sqft_low, w_per_sqft_high = 150, 250
    else:
        w_per_sqft_low, w_per_sqft_high = 100, 200

    # Convert to MW, assume ~60% of gross sqft is IT load
    it_sqft = sqft * 0.60
    return round(it_sqft * w_per_sqft_low / 1e6, 1), round(it_sqft * w_per_sqft_high / 1e6, 1)
```

Always show ranges, never point estimates. Explain the heuristic in `/about`. Override with announced or filing-disclosed values whenever available.

### 6.2 How do we deduplicate OSM + IM3 + hand-curated?

1. Build an R-tree spatial index of all features
2. For each hand-curated AI campus, find all OSM/IM3 features within 500m
3. If overlap, merge: take hand-curated values, keep OSM geometry if it's a better polygon
4. Tag with `confidence: verified | osm | press_release`
5. Surface `confidence` in the UI with a small badge

### 6.3 How do we avoid getting sued by TeleGeography?

CC BY-NC-SA is fine for a free, non-commercial product. The moment Gigawatt Map becomes paid or ad-supported:
- Option A: Pay TeleGeography for a commercial license (contact them)
- Option B: Rebuild cables from open sources (~40-60 hours)
- Option C: Drop the cable layer in the paid tier only (messy)

**Plan:** Use TeleGeography now, flag as a v2 issue, build Option B in parallel.

### 6.4 How do we handle updates gracefully?

- All pipeline outputs are versioned: `r2://opendc/v1/datacenters.pmtiles`, `v2/`, etc.
- Frontend pins to a version; releases are atomic
- `/data/changelog` shows what changed each refresh
- Never delete old versions — keep the last 3

### 6.5 How do we handle OSM-derived content legally?

ODbL share-alike is real. Our downloads page must:
1. Attribute "© OpenStreetMap contributors" prominently
2. Ship any derived database under ODbL (a problem if we want to combine with CC BY-NC-SA cable data — this would force the whole merged DB into a narrower license)
3. **Solution:** Publish *separate* downloads by source, let users merge locally. Don't ship a single merged DB except via the map UI (where licensing is per-layer).

---

## 7. Launch plan

### Week 1: Scaffolding + pipeline
- Monorepo init, CI/CD wired
- OSM ingestion script working end-to-end
- PMTiles building and uploading to R2
- Hello-world MapLibre + deck.gl on Cloudflare Pages

### Week 2: Core map + intelligence card
- All v1 layers live
- Click → detail drawer with real substation + power plant joins
- Hand-curate the top 50 AI campuses

### Week 3: Polish + launch
- Ticker panel
- Announcements feed (manually seeded, 50 entries)
- OG images + share flow
- Downloads page, about page
- Lighthouse >90
- Seed tweet thread + HN submission drafted

**Launch day:**
1. 8am ET HN submission: `Show HN: Gigawatt Map – every AI datacenter and the grid that feeds it`
2. Twitter thread tagging @openstreetmap @GlobalEnergyMon @EIAgov @Protomaps @maplibreorg
3. Reach out to: Data Center Knowledge, Data Center Dynamics, Semianalysis, Latent Space, Stratechery
4. Post to r/datacenter, r/dataisbeautiful, r/mapporn, r/investing

### Post-launch loops
- Weekly announcement feed update (30 min)
- Monthly OSM refresh (automated)
- Quarterly operator page refresh
- Annual audit of all sources

---

## 8. Why this will work

**Unfair advantages:**
1. **OpsAgent** — operational data at hyperscale, 250K work orders/year
2. **CBRE domain** — inside the biggest commercial RE firm in the world
3. **Existing research stack** — `agentic_rag_benchmark`, Ralph loop, OpenCode task cards: 80% of the scaffolding already exists
4. **Kalshi/prediction market interest** — maps naturally to probabilistic forecasting
5. **O-1A pipeline** — press-friendly, policy-relevant, technically sophisticated, national interest

**Market timing:**
- FERC large-load interconnection rulemaking lands April 30, 2026 — launching in May/June is perfect timing
- $600B+ hyperscaler capex in 2026 — every analyst needs this
- Blackstone filed for a $2B data-center REIT IPO April 2026 — retail interest spiking

**Risks:**
- TeleGeography legal (mitigated above)
- OSM completeness (many Chinese DCs unmapped — set expectations)
- Maintenance burden (automate aggressively; PR-friendly contribution flow)
- Incumbent pushback (datacentermap.com since 2007 — frame as complementary, not competitive)

---

## 9. Appendix — starter configuration

### `package.json` (root)
```json
{
  "name": "gigawattmap",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.1.3",
    "typescript": "^5.6.3",
    "prettier": "^3.3.3"
  },
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" }
}
```

### `pyproject.toml` (data pipeline)
```toml
[project]
name = "gigawattmap-pipeline"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "httpx>=0.27",
  "geopandas>=1.0",
  "shapely>=2.0",
  "pyarrow>=17",
  "pydantic>=2.8",
  "rich>=13",
  "typer>=0.12",
  "overpy>=0.7",
  "rapidfuzz>=3.9",
  "boto3>=1.34",
]

[tool.uv]
dev-dependencies = ["ruff>=0.6", "pytest>=8", "mypy>=1.11"]
```

### Overpass query for datacenters
```overpassql
[out:json][timeout:300];
(
  node["telecom"="data_center"];
  way["telecom"="data_center"];
  relation["telecom"="data_center"];
  node["building"="data_center"];
  way["building"="data_center"];
  relation["building"="data_center"];
);
out body geom;
```

### Initial `ai-campuses.csv` schema
```csv
id,name,operator,tenant,status,lat,lon,country,region,est_mw_low,est_mw_mid,est_mw_high,gpus,capex_usd_b,announced_date,rfs_date,ppa_counterparty,source_url,notes
```

---

*Maintained by: Sudhendra (lead), open for contributors.*
*Last updated: April 17, 2026.*
