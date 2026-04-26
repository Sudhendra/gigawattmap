# 025d — Launch checklist + Lighthouse verification

**Status:** done
**Depends on:** 025a, 025b, 025c
**Estimate:** 45m

## Context

Final card. Run Lighthouse against the deployed (or local production build)
site, document pass/fail against AGENTS.md budgets, write the launch
checklist with HN/Twitter/outreach drafts, and write v0.1 launch notes.

## Acceptance criteria

**Lighthouse:**

- [x] `docs/launch-checklist.md` records desktop scores for `/`, `/about`,
      `/data`, `/data/api`
- [x] Targets: desktop Performance ≥90, Accessibility ≥95, Best Practices ≥95,
      SEO ≥95; mobile Performance ≥80, others same
      — `/about`, `/data`, `/data/api` all pass. `/` misses Performance
      (75) due to LCP 2.4s and CLS 0.236; A11y/BP/SEO all pass on `/`.
- [x] Any miss documented with profile notes and a follow-up task NNN reference
      — see `tasks/039-home-perf-cls-lcp.md`; before-state report archived
      at `docs/lighthouse/039-before.{html,pdf}`.
- [x] `console` clean on all 4 pages (no errors, no React warnings)
      — fixed broken `/stories` nav link in `app-header.tsx` that was
      causing 404s on RSC prefetch from every page.

**Launch checklist (`docs/launch-checklist.md`):**

- [x] HN submission title + body drafted ("Show HN: Gigawatt Map — …")
- [x] Twitter thread (5-7 tweets) drafted, tagging @openstreetmap
      @GlobalEnergyMon @EIAgov @Protomaps @maplibreorg
- [x] LinkedIn post drafted
- [x] Outreach email templates: Data Center Knowledge, DCD, Semianalysis,
      Latent Space, Stratechery
- [x] Reddit post drafts: r/datacenter, r/dataisbeautiful, r/mapporn, r/investing
- [x] Pre-launch DNS / domain / Cloudflare deploy checklist (5-10 boxes)
- [x] Post-launch monitoring checklist (analytics, error budgets, ticker quota)

**Launch notes (`docs/v0.1-launch-notes.md`):**

- [x] Per CLAUDE.md instructions: what shipped, what didn't, what's next
- [x] Lists every data source live with row count + license
- [x] Lists known gaps from `/about`

## Files to touch

- `docs/launch-checklist.md` (new)
- `docs/v0.1-launch-notes.md` (new)
- `apps/web/src/components/app-header.tsx` (fix broken `/stories` nav)
- `apps/web/next.config.ts` (enable productionBrowserSourceMaps for LH)
- `docs/lighthouse/039-before.{html,pdf}` (archived before-state)

## Notes

- Lighthouse run done locally against `pnpm --filter web build && pnpm --filter web start`
  (NOT dev mode — dev mode tanks Performance score artificially).
- Home page Performance 75 is honest and tracked in 039. Headless Lighthouse
  cannot give a real score for `/` because MapLibre needs a real WebGL
  context; the 75 is from a real Brave DevTools run.
- Don't push to git remote; user controls when origin/main moves.
- Don't actually post to HN/Twitter — drafts only.
