# ADR 0003 — PMTiles on R2 over a tile server

**Status:** Accepted
**Date:** 2026-04-17

## Context

We have ~10K datacenters + ~100K power plants + ~500 cables to ship as map tiles, refreshed weekly to monthly. The map needs low-latency tile loads globally from day one.

Three serving models:

1. **Traditional tile server** (tileserver-gl, Martin) — dynamic, expensive to run, requires a PostGIS + Node/Rust service behind a CDN.
2. **Pre-rendered raster tiles** — cheap but bloated and ugly at high zoom.
3. **PMTiles** — single-file vector tile archive, served via HTTP range requests directly from object storage.

## Decision

Use PMTiles v3, built via tippecanoe, served from Cloudflare R2. Register the PMTiles protocol in MapLibre at app init.

## Consequences

**Positive:**
- **Zero server infrastructure.** A static file on R2 handles global traffic.
- **Cloudflare R2 has no egress fees** — critical for a public-good map that might get hugged to death on HN.
- Pipeline is dead simple: `tippecanoe` emits `.pmtiles`, `aws s3 cp` to R2, done.
- Versioning is trivial: `r2://gigawattmap/v1/datacenters.pmtiles`, `v2/...`, atomic switches.
- Client-side caching works because PMTiles uses normal HTTP range requests.
- Protomaps basemaps ship as PMTiles too, so the same infrastructure serves both basemap and overlay.

**Negative:**
- No server-side filtering — every client loads the same tiles. For filtered views (e.g. "only hyperscaler DCs"), we do client-side filtering in deck.gl. At our feature count this is fine.
- Tile updates require a full PMTiles rebuild. At weekly refresh cadence this is acceptable; for real-time (not our v1 goal) we'd need a different approach.
- PMTiles is a newer format. Tooling exists but isn't as mature as MBTiles. tippecanoe supports it natively — primary toolchain is fine.

## Alternatives considered

- **Martin + PostGIS:** proven stack but adds a database and a server. At our refresh cadence the complexity isn't justified.
- **Tippecanoe + MBTiles + tileserver-gl:** same data prep, but needs a server. Doubles our ops surface.
- **CloudFront + S3 raster tiles:** works but bloats storage 10x and loses vector interactivity.

## Follow-ups

If Gigawatt Map scales to needing real-time tile updates, the migration path is:
1. Keep PMTiles for the slowly-changing base layers (datacenters, power plants)
2. Add a small Martin + PostGIS deployment for the real-time layers (announcements, opposition)
3. Client merges both in deck.gl — no single-service failure
