"""Tests for the curated + OSM merge transform.

Covers acceptance criteria from task 014:
- A curated point near an OSM polygon produces one merged feature with
  curated operator and OSM geometry.
- A curated point with no nearby OSM feature produces a standalone
  ``verified`` Point in the output.
- An OSM feature with no curated overlap passes through tagged
  ``osm_only``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from opendc.transform import merge


def _write_fc(path: Path, features: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps({"type": "FeatureCollection", "features": features}))


def _curated_point(
    *,
    id_: str,
    lon: float,
    lat: float,
    operator: str = "google",
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a curated-shape Feature for tests.

    Mirrors what ``opendc.sources.curated`` would emit so the merger
    doesn't notice it came from a fixture.
    """
    props: dict[str, Any] = {
        "id": id_,
        "name": id_,
        "operator_id": operator,
        "tier": "hyperscale",
        "status": "operational",
        "est_mw_mid": 100.0,
        "country": "US",
        "sources": ["curated"],
        "confidence": "verified",
    }
    if extra:
        props.update(extra)
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": props,
    }


def _osm_polygon_around(
    *,
    id_: str,
    lon: float,
    lat: float,
    half_size_deg: float = 0.001,  # ~110m
) -> dict[str, Any]:
    """A small square polygon centred on (lon, lat), in OSM-feature shape."""
    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [lon - half_size_deg, lat - half_size_deg],
                [lon + half_size_deg, lat - half_size_deg],
                [lon + half_size_deg, lat + half_size_deg],
                [lon - half_size_deg, lat + half_size_deg],
                [lon - half_size_deg, lat - half_size_deg],
            ]],
        },
        "properties": {
            "id": id_,
            "name": f"OSM {id_}",
            "operator_id": None,
            "tier": "colo",
            "status": "operational",
            "sources": ["osm"],
            "confidence": "osm_only",
        },
    }


def test_curated_point_merges_with_nearby_osm_polygon(tmp_path: Path) -> None:
    """Acceptance: nearby curated+OSM produce one merged Polygon feature."""
    curated_path = tmp_path / "curated.geojson"
    osm_path = tmp_path / "osm.geojson"
    _write_fc(curated_path, [
        _curated_point(id_="campus-a", lon=-95.0, lat=41.0, operator="google"),
    ])
    # Polygon centroid ~50m from the curated point — well inside 500m.
    _write_fc(osm_path, [
        _osm_polygon_around(id_="osm-1", lon=-95.0005, lat=41.0001),
    ])

    result = merge.merge(curated_path, osm_path, out_path=tmp_path / "out.geojson")

    payload = json.loads(result.out_path.read_text())
    assert len(payload["features"]) == 1
    feat = payload["features"][0]
    # Geometry comes from OSM (Polygon), properties come from curated.
    assert feat["geometry"]["type"] == "Polygon"
    assert feat["properties"]["operator_id"] == "google"
    assert feat["properties"]["confidence"] == "verified"
    # Audit trail: both source tags survive in deterministic order.
    assert feat["properties"]["sources"] == ["curated", "osm"]
    assert feat["properties"]["osm_id"] == "osm-1"
    assert result.merged_count == 1
    assert result.standalone_curated_count == 0
    assert result.osm_only_count == 0


def test_curated_point_with_no_match_is_standalone(tmp_path: Path) -> None:
    """Acceptance: orphan curated point passes through as verified Point."""
    curated_path = tmp_path / "curated.geojson"
    osm_path = tmp_path / "osm.geojson"
    _write_fc(curated_path, [
        _curated_point(id_="campus-orphan", lon=10.0, lat=20.0),
    ])
    # OSM polygon ~111km away → far outside 500m radius.
    _write_fc(osm_path, [
        _osm_polygon_around(id_="osm-far", lon=11.0, lat=20.0),
    ])

    result = merge.merge(curated_path, osm_path, out_path=tmp_path / "out.geojson")

    payload = json.loads(result.out_path.read_text())
    # Two outputs: the standalone curated Point and the unclaimed OSM polygon.
    assert len(payload["features"]) == 2
    standalone = next(f for f in payload["features"] if f["properties"]["id"] == "campus-orphan")
    assert standalone["geometry"]["type"] == "Point"
    assert standalone["properties"]["confidence"] == "verified"
    osm_only = next(f for f in payload["features"] if f["properties"]["id"] == "osm-far")
    assert osm_only["properties"]["confidence"] == "osm_only"
    assert result.merged_count == 0
    assert result.standalone_curated_count == 1
    assert result.osm_only_count == 1


def test_osm_only_passthrough(tmp_path: Path) -> None:
    """Empty curated input → every OSM feature passes through unchanged."""
    curated_path = tmp_path / "curated.geojson"
    osm_path = tmp_path / "osm.geojson"
    _write_fc(curated_path, [])
    _write_fc(osm_path, [
        _osm_polygon_around(id_="osm-1", lon=0.0, lat=0.0),
        _osm_polygon_around(id_="osm-2", lon=1.0, lat=1.0),
    ])

    result = merge.merge(curated_path, osm_path, out_path=tmp_path / "out.geojson")

    payload = json.loads(result.out_path.read_text())
    assert len(payload["features"]) == 2
    assert all(f["properties"]["confidence"] == "osm_only" for f in payload["features"])
    assert result.osm_only_count == 2


def test_nearest_osm_polygon_wins_when_multiple_match(tmp_path: Path) -> None:
    """Two polygons inside radius → merge with the closer one only."""
    curated_path = tmp_path / "curated.geojson"
    osm_path = tmp_path / "osm.geojson"
    # Curated point at the origin; near polygon ~50m east, far polygon ~400m east.
    _write_fc(curated_path, [
        _curated_point(id_="campus-twin", lon=0.0, lat=0.0),
    ])
    _write_fc(osm_path, [
        _osm_polygon_around(id_="osm-near", lon=0.0005, lat=0.0),
        _osm_polygon_around(id_="osm-far", lon=0.004, lat=0.0),
    ])

    result = merge.merge(curated_path, osm_path, out_path=tmp_path / "out.geojson")

    payload = json.loads(result.out_path.read_text())
    # Three features: 1 merged (with osm-near), 1 unclaimed osm-far.
    assert len(payload["features"]) == 2
    merged = next(f for f in payload["features"] if f["properties"]["confidence"] == "verified")
    assert merged["properties"]["osm_id"] == "osm-near"
    osm_only = next(f for f in payload["features"] if f["properties"]["confidence"] == "osm_only")
    assert osm_only["properties"]["id"] == "osm-far"


def test_missing_input_files_handled_gracefully(tmp_path: Path) -> None:
    """Both inputs optional on disk; absent files behave like empty FCs."""
    result = merge.merge(
        tmp_path / "missing-curated.geojson",
        tmp_path / "missing-osm.geojson",
        out_path=tmp_path / "out.geojson",
    )
    assert result.merged_count == 0
    assert result.standalone_curated_count == 0
    assert result.osm_only_count == 0
    payload = json.loads(result.out_path.read_text())
    assert payload["features"] == []
