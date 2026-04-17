# 000 — Bootstrap repo

**Status:** in-progress
**Depends on:** none
**Estimate:** 30 min

## Context

Empty repo → ready to scaffold a monorepo. Set the baseline files every sensible repo has.

## Acceptance criteria

- [ ] `.gitignore` covers Node, Python, OS files, editor files, build artifacts, `.env*`
- [ ] `.editorconfig` at root (LF, 2-space, trim trailing whitespace, final newline)
- [ ] `.nvmrc` contains `20.18.0`
- [ ] `.prettierrc` contains `{"semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100}`
- [ ] `.env.example` committed with placeholder vars: `R2_ACCESS_KEY_ID=`, `R2_SECRET_ACCESS_KEY=`, `R2_BUCKET=gigawattmap`, `FINNHUB_TOKEN=`, `NEXT_PUBLIC_PMTILES_BASE=`
- [ ] Top-level `README.md` says "Gigawatt Map" and one-liner tagline
- [ ] Repo is empty of build artifacts — `git status` clean after commit

## Files to touch

- `.gitignore`, `.editorconfig`, `.nvmrc`, `.prettierrc`, `.env.example`, `README.md`

## Notes

Keep the root `README.md` minimal — the big description lives in `SPEC.md`.
