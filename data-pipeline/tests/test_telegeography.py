"""Tests for opendc.sources.telegeography.

Covers fixture round-trip (2 cables: marea single-segment, apricot
multi-segment), country mapping, length parsing, and graceful skipping
of unmapped countries / missing geometries.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.sources import telegeography as tg

FIXTURE = Path(__file__).parent / "fixtures" / "telegeography-sample.json"


@pytest.fixture()
def raw_paths(tmp_path: Path) -> dict[str, Path]:
    """Split the composite fixture into the three files normalize() expects."""
    data = json.loads(FIXTURE.read_text())
    paths = {
        "cable_geo": tmp_path / "cable-geo.json",
        "landing_geo": tmp_path / "landing-geo.json",
        "details": tmp_path / "details.json",
    }
    paths["cable_geo"].write_text(json.dumps(data["cable_geo"]))
    paths["landing_geo"].write_text(json.dumps(data["landing_geo"]))
    paths["details"].write_text(json.dumps(data["cable_metadata"]))
    return paths


# --- pure helpers ---------------------------------------------------------


class TestCountryToIso2:
    def test_known_simple(self) -> None:
        assert tg.country_to_iso2("Spain") == "ES"
        assert tg.country_to_iso2("United States") == "US"
        assert tg.country_to_iso2("United Kingdom") == "GB"

    def test_known_with_comma(self) -> None:
        # The hardest case: country name itself contains a comma.
        assert tg.country_to_iso2("Congo, Dem. Rep.") == "CD"
        assert tg.country_to_iso2("Congo, Rep.") == "CG"

    def test_unknown_returns_none(self) -> None:
        assert tg.country_to_iso2("Atlantis") is None

    def test_empty_or_none(self) -> None:
        assert tg.country_to_iso2(None) is None
        assert tg.country_to_iso2("") is None

    def test_whitespace_tolerant(self) -> None:
        assert tg.country_to_iso2("  Spain  ") == "ES"


class TestParseLengthKm:
    def test_with_comma(self) -> None:
        assert tg._parse_length_km("6,605 km") == 6605.0

    def test_no_comma(self) -> None:
        assert tg._parse_length_km("450 km") == 450.0

    def test_no_unit(self) -> None:
        assert tg._parse_length_km("123") == 123.0

    def test_garbage(self) -> None:
        assert tg._parse_length_km("unknown") is None
        assert tg._parse_length_km(None) is None
        assert tg._parse_length_km("") is None


class TestMergeCableGeometries:
    def test_single_feature_passthrough(self) -> None:
        features = [
            {
                "properties": {"id": "marea"},
                "geometry": {"type": "MultiLineString", "coordinates": [[[0, 0], [1, 1]]]},
            }
        ]
        result = tg._merge_cable_geometries(features)
        assert "marea" in result
        assert result["marea"]["coordinates"] == [[[0, 0], [1, 1]]]

    def test_multi_feature_merged(self) -> None:
        features = [
            {
                "properties": {"id": "apricot"},
                "geometry": {"type": "MultiLineString", "coordinates": [[[0, 0], [1, 1]]]},
            },
            {
                "properties": {"id": "apricot"},
                "geometry": {"type": "MultiLineString", "coordinates": [[[2, 2], [3, 3]]]},
            },
        ]
        result = tg._merge_cable_geometries(features)
        assert len(result) == 1
        assert len(result["apricot"]["coordinates"]) == 2

    def test_skips_non_multilinestring(self) -> None:
        features = [
            {
                "properties": {"id": "weird"},
                "geometry": {"type": "Point", "coordinates": [0, 0]},
            }
        ]
        assert tg._merge_cable_geometries(features) == {}


# --- end-to-end normalize -------------------------------------------------


class TestNormalize:
    def test_emits_two_geojson_files(self, raw_paths: dict[str, Path], tmp_path: Path) -> None:
        cables, landings = tg.normalize(raw_paths, out_dir=tmp_path / "out")
        assert cables.exists() and landings.exists()

    def test_cable_count_matches_fixture(
        self, raw_paths: dict[str, Path], tmp_path: Path
    ) -> None:
        cables, _ = tg.normalize(raw_paths, out_dir=tmp_path / "out")
        fc = json.loads(cables.read_text())
        assert fc["type"] == "FeatureCollection"
        assert len(fc["features"]) == 2  # marea + apricot

    def test_apricot_geometry_is_merged(
        self, raw_paths: dict[str, Path], tmp_path: Path
    ) -> None:
        cables, _ = tg.normalize(raw_paths, out_dir=tmp_path / "out")
        fc = json.loads(cables.read_text())
        apricot = next(f for f in fc["features"] if f["properties"]["id"] == "tg-apricot")
        assert apricot["geometry"]["type"] == "MultiLineString"
        # Two source features in fixture -> two line strings merged.
        assert len(apricot["geometry"]["coordinates"]) == 2

    def test_id_namespaced(self, raw_paths: dict[str, Path], tmp_path: Path) -> None:
        cables, _ = tg.normalize(raw_paths, out_dir=tmp_path / "out")
        fc = json.loads(cables.read_text())
        for f in fc["features"]:
            assert f["properties"]["id"].startswith("tg-")

    def test_marea_landings_resolved(
        self, raw_paths: dict[str, Path], tmp_path: Path
    ) -> None:
        cables, _ = tg.normalize(raw_paths, out_dir=tmp_path / "out")
        fc = json.loads(cables.read_text())
        marea = next(f for f in fc["features"] if f["properties"]["id"] == "tg-marea")
        landings = marea["properties"]["landing_points"]
        assert len(landings) == 2
        countries = {lp["country"] for lp in landings}
        assert countries == {"ES", "US"}

    def test_length_and_rfs_year_parsed(
        self, raw_paths: dict[str, Path], tmp_path: Path
    ) -> None:
        cables, _ = tg.normalize(raw_paths, out_dir=tmp_path / "out")
        fc = json.loads(cables.read_text())
        marea = next(f for f in fc["features"] if f["properties"]["id"] == "tg-marea")
        assert marea["properties"]["length_km"] == 6605.0
        assert marea["properties"]["rfs_year"] == 2018

    def test_landings_geojson_namespaced(
        self, raw_paths: dict[str, Path], tmp_path: Path
    ) -> None:
        _, landings = tg.normalize(raw_paths, out_dir=tmp_path / "out")
        fc = json.loads(landings.read_text())
        assert len(fc["features"]) == 4
        for f in fc["features"]:
            assert f["properties"]["id"].startswith("tg-lp-")

    def test_unmapped_country_dropped(self, tmp_path: Path) -> None:
        """A landing point with an unknown country is silently dropped, not crash."""
        details = {
            "x": {
                "id": "x",
                "name": "Test Cable",
                "length": "100 km",
                "rfs_year": 2020,
                "landing_points": [
                    {"id": "a-spain", "name": "A, Spain", "country": "Spain", "is_tbd": None},
                    {"id": "b-atlantis", "name": "B, Atlantis", "country": "Atlantis", "is_tbd": None},
                ],
            }
        }
        cable_geo = {
            "type": "FeatureCollection",
            "features": [
                {
                    "properties": {"id": "x"},
                    "geometry": {"type": "MultiLineString", "coordinates": [[[0, 0], [1, 1]]]},
                }
            ],
        }
        landing_geo = {
            "type": "FeatureCollection",
            "features": [
                {
                    "properties": {"id": "a-spain"},
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                },
                {
                    "properties": {"id": "b-atlantis"},
                    "geometry": {"type": "Point", "coordinates": [1, 1]},
                },
            ],
        }
        paths = {
            "cable_geo": tmp_path / "cg.json",
            "landing_geo": tmp_path / "lg.json",
            "details": tmp_path / "d.json",
        }
        paths["cable_geo"].write_text(json.dumps(cable_geo))
        paths["landing_geo"].write_text(json.dumps(landing_geo))
        paths["details"].write_text(json.dumps(details))

        cables, _ = tg.normalize(paths, out_dir=tmp_path / "out")
        fc = json.loads(cables.read_text())
        assert len(fc["features"]) == 1
        landings = fc["features"][0]["properties"]["landing_points"]
        assert len(landings) == 1  # Atlantis dropped, Spain kept
        assert landings[0]["country"] == "ES"
