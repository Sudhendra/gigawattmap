# ADR 0004 — Cloudflare Pages + Workers + R2 over Vercel

**Status:** Accepted
**Date:** 2026-04-17

## Context

Gigawatt Map needs: Next.js hosting, an API for tickers / search index / OG images, object storage for PMTiles and data artifacts, a small DB for v1.5 watchlists, and a rate-limiter for the public API. We also expect bursty traffic (HN hug-of-death) and want flat, predictable costs.

Two serious stacks:

1. **Vercel** — best-in-class Next.js DX, edge functions, but data egress gets expensive, R2-equivalent (Vercel Blob) is pricier, and public-API rate limiting requires third-party tools.
2. **Cloudflare** — Pages for Next.js, Workers for API, R2 for storage (no egress fees), D1 for the DB, native rate limiting at the edge.

## Decision

Cloudflare all the way. Pages hosts the Next.js app, Workers hosts the API, R2 stores PMTiles and data artifacts, D1 handles v1.5 watchlists, Workers KV caches ticker quotes.

## Consequences

**Positive:**
- **R2 has zero egress fees.** Critical for a public-good product where we actively want people to download the data.
- **Rate limiting is native** — a binding, not a library.
- **Edge compute is cheap** — the free Workers tier handles serious traffic.
- **Everything is one provider, one bill, one dashboard.**
- **D1 is SQLite at the edge** — simple mental model for the watchlist feature.

**Negative:**
- Next.js on Cloudflare Pages has rougher edges than on Vercel. Some Next features (streaming, middleware runtime) behave differently. Mitigation: keep the web app mostly-static; push dynamic behavior into Workers.
- Vercel's preview deployments and UI analytics are better. Mitigation: PostHog for analytics; Pages' preview URLs are fine.
- Cloudflare's Workers Node compatibility is partial. Mitigation: keep the API stateless and simple.

## Alternatives considered

- **Vercel + Cloudflare R2:** get Vercel's Next DX + R2's egress pricing. Works, but fragments the stack and doubles billing. Not worth it.
- **Fly.io:** great for stateful services but overkill — we don't need long-running servers.
- **AWS (CloudFront + S3 + Lambda):** every detail is configurable; every detail is also a lever you have to pull. Too much toil for one person.
- **Self-hosted VPS:** the wrong direction for a solo project that might get hugged by HN.

## Follow-ups

- Monitor Cloudflare Workers CPU time on the API — if any route consistently exceeds the 30s/10ms limits, split it.
- If we ever add image processing heavy enough to warrant it, evaluate Cloudflare Images (their transform product) before reaching for anything else.
