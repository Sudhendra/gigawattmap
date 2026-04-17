"""Behavior tests for opendc.sources.gem.normalize.

The fixture file ``tests/fixtures/gem-sample.csv`` contains 18 rows
covering each fuel category plus three bad-data cases (out-of-range
coords, (0,0) sentinel, and a year range string). Tests assert:
- 50 MW capacity floor is enforced
- bad coords drop the row
- (0,0) drops the row
- year ranges parse to the first year
- fuel normalization is wired in
- ids are stable
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.sources.gem import normalize

FIXTURE = Path(__file__).parent / "fixtures" / "gem-sample.csv"


@pytest.fixture()
def normalized(tmp_path: Path) -> list[dict]:
    out = normalize(FIXTURE, out_path=tmp_path / "pp.geojson")
    return json.loads(out.read_text())["features"]


def _by_id(features: list[dict]) -> dict[str, dict]:
    return {f["properties"]["id"]: f for f in features}


def test_capacity_floor_drops_small_plants(normalized: list[dict]) -> None:
    ids = {f["properties"]["id"] for f in normalized}
    # 5 MW solar is below threshold.
    assert "gem-G-015" not in ids


def test_bad_coords_dropped(normalized: list[dict]) -> None:
    ids = {f["properties"]["id"] for f in normalized}
    assert "gem-G-016" not in ids  # 200, 500


def test_origin_sentinel_dropped(normalized: list[dict]) -> None:
    ids = {f["properties"]["id"] for f in normalized}
    assert "gem-G-017" not in ids  # (0, 0)


def test_year_range_parses_first_year(normalized: list[dict]) -> None:
    by_id = _by_id(normalized)
    assert by_id["gem-G-018"]["properties"]["commissioning_year"] == 2025


def test_fuel_normalization_applied(normalized: list[dict]) -> None:
    by_id = _by_id(normalized)
    assert by_id["gem-G-002"]["properties"]["fuel_type"] == "coal"  # lignite
    assert by_id["gem-G-005"]["properties"]["fuel_type"] == "solar"  # CSP
    assert by_id["gem-G-009"]["properties"]["fuel_type"] == "hydro"  # pumped storage
    assert by_id["gem-G-010"]["properties"]["fuel_type"] == "storage"  # battery
    assert by_id["gem-G-013"]["properties"]["fuel_type"] == "other"  # geothermal


def test_geometry_is_lon_lat_point(normalized: list[dict]) -> None:
    by_id = _by_id(normalized)
    feat = by_id["gem-G-001"]
    assert feat["geometry"]["type"] == "Point"
    lon, lat = feat["geometry"]["coordinates"]
    # Fixture is lat=40.1, lon=-83.0
    assert lon == pytest.approx(-83.0)
    assert lat == pytest.approx(40.1)


def test_ids_stable_across_runs(tmp_path: Path) -> None:
    a = json.loads(normalize(FIXTURE, out_path=tmp_path / "a.geojson").read_text())
    b = json.loads(normalize(FIXTURE, out_path=tmp_path / "b.geojson").read_text())
    ids_a = sorted(f["properties"]["id"] for f in a["features"])
    ids_b = sorted(f["properties"]["id"] for f in b["features"])
    assert ids_a == ids_b


def test_kept_count_matches_expected(normalized: list[dict]) -> None:
    # 18 fixture rows minus: gem-G-015 (capacity), gem-G-016 (coords),
    # gem-G-017 (origin) = 15 kept.
    assert len(normalized) == 15


def test_all_outputs_pass_schema(normalized: list[dict]) -> None:
    """If normalize() emitted any feature, it already round-tripped through
    PowerPlant. We re-validate from the JSON to confirm schema-level fidelity."""
    from opendc.schemas import PowerPlant

    for feat in normalized:
        props = dict(feat["properties"])
        props["geometry"] = feat["geometry"]
        PowerPlant(**props)
