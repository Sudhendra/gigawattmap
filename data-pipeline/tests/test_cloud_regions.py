"""Tests for the cloud-regions loader."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.sources import cloud_regions


def test_iter_rows_yields_validated_models() -> None:
    """Real JSON parses; spot-check coverage and a known row."""
    rows = list(cloud_regions.iter_rows())
    assert len(rows) >= 80, f"need ≥80 cloud regions, got {len(rows)}"
    providers = {r.provider for r in rows}
    assert providers == {"aws", "azure", "gcp", "oracle", "alibaba"}
    by_code = {(r.provider, r.code): r for r in rows}
    # AWS us-east-1 is the canonical Northern Virginia region; if this
    # ever disappears the curation file has regressed.
    assert ("aws", "us-east-1") in by_code
    nva = by_code[("aws", "us-east-1")]
    assert nva.country == "US"
    assert nva.geometry["type"] == "Point"
    assert nva.source_url.startswith("https://")


def test_normalize_writes_valid_geojson(tmp_path: Path) -> None:
    """End-to-end: normalize emits one Point feature per row."""
    out_path = tmp_path / "cloud-regions.geojson"
    written = cloud_regions.normalize(out_path)
    assert written == out_path
    payload = json.loads(out_path.read_text())
    assert payload["type"] == "FeatureCollection"
    features = payload["features"]
    assert len(features) >= 80
    sample = features[0]
    assert sample["type"] == "Feature"
    assert sample["geometry"]["type"] == "Point"
    # Feature id is "<provider>:<code>" so the UI can dedupe by stable key.
    assert ":" in sample["id"]
    props = sample["properties"]
    assert props["provider"] in {"aws", "azure", "gcp", "oracle", "alibaba"}
    assert "source_url" in props


def test_missing_lat_lon_rejected(tmp_path: Path) -> None:
    """Curation typo: a row without lat/lon must fail loud."""
    bad = tmp_path / "bad.json"
    bad.write_text(
        json.dumps(
            {
                "regions": [
                    {
                        "provider": "aws",
                        "code": "broken-1",
                        "display_name": "Broken",
                        "country": "US",
                        "launch_year": 2025,
                        "services": None,
                        "source_url": "https://example.com",
                    }
                ]
            }
        )
    )
    with pytest.raises(cloud_regions.CloudRegionError, match="lat/lon"):
        list(cloud_regions.iter_rows(bad))


def test_invalid_source_url_rejected(tmp_path: Path) -> None:
    """source_url is the audit trail; non-http values must fail."""
    bad = tmp_path / "bad.json"
    bad.write_text(
        json.dumps(
            {
                "regions": [
                    {
                        "provider": "aws",
                        "code": "no-url-1",
                        "display_name": "No URL",
                        "lat": 0.0,
                        "lon": 0.0,
                        "country": "US",
                        "launch_year": None,
                        "services": None,
                        "source_url": "not-a-url",
                    }
                ]
            }
        )
    )
    with pytest.raises(cloud_regions.CloudRegionError, match="source_url"):
        list(cloud_regions.iter_rows(bad))


def test_invalid_provider_rejected(tmp_path: Path) -> None:
    """Provider is a Literal — typos must fail at parse time."""
    bad = tmp_path / "bad.json"
    bad.write_text(
        json.dumps(
            {
                "regions": [
                    {
                        "provider": "ibmcloud",  # not in CloudProvider
                        "code": "us-south",
                        "display_name": "Dallas",
                        "lat": 32.7767,
                        "lon": -96.7970,
                        "country": "US",
                        "launch_year": 2014,
                        "services": None,
                        "source_url": "https://example.com",
                    }
                ]
            }
        )
    )
    with pytest.raises(cloud_regions.CloudRegionError):
        list(cloud_regions.iter_rows(bad))


def test_run_returns_count_and_duration(tmp_path: Path) -> None:
    """CLI helper returns the (path, count, duration) triple."""
    out_path, count, duration = cloud_regions.run(out_dir=tmp_path)
    assert out_path.exists()
    assert count >= 80
    assert duration >= 0.0
