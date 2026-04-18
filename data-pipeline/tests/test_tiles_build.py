"""Tests for opendc.tiles.build (tippecanoe-wrapping module).

Real tippecanoe invocations are skipped in CI by default; the binary
must be installed locally for the integration test to run.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from opendc.tiles import build as tile_build

TIPPECANOE_AVAILABLE = shutil.which("tippecanoe") is not None


class TestArgComposition:
    """Pure-function tests; no subprocess required."""

    def test_minimal(self) -> None:
        spec = tile_build.TileSpec(
            name="datacenters",
            input_path=Path("in.geojson"),
            output_path=Path("out.pmtiles"),
            min_zoom=2,
            max_zoom=14,
        )
        args = tile_build.build_tippecanoe_args(spec, binary="tippecanoe")
        assert args[0] == "tippecanoe"
        assert "-o" in args
        assert "out.pmtiles" in args
        assert "--layer=datacenters" in args
        assert "--minimum-zoom=2" in args
        assert "--maximum-zoom=14" in args
        assert "--force" in args
        # Input is the last positional, after all flags.
        assert args[-1] == "in.geojson"

    def test_extra_args_passed_through(self) -> None:
        spec = tile_build.TileSpec(
            name="x",
            input_path=Path("in.geojson"),
            output_path=Path("out.pmtiles"),
            min_zoom=0,
            max_zoom=4,
            extra_args=("--coalesce", "--reorder"),
        )
        args = tile_build.build_tippecanoe_args(spec)
        assert "--coalesce" in args
        assert "--reorder" in args


class TestDefaultSpecs:
    def test_layers(self) -> None:
        names = {s.name for s in tile_build.DEFAULT_SPECS}
        assert names == {
            "datacenters",
            "powerplants",
            "cables",
            "cloud_regions",
            "opposition",
        }

    def test_zoom_budgets_match_card(self) -> None:
        by_name = {s.name: s for s in tile_build.DEFAULT_SPECS}
        assert (by_name["datacenters"].min_zoom, by_name["datacenters"].max_zoom) == (2, 14)
        assert (by_name["powerplants"].min_zoom, by_name["powerplants"].max_zoom) == (3, 12)
        assert (by_name["cables"].min_zoom, by_name["cables"].max_zoom) == (1, 8)
        assert (by_name["cloud_regions"].min_zoom, by_name["cloud_regions"].max_zoom) == (2, 12)
        assert (by_name["opposition"].min_zoom, by_name["opposition"].max_zoom) == (2, 12)


class TestBuildOne:
    def test_missing_input_raises(self, tmp_path: Path) -> None:
        spec = tile_build.TileSpec(
            name="x",
            input_path=tmp_path / "missing.geojson",
            output_path=tmp_path / "x.pmtiles",
            min_zoom=0,
            max_zoom=4,
        )
        with pytest.raises(FileNotFoundError):
            tile_build.build_one(spec)

    def test_missing_tippecanoe_raises_helpful(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Pretend tippecanoe is not on PATH.
        monkeypatch.setattr(tile_build.shutil, "which", lambda _name: None)
        spec = tile_build.TileSpec(
            name="x",
            input_path=tmp_path / "in.geojson",
            output_path=tmp_path / "x.pmtiles",
            min_zoom=0,
            max_zoom=4,
        )
        spec.input_path.write_text('{"type":"FeatureCollection","features":[]}')
        with pytest.raises(tile_build.TippecanoeError, match="not found on PATH"):
            tile_build.build_one(spec)

    def test_subprocess_failure_surfaced(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        spec = tile_build.TileSpec(
            name="x",
            input_path=tmp_path / "in.geojson",
            output_path=tmp_path / "x.pmtiles",
            min_zoom=0,
            max_zoom=4,
        )
        spec.input_path.write_text('{"type":"FeatureCollection","features":[]}')

        monkeypatch.setattr(tile_build.shutil, "which", lambda _n: "/usr/bin/fake")

        class _FakeResult:
            returncode = 2
            stderr = "boom: bad geojson"
            stdout = ""

        monkeypatch.setattr(
            tile_build.subprocess, "run", lambda *_a, **_kw: _FakeResult()
        )
        with pytest.raises(tile_build.TippecanoeError, match="exit 2"):
            tile_build.build_one(spec)


class TestBuildAll:
    def test_skips_missing_inputs_when_requested(self, tmp_path: Path) -> None:
        specs = (
            tile_build.TileSpec(
                name="a",
                input_path=tmp_path / "missing.geojson",
                output_path=tmp_path / "a.pmtiles",
                min_zoom=0,
                max_zoom=4,
            ),
        )
        # No tippecanoe call expected because input is missing.
        result = tile_build.build_all(specs, skip_missing=True)
        assert result == []


# --- integration: only runs locally with tippecanoe + a real geojson -------


@pytest.mark.skipif(not TIPPECANOE_AVAILABLE, reason="tippecanoe binary not installed")
class TestRealTippecanoe:
    def test_round_trip_tiny_geojson(self, tmp_path: Path) -> None:
        # Two-feature collection - small enough to tile in <1s.
        gj = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-77.0, 38.9]},
                    "properties": {"id": "a", "name": "Ashburn-ish"},
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-6.26, 53.35]},
                    "properties": {"id": "b", "name": "Dublin-ish"},
                },
            ],
        }
        in_path = tmp_path / "in.geojson"
        in_path.write_text(json.dumps(gj))
        out_path = tmp_path / "out.pmtiles"
        spec = tile_build.TileSpec(
            name="datacenters",
            input_path=in_path,
            output_path=out_path,
            min_zoom=0,
            max_zoom=4,
        )
        produced = tile_build.build_one(spec)
        assert produced.exists()
        # PMTiles files start with the magic bytes "PMTiles" (v3 spec).
        assert produced.read_bytes()[:7] == b"PMTiles"

    def test_runs_via_subprocess_with_real_binary(self, tmp_path: Path) -> None:
        # Belt-and-braces: use the real subprocess.run path end to end.
        in_path = tmp_path / "in.geojson"
        in_path.write_text(
            '{"type":"FeatureCollection","features":[{"type":"Feature",'
            '"geometry":{"type":"Point","coordinates":[0,0]},"properties":{}}]}'
        )
        out_path = tmp_path / "out.pmtiles"
        proc = subprocess.run(
            ["tippecanoe", "-o", str(out_path), "--force", str(in_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        assert proc.returncode == 0, proc.stderr
        assert out_path.exists()
