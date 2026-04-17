"""Curated operator list + fuzzy-matching for inbound operator strings.

Upstream sources record operators as free-form strings ("Amazon Data
Services", "AWS Data Services LLC", "Microsoft Azure"). We collapse those
to a small set of canonical operators (see ``data/operators.csv``) so the
UI can join cross-source records on a single id. The matcher uses
rapidfuzz token-set ratio because operator names commonly appear as
re-orderings ("Microsoft Azure" vs "Azure (Microsoft)").

Threshold is configurable per call; the default of 85 was chosen empirically
to keep "Equinix" → equinix and "DigitalRealty" → digitalrealty matches
while rejecting one-letter typos in unrelated names. Tune up if false
positives appear on a real run.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from functools import lru_cache
from importlib.resources import files
from pathlib import Path

from rapidfuzz import fuzz, process

DEFAULT_THRESHOLD = 85
OPERATORS_CSV = "operators.csv"


@dataclass(frozen=True, slots=True)
class OperatorRecord:
    """One row of ``operators.csv``."""

    id: str
    name: str
    aliases: tuple[str, ...]
    ticker: str | None
    tier: str
    headquarters_country: str


@dataclass(frozen=True, slots=True)
class OperatorMatch:
    """Result of a successful lookup."""

    operator_id: str
    canonical_name: str
    score: float


def _operators_path() -> Path:
    """Resolve the bundled CSV path.

    ``importlib.resources`` is the right primitive: it works whether the
    package is run from source, an installed wheel, or a zipped artifact.
    """
    return Path(str(files("opendc.data").joinpath(OPERATORS_CSV)))


@lru_cache(maxsize=1)
def load_operators() -> tuple[OperatorRecord, ...]:
    """Load and cache the curated operator list.

    LRU cache size 1 because the file is small (~50 rows) and reload
    semantics aren't needed at runtime — tests that need a fresh load
    can call :func:`load_operators.cache_clear`.
    """
    path = _operators_path()
    records: list[OperatorRecord] = []
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(line for line in fh if not line.startswith("#"))
        for row in reader:
            aliases = tuple(a.strip() for a in row["aliases"].split(";") if a.strip())
            records.append(
                OperatorRecord(
                    id=row["id"].strip(),
                    name=row["name"].strip(),
                    aliases=aliases,
                    ticker=(row["ticker"].strip() or None),
                    tier=row["tier"].strip(),
                    headquarters_country=row["headquarters_country"].strip(),
                )
            )
    if not records:
        raise RuntimeError(f"operators.csv at {path} is empty")
    return tuple(records)


def _candidate_index(operators: tuple[OperatorRecord, ...]) -> dict[str, str]:
    """Build a {candidate_string: operator_id} map.

    Each operator contributes its canonical name plus every alias. We
    lowercase here so matching is case-insensitive without paying the
    cost on every query.
    """
    index: dict[str, str] = {}
    for op in operators:
        index[op.name.lower()] = op.id
        for alias in op.aliases:
            index[alias.lower()] = op.id
    return index


def match_operator(
    raw: str | None,
    threshold: int = DEFAULT_THRESHOLD,
) -> OperatorMatch | None:
    """Match a free-form operator string to a canonical operator id.

    Returns ``None`` when the input is empty or no candidate clears the
    score threshold. The returned score is rapidfuzz's 0-100 token-set
    ratio - exposed so callers can record provenance.
    """
    if not raw or not raw.strip():
        return None
    operators = load_operators()
    index = _candidate_index(operators)
    query = raw.strip().lower()

    # `process.extractOne` short-circuits the search and gives us the best
    # candidate in one pass. We use token_set_ratio specifically so that
    # "AWS Data Services" still matches "AWS" cleanly.
    best = process.extractOne(query, index.keys(), scorer=fuzz.token_set_ratio)
    if best is None:
        return None
    candidate, score, _ = best
    if score < threshold:
        return None
    operator_id = index[candidate]
    canonical = next(op.name for op in operators if op.id == operator_id)
    return OperatorMatch(operator_id=operator_id, canonical_name=canonical, score=score)
