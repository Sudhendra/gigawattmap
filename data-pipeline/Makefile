# Gigawatt Map data pipeline — convenience targets.
#
# Every target shells out to `uv` so contributors don't need to know the
# exact dep-management invocation. CI runs the same targets.

.PHONY: install lint typecheck test fmt all

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

all: lint typecheck test
