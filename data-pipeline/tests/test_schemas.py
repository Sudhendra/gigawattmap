"""Round-trip tests for every Pydantic model.

These exist to catch schema drift the moment it happens: if someone adds
or renames a field on the TS side without mirroring it here (or vice
versa), the matching round-trip will fail because either the input dict
won't validate or the dumped JSON will lose a field.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from opendc.schemas import (
    Announcement,
    Cable,
    CableLanding,
    Datacenter,
    Operator,
    PowerPlant,
)

POINT_GEOM = {"type": "Point", "coordinates": [-95.0, 38.0]}
LINE_GEOM = {"type": "LineString", "coordinates": [[-1.0, 50.0], [1.0, 51.0]]}


def test_operator_round_trip() -> None:
    raw = {
        "id": "meta",
        "name": "Meta Platforms",
        "ticker": "META",
        "tier": "hyperscale",
        "headquarters_country": "US",
    }
    op = Operator.model_validate(raw)
    assert op.model_dump() == raw


def test_datacenter_round_trip() -> None:
    raw = {
        "id": "meta-richland-wa",
        "name": "Meta Richland",
        "operator_id": "meta",
        "tier": "hyperscale",
        "status": "construction",
        "geometry": POINT_GEOM,
        "est_mw_low": 200.0,
        "est_mw_mid": 300.0,
        "est_mw_high": 400.0,
        "mw_source": "announcement",
        "country": "US",
        "region": "US-WA",
        "sources": ["https://example.com/press"],
        "confidence": "press_release",
    }
    dc = Datacenter.model_validate(raw)
    assert dc.model_dump() == raw


def test_powerplant_round_trip() -> None:
    raw = {
        "id": "gem-10293",
        "name": "Some Plant",
        "fuel_type": "gas",
        "capacity_mw": 1234.5,
        "geometry": POINT_GEOM,
        "operator": "Acme Power",
        "commissioning_year": 2018,
        "source": "gem",
    }
    pp = PowerPlant.model_validate(raw)
    assert pp.model_dump() == raw


def test_cable_round_trip() -> None:
    raw = {
        "id": "marea",
        "name": "MAREA",
        "length_km": 6605.0,
        "capacity_tbps": 200.0,
        "landing_points": [
            {"name": "Virginia Beach", "country": "US", "coordinates": (-75.96, 36.85)},
            {"name": "Bilbao", "country": "ES", "coordinates": (-2.92, 43.26)},
        ],
        "geometry": LINE_GEOM,
        "rfs_year": 2018,
    }
    cable = Cable.model_validate(raw)
    # Coordinates round-trip from tuple via list when JSON-serialized; the
    # model's ``model_dump`` returns the native Python representation.
    dumped = cable.model_dump()
    assert dumped["id"] == "marea"
    assert dumped["landing_points"][0]["country"] == "US"
    # Sanity: re-validating the dump produces an equivalent model.
    assert Cable.model_validate(dumped) == cable


def test_announcement_round_trip() -> None:
    raw = {
        "id": "2026-04-meta-richland",
        "date": "2026-04-15",
        "title": "Meta breaks ground on Richland phase II",
        "operator_id": "meta",
        "datacenter_id": "meta-richland-wa",
        "amount_usd": 1_500_000_000.0,
        "category": "capex",
        "source_url": "https://example.com/press",
    }
    ann = Announcement.model_validate(raw)
    assert ann.model_dump() == raw


# --- Negative paths ---------------------------------------------------------


def test_unknown_geometry_type_rejected() -> None:
    with pytest.raises(ValidationError):
        Datacenter.model_validate(
            {
                "id": "x",
                "name": "x",
                "operator_id": None,
                "tier": "hyperscale",
                "status": "operational",
                "geometry": {"type": "Squiggle", "coordinates": []},
                "est_mw_low": None,
                "est_mw_mid": None,
                "est_mw_high": None,
                "mw_source": None,
                "country": "US",
                "region": None,
                "sources": [],
                "confidence": "estimated",
            }
        )


def test_extra_fields_forbidden() -> None:
    with pytest.raises(ValidationError):
        Operator.model_validate(
            {
                "id": "meta",
                "name": "Meta",
                "ticker": None,
                "tier": "hyperscale",
                "headquarters_country": "US",
                "secret_field": True,
            }
        )


def test_landing_country_must_be_two_letters() -> None:
    with pytest.raises(ValidationError):
        CableLanding.model_validate(
            {"name": "X", "country": "USA", "coordinates": (0.0, 0.0)}
        )
