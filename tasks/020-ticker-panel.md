# 020 — Ticker panel (market intelligence overlay)

**Status:** done
**Depends on:** 003
**Estimate:** 3 hours

## Context

Collapsible top-right panel showing real-time-ish prices for the AI-infra public comps. Clicking a ticker filters the map to operators / facilities exposed to that stock. This is the "investor persona" wedge from `SPEC.md §1`.

## Acceptance criteria

- [x] `apps/api/src/routes/tickers.ts` — Cloudflare Worker endpoint `GET /api/v1/tickers` proxies Finnhub `/quote` for the ticker list, caches responses for 10 minutes in Workers KV, returns a single JSON array `[{ symbol, price, change_pct, change_abs, as_of }]`
- [x] Ticker list hardcoded in `apps/api/src/config/tickers.ts`: `EQIX, DLR, IRM, VRT, ETN, NVT, SU, MOD, JCI, NVDA, AVGO, AMD, MRVL, MU, TLN, VST, CEG, NRG, CRWV, NBIS, MSFT, GOOGL, AMZN, META, ORCL`
- [x] `components/ticker-panel/ticker-panel.tsx`:
  - Fetches via TanStack Query with `staleTime: 300_000` (5 min)
  - Groups tickers into 4 sections: REITs / Picks & Shovels / Silicon / Power & Neoclouds
  - Each row: `symbol`, `price` (tabular-nums), `change_pct` (green/red arrow)
  - Clicking a ticker sets `mapStore.tickerFilter = symbol`
  - Filter applies to deck.gl layers: only facilities whose operator links to that ticker remain fully opaque; others fade to 20% opacity
- [x] Ticker-to-operator mapping lives in `apps/web/src/lib/ticker-map.ts` (e.g. `META` → Meta facilities; `TLN` → Susquehanna + AWS campuses it powers; `VRT` → facilities with known Vertiv cooling installs — for v1, conservative matches only; default to "no filter applied" if unsure)
- [x] Panel collapses to a slim vertical strip; state persisted in Zustand
- [x] Clearly labeled "15-min delayed · via Finnhub" with tiny attribution link
- [x] `FINNHUB_TOKEN` in `.env`, never exposed to client

## Files to touch

- `apps/api/src/routes/tickers.ts`
- `apps/api/src/config/tickers.ts`
- `apps/api/wrangler.toml` (KV namespace for cache)
- `apps/web/src/components/ticker-panel/ticker-panel.tsx`
- `apps/web/src/lib/ticker-map.ts`
- `apps/web/src/lib/store/map-store.ts` (add `tickerFilter`)
- `.env.example` (already has `FINNHUB_TOKEN`)

## Notes

- Finnhub free tier = 60 calls/min. With 25 tickers × 6 refreshes/hour = 150 calls/hour = 2.5/min. Well under limits.
- If Finnhub rate-limits or goes down, fall back to Yahoo Finance unofficial or Alpha Vantage. Put the provider behind a `TickerProvider` interface so swapping is trivial.
- The ticker→operator mapping is editorial and imperfect. Err on conservative: only filter when you're confident. Document the methodology in `/about`.
