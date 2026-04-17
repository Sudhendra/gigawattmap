# 006 — Intelligence Card drawer

**Status:** in-progress
**Depends on:** 005
**Estimate:** 3 hours

## Context

The signature UI element. Click a datacenter → right-side drawer opens with structured detail. URL-synced so the view is shareable. Keyboard accessible.

## Acceptance criteria

- [ ] `components/intelligence-card/intelligence-card.tsx` — Radix Dialog configured as right-anchored drawer (not centered)
- [ ] Opens on datacenter click, closes on: Esc, overlay click, explicit close button
- [ ] URL syncs: `?dc=<id>` (use `useSearchParams` + `router.replace` with `{ scroll: false }`)
- [ ] On direct load of `/?dc=<id>`, drawer opens and map flies to the feature
- [ ] Sections (see `SPEC.md §2.B` for visual):
  - Header (name, status badge, location string)
  - Stats row (MW range, GPU count if present, CAPEX if present)
  - Operator / Tenants
  - Power (placeholder for v1 — shows "Utility lookup coming soon" — task 017 fills this in)
  - Water (placeholder until WRI Aqueduct integration)
  - Context (press/announcement notes from the seed data)
  - Market Exposure (placeholder until task 020)
  - Sources (always show at least OSM attribution)
- [ ] Spring animation on open/close (framer-motion or Motion): ~250ms, no bounce
- [ ] `aria-labelledby` points to the header, `role="dialog"`, focus trap active
- [ ] Close button in top-right, visible but understated
- [ ] Copies share URL to clipboard via share button; toast confirms

## Files to touch

- `apps/web/src/components/intelligence-card/intelligence-card.tsx`
- `apps/web/src/components/intelligence-card/field-row.tsx` (reusable k/v row with source-hover underline)
- `apps/web/src/components/intelligence-card/status-badge.tsx`
- `apps/web/src/app/page.tsx` (wires selected-DC state ↔ URL ↔ drawer)
- `apps/web/package.json` (radix dialog, motion)

## Notes

- Use `@radix-ui/react-dialog` for a11y baseline, style with Tailwind.
- Every numeric field must use `tabular-nums`.
- Underline-on-hover source revelation is a signature move — implement it on `FieldRow`.
