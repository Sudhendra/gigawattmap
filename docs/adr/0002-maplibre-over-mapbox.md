# ADR 0002 — MapLibre GL JS v5 over Mapbox GL JS

**Status:** Accepted
**Date:** 2026-04-17

## Context

The map is the product. We need:
- A battle-tested vector-tile renderer
- Globe projection (for showing global scale of AI infra)
- Compatibility with deck.gl for custom layers
- Open licensing — this is an open-data product, using a proprietary map library would be awkward

Two live options in 2026: **Mapbox GL JS** (v3+, proprietary license after the Mapbox v2 → v3 relicensing) or **MapLibre GL JS** (open fork, now v5, which landed native globe support).

## Decision

Use MapLibre GL JS v5.

## Consequences

**Positive:**
- Fully open (BSD-3-Clause), no usage-based pricing
- Native globe support in v5 — critical for our "global scale" story
- Compatible with deck.gl via `@deck.gl/mapbox` MapboxOverlay (works with MapLibre too despite the name)
- Works with any tile provider (OpenFreeMap, self-hosted Protomaps, MapTiler, etc.)
- Large community, active development
- Zero marginal cost per map load — at our scale this matters

**Negative:**
- Some Mapbox-exclusive features (Mapbox Studio style editor, traffic data, 3D buildings dataset) unavailable — but we don't need any of them
- Style JSON ecosystem is slightly less polished than Mapbox's (we use Protomaps basemaps which target MapLibre natively — non-issue)
- Globe projection is newer in MapLibre than in Mapbox; edge cases may exist. We accept this — the visual payoff is worth it.

## Alternatives considered

- **Mapbox GL JS v3+:** proprietary; meter-per-request pricing becomes a tax at scale. Unacceptable for an open-data project.
- **Leaflet:** no vector tiles, no WebGL, no deck.gl integration. Not a serious contender for this scope.
- **deck.gl standalone (no basemap):** would mean no streets/labels; our visualizations need geographic context.
- **OpenLayers:** capable but heavier API surface, less modern style spec. MapLibre's spec is better documented for our needs.
