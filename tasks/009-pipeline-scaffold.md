# 009 — Python data-pipeline scaffold

**Status:** in-progress
**Depends on:** 001
**Estimate:** 1 hour

## Context

Set up the Python side: `uv`, ruff, mypy strict, pydantic, typer CLI, shared schemas module. No data fetched yet — this is the skeleton.

## Acceptance criteria

- [ ] `data-pipeline/pyproject.toml` has deps per `SPEC.md §9` (httpx, geopandas, shapely, pydantic, typer, rich, overpy, rapidfuzz, boto3) and dev-deps (ruff, pytest, mypy)
- [ ] `data-pipeline/uv.lock` committed
- [ ] `data-pipeline/opendc/__init__.py` exists, `__version__ = "0.1.0"`
- [ ] `data-pipeline/opendc/cli.py` is a typer app with commands: `ingest`, `transform`, `tiles`, `upload` — each printing "not implemented" and exiting 0 for now
- [ ] `data-pipeline/opendc/schemas.py` — pydantic v2 models matching `@gigawattmap/types`: `Datacenter`, `PowerPlant`, `Cable`, `Operator`, `Announcement`
- [ ] `data-pipeline/opendc/utils/http.py` — `get_http_client()` returning a configured `httpx.Client` with retry, backoff (tenacity), sensible UA header (`Gigawatt Map / 0.1 — https://gigawattmap.com`), 30s timeout
- [ ] `data-pipeline/Makefile` with targets: `install`, `lint`, `typecheck`, `test`, `fmt`
- [ ] `make lint && make typecheck && make test` all exit 0 on the skeleton
- [ ] Ruff config in pyproject: line-length 100, select all sensible rules, target 3.11

## Files to touch

- `data-pipeline/pyproject.toml`
- `data-pipeline/uv.lock`
- `data-pipeline/opendc/__init__.py`
- `data-pipeline/opendc/cli.py`
- `data-pipeline/opendc/schemas.py`
- `data-pipeline/opendc/utils/__init__.py`
- `data-pipeline/opendc/utils/http.py`
- `data-pipeline/Makefile`
- `data-pipeline/tests/test_schemas.py` (one round-trip test per model)

## Notes

The `opendc/` package name is internal shorthand and fine to keep — folder naming doesn't affect branding. If you'd prefer public-facing naming consistency, rename to `gigawattmap/` but update all imports. Leave as `opendc/` for now to keep task cards short.
