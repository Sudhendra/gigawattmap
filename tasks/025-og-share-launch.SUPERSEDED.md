# 025 — OG image + share flow + launch polish

**Status:** superseded by 025a, 025b, 025c, 025d
**Depends on:** 006, 020, 021, 022, 023, 024
**Estimate:** 3 hours

## Context

The final mile. Beautiful OG images for every permalink. A share flow that works on Twitter, HN, LinkedIn. Lighthouse scores verified. Ready to ship.

## Acceptance criteria

**OG images:**

- [ ] `GET /api/v1/og?dc=<id>` — Worker endpoint returns a 1200×630 PNG
- [ ] Generated with Satori (Vercel OG) or Cloudflare's image transforms
- [ ] Template renders:
  - The datacenter name (large, JetBrains Mono)
  - Operator + location (smaller)
  - A map thumbnail centered on the facility (static Maplibre render via server-side rasterization, or simplified SVG)
  - Gigawatt Map wordmark bottom-right
  - Background: the dark palette
- [ ] `GET /api/v1/og?market=<slug>` — market page variant
- [ ] `GET /api/v1/og` (no params) — default "Gigawatt Map — every AI datacenter and the grid that feeds it"
- [ ] `app/layout.tsx` sets `openGraph` + `twitter` metadata dynamically per route

**Share flow:**

- [ ] Share button in Intelligence Card copies URL with full state (`?dc=<id>&layers=datacenters,cables&z=12`)
- [ ] Share button next to it opens a modal with: copy link, tweet, post to LinkedIn, download PNG
- [ ] Tweet template: "Just discovered {name} on @gigawattmap — {operator} · ~{mw} MW · {country}. Every AI datacenter, mapped: {url}"
- [ ] LinkedIn template: formal tone, same facts
- [ ] Toast confirms on copy

**Launch polish:**

- [ ] Lighthouse run on `/` (map page) scores: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥95 on desktop. Mobile: Performance ≥80, others same.
- [ ] All budgets from `AGENTS.md` validated: FCP <1.5s cold 4G, bundle <350KB gzipped, API p95 <200ms
- [ ] `robots.txt` present, allows crawling
- [ ] `sitemap.xml` generated including all operator/market/story pages
- [ ] 404 page matches the dark design
- [ ] No console errors or warnings on any page
- [ ] Favicon + Apple touch icons in the brand palette

**Launch checklist file** (`docs/launch-checklist.md`):
- [ ] HN submission title + body drafted
- [ ] Twitter thread drafted (tagged @openstreetmap @GlobalEnergyMon @EIAgov @Protomaps @maplibreorg)
- [ ] Outreach list: Data Center Knowledge, DCD, Semianalysis, Latent Space, Stratechery — emails drafted
- [ ] Reddit posts drafted: r/datacenter, r/dataisbeautiful, r/mapporn, r/investing
- [ ] Show HN scheduled for Tuesday 8am ET (historically best slot)

## Files to touch

- `apps/api/src/routes/og.ts`
- `apps/web/src/app/layout.tsx` (dynamic OG metadata per route)
- `apps/web/src/components/share/share-modal.tsx`
- `apps/web/src/components/intelligence-card/intelligence-card.tsx` (wire share button)
- `apps/web/src/app/not-found.tsx`
- `apps/web/public/robots.txt`
- `apps/web/src/app/sitemap.ts`
- `apps/web/public/favicon.*`
- `docs/launch-checklist.md`

## Notes

- OG image is the screenshot that gets tweeted. Spend time on the template — it matters more than most UI polish.
- Server-side map thumbnails are expensive. Cache aggressively: 1 hour edge cache, 24 hour browser cache.
- If Lighthouse misses targets, profile before optimizing. Common wins: defer deck.gl until interaction, compress PMTiles metadata, preload fonts.
- After this task: everything from `SPEC.md §2 v1` should be live. Write `docs/v0.1-launch-notes.md` per `CLAUDE.md` instructions.
