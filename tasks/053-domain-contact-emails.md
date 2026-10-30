# 053 — Publish domain contact emails

**Status:** done
**Depends on:** none
**Estimate:** 30 minutes

## Context

The owner has configured three domain email forwards and requested publication on the website and repository README.

## Acceptance criteria

- [x] About links hello@ for general/press/partnership/sponsorship inquiries, support@ for help/data corrections, and sudhendra@ for direct contact.
- [x] README includes all three clickable addresses with matching purposes.
- [x] Public About no longer lists the previous Gmail address.
- [x] Existing contact test and production build pass; generated and live About HTML contain all three mailto links.
- [x] Changes pushed to GitHub and website deployed to Cloudflare Pages.

## Files to touch

- `apps/web/src/app/about/page.tsx`
- `apps/web/src/app/about/contact.test.ts`
- `README.md`

## Notes

Content-only change; no dependencies, email service configuration, or outbound emails. Existing map bundle budget tracked separately in task 048 is unaffected.

## Verification

148 web tests passed; production build passed. Generated About HTML and README checked for all three mailto links. Live About HTML verified after Cloudflare Pages deployment `5acd0506` (application commit `9aef838`). No mail was sent.
