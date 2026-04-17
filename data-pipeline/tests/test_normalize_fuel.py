"""Behavior tests for opendc.transform.normalize_fuel.normalize_fuel."""

from __future__ import annotations

import pytest

from opendc.transform.normalize_fuel import normalize_fuel


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        # Canonical pass-through.
        ("coal", "coal"),
        ("gas", "gas"),
        ("solar", "solar"),
        # Variant phrases.
        ("Lignite", "coal"),
        ("Natural Gas", "gas"),
        ("Cogeneration", "gas"),
        ("solar PV", "solar"),
        ("CSP", "solar"),
        ("Photovoltaic", "solar"),
        ("Onshore wind", "wind"),
        ("Offshore Wind", "wind"),
        ("Hydroelectric", "hydro"),
        ("pumped storage", "hydro"),
        ("Battery storage", "storage"),
        ("Biomass", "other"),
        ("Geothermal", "other"),
        ("Oil/Diesel", "other"),
    ],
)
def test_known_mappings(raw: str, expected: str) -> None:
    assert normalize_fuel(raw) == expected


def test_specificity_pumped_before_storage() -> None:
    """'pumped storage' must route to hydro, not storage."""
    assert normalize_fuel("pumped storage") == "hydro"


def test_unknown_input_is_other() -> None:
    assert normalize_fuel("antimatter") == "other"
    assert normalize_fuel("") == "other"
    assert normalize_fuel(None) == "other"


def test_whitespace_and_case() -> None:
    assert normalize_fuel("  COAL  ") == "coal"
