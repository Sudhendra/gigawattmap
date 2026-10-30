# 057 — Join canonical company identities

**Status:** in-progress
**Depends on:** 052
**Estimate:** 1 hour

## Context

Live operator names differ from display aliases (Amazon Web Services versus Amazon). Company counts and map highlighting must use the existing canonical operator IDs, consistently with Activity scopes.

## Acceptance criteria

- [x] Regression fails before fix for an Amazon Web Services facility with canonical amazon ID.
- [ ] Counts and filter targets recognize canonical IDs for mapped operators, without inferring supplier/offtake relationships for unmapped tickers.
- [ ] Web tests/build pass and deployed behavior verified.

## Files to touch

- `apps/web/src/lib/ticker-map.ts`
- `apps/web/src/lib/ticker-map.test.ts`

## Notes

No inferred financial exposure; existing canonical registry only.
