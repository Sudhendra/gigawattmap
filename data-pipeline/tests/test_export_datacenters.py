"""Tests for the public datacenters export (geojson + csv).

The export turns ``out/interim/datacenters-merged.geojson`` into the two
top-level public files we publish to R2 via the /downloads page:

  out/datacenters.geojson   — copy with ``__geo_interface__``-style properties
  out/datacenters.csv       — flattened, one row per feature, lon/lat columns

The CSV is the contract that lets analysts use the data without a GIS
toolchain. Column order, null handling, and list-flattening are all
part of the public surface, so they get test coverage here.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from opendc.transform.export_datacenters import (
    ExportResult,
    export_datacenters,
)


def _merged_fc(features: list[dict]) -> dict:
    return {"type": "FeatureCollection", "features": features}


def _feature(
    *,
    id: str = "ashburn-aws-1",
    name: str = "AWS US-EAST-1 Ashburn",
    geometry: dict | None = None,
    **props: object,
) -> dict:
    return {
        "type": "Feature",
        "geometry": geometry or {"type": "Point", "coordinates": [-77.49, 39.04]},
        "properties": {
            "id": id,
            "name": name,
            "operator_id": "aws",
            "tier": "hyperscale",
            "status": "operational",
            "country": "US",
            "region": "VA",
            "est_mw_low": 100.0,
            "est_mw_mid": 150.0,
            "est_mw_high": 200.0,
            "mw_source": "estimate",
            "sources": ["aws-region-page", "osm:way/123"],
            "confidence": "verified",
            **props,
        },
    }


@pytest.fixture
def merged_path(tmp_path: Path) -> Path:
    p = tmp_path / "interim" / "datacenters-merged.geojson"
    p.parent.mkdir(parents=True)
    return p


@pytest.fixture
def out_dir(tmp_path: Path) -> Path:
    return tmp_path


class TestExportDatacenters:
    def test_writes_geojson_and_csv(self, merged_path: Path, out_dir: Path) -> None:
        merged_path.write_text(json.dumps(_merged_fc([_feature()])))
        result = export_datacenters(merged_path, out_dir)
        assert isinstance(result, ExportResult)
        assert (out_dir / "datacenters.geojson").exists()
        assert (out_dir / "datacenters.csv").exists()
        assert result.feature_count == 1

    def test_geojson_is_valid_feature_collection(
        self, merged_path: Path, out_dir: Path
    ) -> None:
        merged_path.write_text(json.dumps(_merged_fc([_feature(), _feature(id="b")])))
        export_datacenters(merged_path, out_dir)
        data = json.loads((out_dir / "datacenters.geojson").read_text())
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 2

    def test_csv_has_lon_lat_columns(self, merged_path: Path, out_dir: Path) -> None:
        merged_path.write_text(json.dumps(_merged_fc([_feature()])))
        export_datacenters(merged_path, out_dir)
        rows = list(csv.DictReader((out_dir / "datacenters.csv").open()))
        assert len(rows) == 1
        assert float(rows[0]["lon"]) == pytest.approx(-77.49)
        assert float(rows[0]["lat"]) == pytest.approx(39.04)
        assert rows[0]["id"] == "ashburn-aws-1"

    def test_csv_flattens_sources_list_pipe_delimited(
        self, merged_path: Path, out_dir: Path
    ) -> None:
        merged_path.write_text(json.dumps(_merged_fc([_feature()])))
        export_datacenters(merged_path, out_dir)
        rows = list(csv.DictReader((out_dir / "datacenters.csv").open()))
        # Pipe is unambiguous and shell-safe; commas would collide with CSV.
        assert rows[0]["sources"] == "aws-region-page|osm:way/123"

    def test_csv_handles_polygon_geometry_via_centroid(
        self, merged_path: Path, out_dir: Path
    ) -> None:
        polygon = {
            "type": "Polygon",
            "coordinates": [[[-77.5, 39.0], [-77.4, 39.0], [-77.4, 39.1], [-77.5, 39.1], [-77.5, 39.0]]],
        }
        merged_path.write_text(json.dumps(_merged_fc([_feature(geometry=polygon)])))
        export_datacenters(merged_path, out_dir)
        rows = list(csv.DictReader((out_dir / "datacenters.csv").open()))
        assert float(rows[0]["lon"]) == pytest.approx(-77.45, abs=0.001)
        assert float(rows[0]["lat"]) == pytest.approx(39.05, abs=0.001)

    def test_csv_renders_null_as_empty_string(
        self, merged_path: Path, out_dir: Path
    ) -> None:
        merged_path.write_text(
            json.dumps(_merged_fc([_feature(est_mw_mid=None, region=None)]))
        )
        export_datacenters(merged_path, out_dir)
        rows = list(csv.DictReader((out_dir / "datacenters.csv").open()))
        assert rows[0]["est_mw_mid"] == ""
        assert rows[0]["region"] == ""

    def test_missing_input_raises(self, tmp_path: Path, out_dir: Path) -> None:
        with pytest.raises(FileNotFoundError):
            export_datacenters(tmp_path / "nope.geojson", out_dir)
