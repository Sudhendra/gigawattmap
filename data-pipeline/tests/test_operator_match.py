"""Behavior tests for opendc.operators.match_operator.

We test edge cases that have bitten data-quality work in past projects:
abbreviations (AWS→amazon), common misspellings, irrelevant strings that
would clear a naive ratio scorer, and empty input.
"""

from __future__ import annotations

import pytest

from opendc.operators import load_operators, match_operator


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    load_operators.cache_clear()


def test_exact_canonical_name_matches() -> None:
    result = match_operator("Equinix")
    assert result is not None
    assert result.operator_id == "equinix"
    assert result.score >= 95


def test_alias_abbreviation_matches() -> None:
    """AWS is an alias for amazon — the joined index should resolve it."""
    result = match_operator("AWS")
    assert result is not None
    assert result.operator_id == "amazon"


def test_case_insensitive() -> None:
    assert match_operator("EQUINIX") is not None
    assert match_operator("equinix") is not None


def test_minor_misspelling_still_matches() -> None:
    """One-letter typo should clear the default 85 threshold."""
    result = match_operator("Equnix")
    assert result is not None
    assert result.operator_id == "equinix"


def test_unrelated_string_rejected() -> None:
    assert match_operator("Springfield Power Co") is None


def test_empty_input_returns_none() -> None:
    assert match_operator(None) is None
    assert match_operator("") is None
    assert match_operator("   ") is None


def test_threshold_is_respected() -> None:
    """Raising the threshold should reject borderline matches."""
    # "Microsft" (typo) clears 85 but not 99.
    assert match_operator("Microsft", threshold=85) is not None
    assert match_operator("Microsft", threshold=99) is None


def test_returns_canonical_name() -> None:
    result = match_operator("AWS Data Services LLC")
    assert result is not None
    assert result.operator_id == "amazon"
    assert result.canonical_name == "Amazon Web Services"
