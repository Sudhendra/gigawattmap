"""Tests for the substation proximity enrichment transform."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.transform.enrich_substations import (
    enrich_datacenters,
    haversine_km,
    pick_best_substation,
)


def _substation(
    sid: str, lon: float, lat: float, voltage_kv: int | None = None
) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {
            "id": sid,
            "kind": "substation",
            "voltage_kv": voltage_kv,
            "name": None,
            "operator": None,
        },
    }


def _datacenter(did: str, lon: float, lat: float, **extra: object) -> dict:
    props = {"id": did, "name": did, **extra}
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": props,
    }


# --- haversine -------------------------------------------------------------


def test_haversine_zero_distance() -> None:
    assert haversine_km(0.0, 0.0, 0.0, 0.0) == pytest.approx(0.0, abs=1e-6)


def test_haversine_known_distance() -> None:
    # NYC (40.7128, -74.0060) to LA (34.0522, -118.2437) ~ 3935 km.
    d = haversine_km(-74.0060, 40.7128, -118.2437, 34.0522)
    assert d == pytest.approx(3935, abs=10)


# --- pick_best_substation --------------------------------------------------


def test_pick_best_prefers_higher_voltage_when_close() -> None:
    """345kV at 2km beats 115kV at 1km: voltage outranks distance."""
    candidates = [
        ("sub-low", 1.0, 115),
        ("sub-high", 2.0, 345),
    ]
    best = pick_best_substation(candidates)
    assert best is not None
    assert best[0] == "sub-high"


def test_pick_best_breaks_voltage_tie_by_distance() -> None:
    candidates = [
        ("sub-far", 5.0, 230),
        ("sub-near", 1.5, 230),
    ]
    best = pick_best_substation(candidates)
    assert best is not None
    assert best[0] == "sub-near"


def test_pick_best_treats_missing_voltage_as_lowest() -> None:
    """Unknown voltage shouldn't beat a real high-voltage substation."""
    candidates = [
        ("sub-known", 4.0, 230),
        ("sub-unknown", 1.0, None),
    ]
    best = pick_best_substation(candidates)
    assert best is not None
    assert best[0] == "sub-known"


def test_pick_best_returns_none_on_empty() -> None:
    assert pick_best_substation([]) is None


# --- enrich_datacenters ----------------------------------------------------


def test_enrich_picks_correct_substation_within_10km(tmp_path: Path) -> None:
    """Three substations at known distances: highest voltage in range wins."""
    # Datacenter at (0, 0).
    dc = _datacenter("dc-1", 0.0, 0.0)
    # ~1 deg lat == 111 km, so use small offsets.
    # sub-a: ~3.3 km away, 115 kV
    # sub-b: ~5.5 km away, 345 kV  <- should win (highest voltage in range)
    # sub-c: ~99 km away,  500 kV  <- excluded by 10 km radius
    substations = [
        _substation("sub-a", 0.03, 0.0, 115),
        _substation("sub-b", 0.05, 0.0, 345),
        _substation("sub-c", 0.9, 0.0, 500),
    ]
    dc_path = tmp_path / "dc.geojson"
    sub_path = tmp_path / "sub.geojson"
    out_path = tmp_path / "out.geojson"
    dc_path.write_text(json.dumps({"type": "FeatureCollection", "features": [dc]}))
    sub_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": substations})
    )

    result = enrich_datacenters(dc_path, sub_path, out_path=out_path)

    data = json.loads(result.read_text())
    props = data["features"][0]["properties"]
    assert props["nearest_substation_id"] == "sub-b"
    assert props["nearest_substation_voltage_kv"] == 345
    assert props["nearest_substation_distance_km"] == pytest.approx(5.5, abs=0.3)


def test_enrich_writes_nulls_when_no_substation_in_range(tmp_path: Path) -> None:
    dc = _datacenter("dc-remote", 0.0, 0.0)
    far_sub = _substation("sub-far", 1.0, 0.0, 500)  # ~111 km away
    dc_path = tmp_path / "dc.geojson"
    sub_path = tmp_path / "sub.geojson"
    out_path = tmp_path / "out.geojson"
    dc_path.write_text(json.dumps({"type": "FeatureCollection", "features": [dc]}))
    sub_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": [far_sub]})
    )

    result = enrich_datacenters(dc_path, sub_path, out_path=out_path)

    props = json.loads(result.read_text())["features"][0]["properties"]
    assert props["nearest_substation_id"] is None
    assert props["nearest_substation_distance_km"] is None
    assert props["nearest_substation_voltage_kv"] is None


def test_enrich_ignores_non_substation_kinds(tmp_path: Path) -> None:
    """Plants and lines are in osm-power.geojson but must not be matched."""
    dc = _datacenter("dc-1", 0.0, 0.0)
    plant = {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [0.01, 0.0]},
        "properties": {"id": "plant-1", "kind": "plant", "voltage_kv": 500},
    }
    sub = _substation("sub-1", 0.05, 0.0, 230)
    dc_path = tmp_path / "dc.geojson"
    sub_path = tmp_path / "sub.geojson"
    out_path = tmp_path / "out.geojson"
    dc_path.write_text(json.dumps({"type": "FeatureCollection", "features": [dc]}))
    sub_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": [plant, sub]})
    )

    result = enrich_datacenters(dc_path, sub_path, out_path=out_path)

    props = json.loads(result.read_text())["features"][0]["properties"]
    assert props["nearest_substation_id"] == "sub-1"


def test_enrich_distance_rounded_to_one_decimal(tmp_path: Path) -> None:
    dc = _datacenter("dc-1", 0.0, 0.0)
    sub = _substation("sub-1", 0.05, 0.0, 230)
    dc_path = tmp_path / "dc.geojson"
    sub_path = tmp_path / "sub.geojson"
    out_path = tmp_path / "out.geojson"
    dc_path.write_text(json.dumps({"type": "FeatureCollection", "features": [dc]}))
    sub_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": [sub]})
    )

    result = enrich_datacenters(dc_path, sub_path, out_path=out_path)

    distance = json.loads(result.read_text())["features"][0]["properties"][
        "nearest_substation_distance_km"
    ]
    # Single decimal place
    assert distance == round(distance, 1)
