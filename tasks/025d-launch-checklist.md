# 025d — Launch checklist + Lighthouse verification

**Status:** todo
**Depends on:** 025a, 025b, 025c
**Estimate:** 45m

## Context

Final card. Run Lighthouse against the deployed (or local production build)
site, document pass/fail against AGENTS.md budgets, write the launch
checklist with HN/Twitter/outreach drafts, and write v0.1 launch notes.

## Acceptance criteria

**Lighthouse:**

- [ ] `docs/launch-checklist.md` records desktop scores for `/`, `/about`,
      `/data`, `/data/api`
- [ ] Targets: desktop Performance ≥90, Accessibility ≥95, Best Practices ≥95,
      SEO ≥95; mobile Performance ≥80, others same
- [ ] Any miss documented with profile notes and a follow-up task NNN reference
- [ ] `console` clean on all 4 pages (no errors, no React warnings)

**Launch checklist (`docs/launch-checklist.md`):**

- [ ] HN submission title + body drafted ("Show HN: Gigawatt Map — …")
- [ ] Twitter thread (5-7 tweets) drafted, tagging @openstreetmap
      @GlobalEnergyMon @EIAgov @Protomaps @maplibreorg
- [ ] LinkedIn post drafted
- [ ] Outreach email templates: Data Center Knowledge, DCD, Semianalysis,
      Latent Space, Stratechery
- [ ] Reddit post drafts: r/datacenter, r/dataisbeautiful, r/mapporn, r/investing
- [ ] Pre-launch DNS / domain / Cloudflare deploy checklist (5-10 boxes)
- [ ] Post-launch monitoring checklist (analytics, error budgets, ticker quota)

**Launch notes (`docs/v0.1-launch-notes.md`):**

- [ ] Per CLAUDE.md instructions: what shipped, what didn't, what's next
- [ ] Lists every data source live with row count + license
- [ ] Lists known gaps from `/about`

## Files to touch

- `docs/launch-checklist.md` (new)
- `docs/v0.1-launch-notes.md` (new)

## Notes

- Lighthouse run done locally against `pnpm --filter web build && pnpm --filter web start`
  (NOT dev mode — dev mode tanks Performance score artificially).
- Don't push to git remote; user controls when origin/main moves.
- Don't actually post to HN/Twitter — drafts only.
