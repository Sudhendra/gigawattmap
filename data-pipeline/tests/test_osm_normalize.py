"""Behavior tests for opendc.sources.osm.normalize.

We synthesise a small Overpass response covering all three geometry
types (node, closed way, multipolygon relation) and verify:
- features round-trip through the Datacenter schema
- centroid is a Point
- operator fuzzy-match propagates the operator_id
- est_mw_* is populated for polygons and null for points
- ids are stable across re-runs
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.operators import load_operators
from opendc.sources.osm import normalize


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    load_operators.cache_clear()


def _square(lat: float, lon: float, side_deg: float = 0.005) -> list[dict[str, float]]:
    """Closed CCW ring; ~500m on a side near mid-latitudes."""
    return [
        {"lat": lat, "lon": lon},
        {"lat": lat, "lon": lon + side_deg},
        {"lat": lat + side_deg, "lon": lon + side_deg},
        {"lat": lat + side_deg, "lon": lon},
        {"lat": lat, "lon": lon},
    ]


@pytest.fixture()
def fake_overpass(tmp_path: Path) -> Path:
    payload = {
        "elements": [
            {
                "type": "node",
                "id": 100,
                "lat": 32.78,
                "lon": -96.80,
                "tags": {
                    "telecom": "data_center",
                    "name": "Test DC Node",
                    "operator": "Equinix",
                    "addr:country": "US",
                },
            },
            {
                "type": "way",
                "id": 200,
                "geometry": _square(32.79, -96.81),
                "tags": {
                    "building": "data_center",
                    "name": "Test DC Way",
                    "operator": "AWS",
                    "addr:country": "US",
                },
            },
            {
                "type": "relation",
                "id": 300,
                "tags": {
                    "telecom": "data_center",
                    "name": "Test DC Relation",
                    "operator": "Microsoft Azure",
                },
                "members": [
                    {
                        "type": "way",
                        "role": "outer",
                        "geometry": _square(32.80, -96.82),
                    }
                ],
            },
        ]
    }
    raw = tmp_path / "raw.json"
    raw.write_text(json.dumps(payload))
    return raw


def test_normalize_handles_all_three_geometry_types(
    fake_overpass: Path, tmp_path: Path
) -> None:
    out = normalize(fake_overpass, out_path=tmp_path / "dc.geojson")
    fc = json.loads(out.read_text())
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) == 3


def test_normalize_resolves_operator_ids(fake_overpass: Path, tmp_path: Path) -> None:
    out = normalize(fake_overpass, out_path=tmp_path / "dc.geojson")
    by_id = {
        f["properties"]["id"]: f["properties"] for f in json.loads(out.read_text())["features"]
    }
    assert by_id["osm-node-100"]["operator_id"] == "equinix"
    assert by_id["osm-way-200"]["operator_id"] == "amazon"
    assert by_id["osm-relation-300"]["operator_id"] == "microsoft"


def test_centroid_is_point(fake_overpass: Path, tmp_path: Path) -> None:
    out = normalize(fake_overpass, out_path=tmp_path / "dc.geojson")
    for feat in json.loads(out.read_text())["features"]:
        assert feat["properties"]["centroid"]["type"] == "Point"


def test_polygons_get_mw_estimate_points_do_not(
    fake_overpass: Path, tmp_path: Path
) -> None:
    out = normalize(fake_overpass, out_path=tmp_path / "dc.geojson")
    by_id = {
        f["properties"]["id"]: f["properties"] for f in json.loads(out.read_text())["features"]
    }
    # Node has no area → all None.
    assert by_id["osm-node-100"]["est_mw_mid"] is None
    assert by_id["osm-node-100"]["mw_source"] is None
    # Way + relation have polygons → midpoint must be > 0.
    assert by_id["osm-way-200"]["est_mw_mid"] is not None
    assert by_id["osm-way-200"]["est_mw_mid"] > 0
    assert by_id["osm-way-200"]["mw_source"] == "estimate"
    assert by_id["osm-relation-300"]["est_mw_mid"] is not None


def test_ids_are_stable(fake_overpass: Path, tmp_path: Path) -> None:
    """Re-running normalize on the same raw input must produce the same ids."""
    out_a = normalize(fake_overpass, out_path=tmp_path / "a.geojson")
    out_b = normalize(fake_overpass, out_path=tmp_path / "b.geojson")
    ids_a = sorted(f["properties"]["id"] for f in json.loads(out_a.read_text())["features"])
    ids_b = sorted(f["properties"]["id"] for f in json.loads(out_b.read_text())["features"])
    assert ids_a == ids_b
    assert ids_a == ["osm-node-100", "osm-relation-300", "osm-way-200"]


def test_missing_country_falls_back_to_xx(tmp_path: Path) -> None:
    raw = tmp_path / "raw.json"
    raw.write_text(
        json.dumps(
            {
                "elements": [
                    {
                        "type": "node",
                        "id": 1,
                        "lat": 0.0,
                        "lon": 0.0,
                        "tags": {"telecom": "data_center", "name": "Anon"},
                    }
                ]
            }
        )
    )
    out = normalize(raw, out_path=tmp_path / "dc.geojson")
    feats = json.loads(out.read_text())["features"]
    assert feats[0]["properties"]["country"] == "XX"


def test_degenerate_geometry_skipped(tmp_path: Path) -> None:
    raw = tmp_path / "raw.json"
    raw.write_text(
        json.dumps(
            {
                "elements": [
                    # node with no coords
                    {"type": "node", "id": 1, "tags": {"telecom": "data_center"}},
                    # way with one point
                    {
                        "type": "way",
                        "id": 2,
                        "geometry": [{"lat": 0, "lon": 0}],
                        "tags": {"building": "data_center"},
                    },
                ]
            }
        )
    )
    out = normalize(raw, out_path=tmp_path / "dc.geojson")
    assert json.loads(out.read_text())["features"] == []
