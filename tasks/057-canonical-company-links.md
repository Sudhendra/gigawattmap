# 057 — Join canonical company identities

**Status:** done
**Depends on:** 052
**Estimate:** 1 hour

## Context

Live operator names differ from display aliases (Amazon Web Services versus Amazon). Company counts and map highlighting must use the existing canonical operator IDs, consistently with Activity scopes.

## Acceptance criteria

- [x] Regression fails before fix for an Amazon Web Services facility with canonical amazon ID.
- [x] Counts and filter targets recognize canonical IDs for mapped operators, without inferring supplier/offtake relationships for unmapped tickers.
- [x] Web tests/build pass and deployed behavior verified.

## Files to touch

- `apps/web/src/lib/ticker-map.ts`
- `apps/web/src/lib/ticker-map.test.ts`

## Notes

No inferred financial exposure; existing canonical registry only.

## Verification — 2026-10-30

Regression observed failing before fix. 150 web tests and production build pass. Live Amazon selection exposes matching facilities and fit control; supplier/offtake exclusions retained. Deployed in fa0c11a5.
