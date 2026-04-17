# 021 — Announcements feed

**Status:** todo
**Depends on:** 006
**Estimate:** 3 hours

## Context

Bottom-of-viewport horizontal strip showing recent material AI-infra announcements. Each card pins to a location — clicking flies the map to it and opens the Intelligence Card. Seed with 50 hand-curated entries for launch.

## Acceptance criteria

- [ ] `data-pipeline/opendc/data/announcements/` directory holds one YAML file per announcement:
  ```yaml
  id: 2026-04-14-talen-aws-expansion
  date: 2026-04-14
  title: "Talen–Amazon nuclear PPA expanded to $18B"
  category: deal # one of: deal, launch, milestone, opposition, policy
  amount_usd: 18_000_000_000
  operator_id: talen
  datacenter_id: talen-susquehanna
  source_url: https://...
  summary: |
    Two-sentence neutral summary of the announcement.
  ```
- [ ] ≥50 entries covering the last 12 months (hand-curated from DCD, Converge Digest, Data Center Frontier, SEC 8-Ks, press releases)
- [ ] `opendc/sources/announcements.py` reads the YAML dir, validates via pydantic, emits `out/interim/announcements.json` (array, sorted desc by date)
- [ ] Uploaded to `r2://gigawattmap/v1/announcements.json` as a single static JSON
- [ ] `components/announcements-feed/announcements-feed.tsx`:
  - Fetches announcements.json via TanStack Query (staleTime: 1 hour)
  - Renders as a horizontal scrollable strip at bottom of viewport (above the HUD, collapsible)
  - Each card: date chip, short title, amount (if present), category badge, location hint
  - Clicking a card: if `datacenter_id` present, flies map to that DC and opens its Intelligence Card; else just shows the card detail inline
  - Keyboard-navigable (left/right arrows)
- [ ] `/news` route renders the full list with filters (category, date range, operator)

## Files to touch

- `data-pipeline/opendc/data/announcements/*.yaml` (50+ files)
- `data-pipeline/opendc/sources/announcements.py`
- `apps/web/src/components/announcements-feed/announcements-feed.tsx`
- `apps/web/src/app/news/page.tsx`

## Notes

- v1 is 100% hand-curation — no automation. Fine. The automated RSS+8-K pipeline is tracked as a v1.5 task in `SPEC.md §2.N`.
- YAML over JSON for source files: easier to hand-edit, supports multi-line summary, better PR diffs.
- Dates are UTC (`YYYY-MM-DD`). Use `Intl.DateTimeFormat` for display — respect user locale.
