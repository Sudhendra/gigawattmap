# Gigawatt Map data pipeline — convenience targets.
#
# Every target shells out to `uv` so contributors don't need to know the
# exact dep-management invocation. CI runs the same targets.

.PHONY: install lint typecheck test fmt gen-types check-types-fresh all

install:
	uv sync --all-extras --dev

lint:
	uv run ruff check .

fmt:
	uv run ruff format .
	uv run ruff check --fix .

typecheck:
	uv run mypy opendc

test:
	uv run pytest

gen-types:
	uv run opendc gen-types

# Used by the repo pre-commit hook: regenerates schema.json into a temp
# location and diffs against the committed copy. Exit 1 means schemas.py
# moved without rerunning `make gen-types`.
check-types-fresh:
	@uv run opendc gen-types --skip-ts --out-dir $(CURDIR)/.gen-types-check >/dev/null
	@diff -q $(CURDIR)/.gen-types-check/schema.json \
		$(CURDIR)/../packages/types/src/generated/schema.json \
		|| (echo "schemas.py changed without running 'make gen-types'"; \
		    rm -rf $(CURDIR)/.gen-types-check; exit 1)
	@rm -rf $(CURDIR)/.gen-types-check

all: lint typecheck test
