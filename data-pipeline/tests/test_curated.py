"""Tests for the curated AI-campus loader."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.sources import curated


def test_iter_rows_yields_validated_models() -> None:
    """Real CSV parses into typed rows; sanity-check the headline campus."""
    rows = list(curated.iter_rows())
    assert len(rows) >= 50, f"need ≥50 curated rows, got {len(rows)}"
    by_id = {r.id: r for r in rows}
    abilene = by_id["crusoe-abilene-tx"]
    assert abilene.operator == "crusoe"
    assert abilene.tenant == "openai"
    assert abilene.est_mw_mid == 1200
    assert abilene.country == "US"
    assert abilene.source_url.startswith("https://")


def test_normalize_writes_valid_geojson(tmp_path: Path) -> None:
    """End-to-end: normalize emits a FeatureCollection with one feature per row."""
    out_path = tmp_path / "curated.geojson"
    written = curated.normalize(out_path)
    assert written == out_path
    payload = json.loads(out_path.read_text())
    assert payload["type"] == "FeatureCollection"
    assert len(payload["features"]) >= 50
    sample = payload["features"][0]
    assert sample["type"] == "Feature"
    assert sample["geometry"]["type"] == "Point"
    props = sample["properties"]
    # Datacenter core fields ride through.
    assert props["confidence"] == "verified"
    assert "curated" in props["sources"]
    # Enrichment fields ride through.
    assert "tenant" in props
    assert "source_url" in props


def test_unknown_operator_rejected(tmp_path: Path) -> None:
    """A row pointing at an operator id not in operators.csv must fail loud."""
    bad = tmp_path / "bad.csv"
    bad.write_text(
        "id,name,operator,tenant,status,lat,lon,country,region,"
        "est_mw_low,est_mw_mid,est_mw_high,gpus,capex_usd_b,"
        "announced_date,rfs_date,ppa_counterparty,source_url,notes\n"
        "rogue-1,Rogue,nonexistent-op,,operational,0,0,US,,,,,,,,,,"
        "https://example.com,\n"
    )
    rows = list(curated.iter_rows(bad))
    known: frozenset[str] = frozenset()  # nothing known → all operators rejected
    with pytest.raises(curated.CuratedCampusError, match="unknown operator"):
        curated._validate_operator(rows[0], known)


def test_missing_source_url_rejected(tmp_path: Path) -> None:
    """source_url is the audit trail; empty/non-http values must fail."""
    bad = tmp_path / "bad.csv"
    bad.write_text(
        "id,name,operator,tenant,status,lat,lon,country,region,"
        "est_mw_low,est_mw_mid,est_mw_high,gpus,capex_usd_b,"
        "announced_date,rfs_date,ppa_counterparty,source_url,notes\n"
        "no-url,Bad Row,google,,operational,0,0,US,,,,,,,,,,not-a-url,\n"
    )
    with pytest.raises(curated.CuratedCampusError, match="source_url"):
        list(curated.iter_rows(bad))


def test_invalid_lat_rejected(tmp_path: Path) -> None:
    """Coordinate ranges enforced by pydantic Field constraints."""
    bad = tmp_path / "bad.csv"
    bad.write_text(
        "id,name,operator,tenant,status,lat,lon,country,region,"
        "est_mw_low,est_mw_mid,est_mw_high,gpus,capex_usd_b,"
        "announced_date,rfs_date,ppa_counterparty,source_url,notes\n"
        "bad-lat,Bad,google,,operational,99,0,US,,,,,,,,,,"
        "https://example.com,\n"
    )
    with pytest.raises(curated.CuratedCampusError):
        list(curated.iter_rows(bad))


def test_run_returns_count_and_duration(tmp_path: Path) -> None:
    """CLI helper returns the (path, count, duration) triple."""
    out_path, count, duration = curated.run(out_dir=tmp_path)
    assert out_path.exists()
    assert count >= 50
    assert duration >= 0.0
