# Gigawatt Map

> Every AI datacenter and the grid that feeds it.

See [`SPEC.md`](./SPEC.md) for the full product spec, [`AGENTS.md`](./AGENTS.md)
for engineering conventions, and [`tasks/`](./tasks/) for the build plan.

---

## Data sources

Every dataset rendered by Gigawatt Map is documented below with its upstream
URL, license, and how we ingest it. Per-row provenance lives in each feature's
`source_url` (or `sources[]`) property — open the intelligence card on any
object to see exactly where the claim came from.

When a layer ships in production it must also appear in the `/about` page
attribution panel (task 023). This README is the canonical source of truth
the `/about` page is generated from.

| # | Layer | Source | License | Ingest module |
|---|-------|--------|---------|---------------|
| 1 | AI campuses (~50) | Hand-curated from operator press releases, FERC filings, county permits, news | Our own work — public domain (CC0) | [`opendc/sources/curated.py`](./data-pipeline/opendc/sources/curated.py) reading [`data/ai-campuses.csv`](./data-pipeline/opendc/data/ai-campuses.csv) + [`operators.csv`](./data-pipeline/opendc/data/operators.csv) |
| 2 | Cloud regions (164 across AWS, Azure, GCP, Oracle, Alibaba) | Hand-curated from each provider's public regions documentation | Our own work — public domain (CC0); upstream provider docs are facts, not copyrightable | [`opendc/sources/cloud_regions.py`](./data-pipeline/opendc/sources/cloud_regions.py) reading [`data/cloud-regions.json`](./data-pipeline/opendc/data/cloud-regions.json) |
| 3 | Long-form datacenter footprints | [OpenStreetMap](https://www.openstreetmap.org/) Overpass API (`telecom=data_center`, `building=data_center`) | [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — **share-alike** | [`opendc/sources/osm.py`](./data-pipeline/opendc/sources/osm.py) |
| 4 | Substations, plants, transmission lines | [OpenStreetMap](https://www.openstreetmap.org/) Overpass API (`power=substation`, `power=plant`, `power=line`) | [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/) — **share-alike** | [`opendc/sources/osm_power.py`](./data-pipeline/opendc/sources/osm_power.py) |
| 5 | Submarine cables | [TeleGeography Submarine Cable Map](https://www.submarinecablemap.com/) public API v3 | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) — **non-commercial only**; if Gigawatt Map ever monetizes, this layer must be removed or replaced | [`opendc/sources/telegeography.py`](./data-pipeline/opendc/sources/telegeography.py) |
| 6 | Basemap tiles (countries, water, roads) | [OpenFreeMap](https://openfreemap.org/) Liberty style (OSM-derived) | [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/) for the data; basemap style MIT | Loaded directly by MapLibre in [`apps/web/src/components/map/map.tsx`](./apps/web/src/components/map/map.tsx); will be swapped for self-built Protomaps style in task 008b |
| 7 | Datacenter opposition (community fights, moratoria, lawsuits) | [`Georgeingebretsen/datacenter-opposition-tracker`](https://github.com/Georgeingebretsen/datacenter-opposition-tracker) `site/data/fights.json` (934 entries; compiled from [Data Center Watch](https://www.datacenterwatch.org/), [Robert Bryce's Substack](https://robertbryce.substack.com/), [FracTracker Alliance](https://www.fractracker.org/), local news) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — commercial use OK with attribution | [`opendc/sources/opposition.py`](./data-pipeline/opendc/sources/opposition.py) *(task 018)* |

### Sources scaffolded but not yet shipping

| Source | Status | License | Module |
|--------|--------|---------|--------|
| [Global Energy Monitor — Global Integrated Power Tracker](https://globalenergymonitor.org/projects/global-integrated-power-tracker/) | CLI wired in `cli.py`, not yet rendered | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — commercial use OK with attribution | [`opendc/sources/gem.py`](./data-pipeline/opendc/sources/gem.py) |

### Licensing rules we follow

- **Per-row `source_url` is mandatory** for every feature shown in the UI
  (`AGENTS.md` §"Licensing + attribution"). A claim with no audit trail is a
  bug, not a feature.
- **OSM (ODbL) is share-alike.** We ship per-source GeoJSON / PMTiles
  downloads (task 024) so downstream users get OSM-flagged data separately
  rather than a single merged blob that would inadvertently re-license other
  sources.
- **TeleGeography is non-commercial.** Any move to ads, paid tiers, or
  enterprise licensing requires removing or replacing this layer first.
- **No scraping anything `robots.txt` forbids.** No copyrighted content
  committed to this repo. Large artifacts (tiles, raw fetches) live in
  [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/), not git.

If you find a source we've used without proper attribution, please open an
issue — it's a bug we will fix immediately.
