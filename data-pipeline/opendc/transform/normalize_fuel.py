"""Fuel-type normalization.

GEM's Global Integrated Power Tracker uses ~25 distinct ``Type`` values
(``coal``, ``gas``, ``cogeneration``, ``solar PV``, ``CSP``, ``onshore wind``,
``offshore wind``, ``pumped storage``, ``battery storage``, ``biomass``,
``geothermal``, ``oil/diesel``, ...). Our schema collapses these to a small
:data:`opendc.schemas.FuelType` enum that's enough for layer-styling and
the campus card. The mapping is deliberately conservative: anything we
don't recognise lands in ``other`` rather than guessing.

The normalizer is case-insensitive and trims whitespace because GEM
exports inconsistent casing across years.
"""

from __future__ import annotations

from typing import get_args

from opendc.schemas import FuelType

# Order matters: longer / more-specific phrases appear before short ones
# so e.g. "pumped storage" matches before plain "storage". Each value is
# the canonical FuelType slot the substring routes to.
_FUEL_RULES: tuple[tuple[str, FuelType], ...] = (
    ("coal", "coal"),
    ("lignite", "coal"),
    ("nuclear", "nuclear"),
    ("solar pv", "solar"),
    ("photovoltaic", "solar"),
    ("csp", "solar"),
    ("solar thermal", "solar"),
    ("solar", "solar"),
    ("offshore wind", "wind"),
    ("onshore wind", "wind"),
    ("wind", "wind"),
    ("pumped storage", "hydro"),
    ("hydroelectric", "hydro"),
    ("hydro", "hydro"),
    ("battery", "storage"),
    ("storage", "storage"),
    # Gas variants come after coal so 'coal gasification' isn't misrouted.
    ("natural gas", "gas"),
    ("cogeneration", "gas"),
    ("cogen", "gas"),
    ("gas", "gas"),
    # Anything else - biomass, geothermal, oil/diesel, waste - is "other".
    ("biomass", "other"),
    ("geothermal", "other"),
    ("oil", "other"),
    ("diesel", "other"),
    ("waste", "other"),
)

# Set of all FuelType literals for quick "already canonical?" check.
_CANONICAL: frozenset[str] = frozenset(get_args(FuelType))


def normalize_fuel(raw: str | None) -> FuelType:
    """Map a free-form fuel descriptor to our canonical FuelType enum.

    Returns ``"other"`` for unknown or empty input - the schema requires
    a value, and ``other`` is the documented escape hatch.
    """
    if not raw:
        return "other"
    needle = raw.strip().lower()
    if needle in _CANONICAL:
        # Already a canonical slug - no need to scan rules.
        return needle  # type: ignore[return-value]
    for substring, canonical in _FUEL_RULES:
        if substring in needle:
            return canonical
    return "other"
