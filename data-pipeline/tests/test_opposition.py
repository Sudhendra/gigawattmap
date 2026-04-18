"""Tests for the opposition tracker loader.

We never hit the network in unit tests — the upstream JSON is injected
via ``rows=`` or a ``cache_path=`` pointing at a tmp file.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.sources import opposition


def _good_row(**overrides: object) -> dict[str, object]:
    """Minimal-but-realistic row; tests override what they care about."""
    base: dict[str, object] = {
        "id": "test-fight-1",
        "jurisdiction": "Test County",
        "state": "va",  # lowercase to prove the validator uppercases
        "county": "Test County",
        "lat": 39.0,
        "lng": -77.5,
        "action_type": ["moratorium"],
        "date": "2025-06-01",
        "status": "active",
        "company": "Acme Hyperscale",
        "hyperscaler": None,
        "project_name": "Acme Campus",
        "investment_million_usd": 800.0,
        "megawatts": 250.0,
        "opposition_groups": ["Citizens for Sane Power"],
        "summary": "Local zoning board denied special-use permit.",
        "sources": ["https://example.com/article-1"],
        "data_source": "manual",
        "last_updated": "2026-04-14",
        "issue_category": ["zoning"],
        "community_outcome": "win",
        # Upstream noise we should ignore:
        "acreage": 120,
        "petition_url": None,
        "scope": "local",
    }
    base.update(overrides)
    return base


def test_iter_rows_validates_and_strips_extras() -> None:
    rows = list(opposition.iter_rows([_good_row()]))
    assert len(rows) == 1
    fight = rows[0]
    assert fight.id == "test-fight-1"
    # state validator uppercases.
    assert fight.state == "VA"
    # Geometry is a Point built from lat/lng.
    assert fight.geometry["type"] == "Point"
    assert fight.geometry["coordinates"] == [-77.5, 39.0]
    # Drop list excludes upstream noise from the typed model.
    dumped = fight.model_dump()
    for k in ("acreage", "petition_url", "scope", "lat", "lng"):
        assert k not in dumped
    # Upstream data with lat/lng gets the "upstream" provenance tag.
    assert fight.geocode_confidence == "upstream"


def test_unknown_status_falls_back_to_unknown() -> None:
    """Community-edited upstream values shouldn't poison the run."""
    rows = list(opposition.iter_rows([_good_row(status="vibes-based-rejection")]))
    assert rows[0].status == "unknown"


def test_missing_lat_lng_without_geocode_raises() -> None:
    bad = _good_row(lat=None, lng=None)
    with pytest.raises(opposition.OppositionError, match="missing lat/lng"):
        list(opposition.iter_rows([bad]))


def test_invalid_source_url_rejected() -> None:
    bad = _good_row(sources=["not-a-url"])
    with pytest.raises(opposition.OppositionError, match="http"):
        list(opposition.iter_rows([bad]))


def test_null_array_fields_collapse_to_empty_list() -> None:
    """Upstream sometimes ships ``null`` for list-shaped fields."""
    rows = list(
        opposition.iter_rows(
            [_good_row(opposition_groups=None, issue_category=None, sources=None)]
        )
    )
    fight = rows[0]
    assert fight.opposition_groups == []
    assert fight.issue_category == []
    assert fight.sources == []


def test_normalize_writes_feature_collection(tmp_path: Path) -> None:
    cache = tmp_path / "opposition.json"
    cache.write_text(json.dumps([_good_row(), _good_row(id="test-fight-2")]))
    out = tmp_path / "opposition.geojson"
    written = opposition.normalize(out, cache_path=cache)
    assert written == out
    payload = json.loads(out.read_text())
    assert payload["type"] == "FeatureCollection"
    feats = payload["features"]
    assert len(feats) == 2
    sample = feats[0]
    assert sample["type"] == "Feature"
    assert sample["id"] == "test-fight-1"
    assert sample["geometry"]["type"] == "Point"
    props = sample["properties"]
    # ``geometry`` lives at the Feature level, not inside properties.
    assert "geometry" not in props
    assert props["state"] == "VA"
    assert props["data_source"] == "manual"


def test_normalize_skips_individual_bad_rows(tmp_path: Path) -> None:
    """One typo shouldn't take out the whole layer."""
    cache = tmp_path / "opposition.json"
    cache.write_text(
        json.dumps(
            [
                _good_row(),
                _good_row(id="bad", sources=["javascript:alert(1)"]),
                _good_row(id="test-fight-3"),
            ]
        )
    )
    out = tmp_path / "opposition.geojson"
    opposition.normalize(out, cache_path=cache)
    payload = json.loads(out.read_text())
    ids = {f["id"] for f in payload["features"]}
    assert ids == {"test-fight-1", "test-fight-3"}


def test_run_returns_count_and_duration(tmp_path: Path) -> None:
    cache_dir = tmp_path / "raw"
    cache_dir.mkdir()
    # Pre-populate today's cache so ``fetch`` skips the network call.
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    (cache_dir / f"opposition-{today}.json").write_text(
        json.dumps([_good_row(), _good_row(id="test-fight-2")])
    )
    out_path, count, duration = opposition.run(out_dir=tmp_path)
    assert out_path.exists()
    assert count == 2
    assert duration >= 0.0
