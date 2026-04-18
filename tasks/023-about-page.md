# 023 — About page + attribution

**Status:** in-progress
**Depends on:** 013, 018
**Estimate:** 2 hours

## Context

Single long-form `/about` page covering: what Gigawatt Map is, methodology (MW estimation, confidence tiers, substation joins), every data source with license, known gaps (Chinese datacenter coverage etc.), how to contribute, and team. This is also where trust is built — investors and journalists read this before citing us.

## Acceptance criteria

- [ ] `app/about/page.tsx` with server-rendered static content
- [ ] Typography: Source Serif 4 for body, JetBrains Mono for data-dense sections, max-width ~65ch for readability
- [ ] Sections in order:
  1. **What this is** — 3 short paragraphs, no jargon
  2. **Who it's for** — the 5 personas from `SPEC.md §1` summarized
  3. **How we built it** — data pipeline overview, update cadence, source versioning
  4. **Methodology** —
     - MW estimation heuristic (show the formula with worked example)
     - Confidence tiers (`verified` / `osm_only` / `press_release` / `estimated`)
     - Substation proximity (10km cutoff, voltage ranking)
     - Ticker→operator mapping (conservative; documented)
  5. **Data sources** — table with every source from `SPEC.md §3`: name, coverage, license, refresh cadence, link
  6. **Known gaps** — Chinese DC coverage limited (OSM constraints), Indian coverage improving, Russia/CIS poor; MW values for pre-2020 colo facilities often estimated not announced; neoclouds update faster than we refresh
  7. **Contribute** — link to GitHub, PR instructions, contact email
  8. **Team** — currently: Sudhendra (lead). Open to collaborators.
  9. **Press & citations** — empty on day 1; populated as coverage happens
  10. **Licensing** — Code MIT. Data per-source. Attribution required.
- [ ] Every claim that references data has a linked source
- [ ] Accessible: headings are `<h2>` for top-level sections; skip-to-content link at top; prose contrast ≥ WCAG AA
- [ ] Mobile-friendly (full-width single column below 768px)

## Files to touch

- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/about/_components/sources-table.tsx`
- `apps/web/src/app/about/_components/methodology-section.tsx`

## Notes

- This is the page that gets cited. Write it like a methodology note, not marketing copy. Sober, specific, link-heavy.
- Include a visible "last updated" timestamp at the top.
