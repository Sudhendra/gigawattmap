# 012 — Submarine cables ingestion (TeleGeography + IM3 fallback)

**Status:** todo
**Depends on:** 009
**Estimate:** 3 hours

## Context

Submarine cables are the signature visual. TeleGeography's public v3 API returns GeoJSON. Licensed CC BY-NC-SA 3.0 — non-commercial only, which is fine for v1 free product. Flag a follow-up to rebuild from open sources if we ever monetize.

## Acceptance criteria

- [ ] `opendc/sources/telegeography.py` fetches:
  - `https://www.submarinecablemap.com/api/v3/cable/cable-geo.json` (lines)
  - `https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json` (points)
  - `https://www.submarinecablemap.com/api/v3/cable/all.json` (metadata: name, RFS year, capacity, owners, length)
- [ ] Caches raw to `out/raw/telegeography-*-<ts>.json`
- [ ] Normalizes into our `Cable` schema, joining the metadata JSON to the geo JSON by cable ID
- [ ] Writes `out/interim/cables.geojson` and `out/interim/landing-points.geojson`
- [ ] `license_flag: "non_commercial_only"` recorded in `manifest.json` for `cables` and `landing-points`
- [ ] IM3 fallback path documented for a future "drop TeleGeography" task: rebuild from ITU ITR + Wikipedia lists + press releases (noted as task 012b in a new stub file)
- [ ] Tests against a committed 2-cable fixture; both cables round-trip schema validation

## Files to touch

- `data-pipeline/opendc/sources/telegeography.py`
- `data-pipeline/tests/fixtures/telegeography-sample.json`
- `data-pipeline/tests/test_telegeography.py`
- `tasks/012b-cables-open-replacement.md` (stub, Status: todo, Depends on: 012)

## Notes

- HUGE legal point: TeleGeography's CC BY-NC-SA 3.0 is only OK while we're free + non-commercial. `/about` must say "Submarine cable data: © TeleGeography, CC BY-NC-SA 3.0" and a v2 "drop this" task must exist before any monetization.
- Cable `capacity_tbps` is sometimes reported as design vs. lit capacity. We record what TG publishes and note the ambiguity in tooltips.
