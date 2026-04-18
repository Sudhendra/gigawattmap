# 029 — Document NEXT_PUBLIC_API_BASE for local dev

**Status:** todo
**Depends on:** none
**Estimate:** 10m

## Context
In production the web app and Worker API share the `gigawattmap.com` origin via
Cloudflare routing, so `fetch('/api/v1/tickers')` works. In local dev,
`next dev` (port 3000) and `wrangler dev` (port 8787) are different origins,
and `apps/web/src/components/ticker-panel/ticker-panel.tsx:20` defaults
`NEXT_PUBLIC_API_BASE` to `''` — so the ticker panel hits
`http://localhost:3000/api/v1/tickers` and Next.js returns 404.

The `NEXT_PUBLIC_API_BASE` env var already exists; it just isn't documented
in `.env.example`. Document it so dev setup is self-explanatory.

## Acceptance criteria
- [ ] `apps/web/.env.example` documents `NEXT_PUBLIC_API_BASE` with the
      `http://localhost:8787` dev value and prod note.
- [ ] `apps/web/.env.local` sets `NEXT_PUBLIC_API_BASE=http://localhost:8787`
      (gitignored; user-side change).
- [ ] `pnpm --filter web build` exits 0.

## Files to touch
- `apps/web/.env.example`
- `apps/web/.env.local` (gitignored, manual)

## Notes
- No code change required — `ticker-panel.tsx:20` already reads the env var
  with an empty-string fallback (which is the correct prod behavior).
- `apps/web/src/app/data/api/page.tsx:11` hard-codes the prod URL for display
  only; leave as-is.
- Worker default port from `wrangler dev` is `8787`; `apps/api/wrangler.toml`
  does not pin it.
