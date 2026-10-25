from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from opendc.map_refresh import check_count, refresh_map
from opendc.releases import ReleaseError


def test_rejects_empty_sample_or_suddenly_incomplete_map() -> None:
    for count, previous in [(0, 4255), (53, 4255), (2000, 4255), (4100, 8000)]:
        with pytest.raises(ReleaseError):
            check_count(count, previous)
    check_count(4255, 4255)


def test_failed_ingest_does_not_publish(tmp_path: Path) -> None:
    client = Mock()
    with (
        patch("opendc.map_refresh.releases.storage", return_value=(Mock(), client)),
        patch("opendc.map_refresh.releases.read_current", return_value=None),
        patch("opendc.map_refresh.osm.run", side_effect=RuntimeError("timeout")),
        pytest.raises(RuntimeError),
    ):
        refresh_map(out_dir=tmp_path)
    client.put_object.assert_not_called()


def test_curated_extra_fields_survive_map_projection(tmp_path: Path) -> None:
    import json

    from opendc.map_refresh import build_records

    props = {
        "id": "campus",
        "name": "Campus",
        "operator_id": None,
        "tier": "colo",
        "status": "announced",
        "est_mw_low": None,
        "est_mw_mid": None,
        "est_mw_high": None,
        "mw_source": None,
        "country": "US",
        "region": None,
        "sources": ["curated"],
        "confidence": "verified",
        "tenant": "example",
        "notes": "Editorial detail",
    }
    path = tmp_path / "merged.json"
    path.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [0, 0]},
                        "properties": props,
                    }
                ],
            }
        )
    )
    records = build_records(path)
    assert records[0]["properties"]["tenant"] == "example"


def test_stale_or_partial_overpass_response_cannot_publish(tmp_path: Path) -> None:
    import json
    from datetime import UTC, datetime

    from opendc.map_refresh import source_timestamp

    raw = tmp_path / "raw"
    raw.mkdir()
    path = raw / "osm-current.json"
    now = datetime(2026, 10, 25, tzinfo=UTC)
    for payload in [
        {"osm3s": {"timestamp_osm_base": "2026-05-31T22:37:44Z"}},
        {
            "osm3s": {"timestamp_osm_base": "2026-10-24T22:00:00Z"},
            "remark": "runtime error: timeout",
        },
    ]:
        path.write_text(json.dumps(payload))
        with pytest.raises(ReleaseError):
            source_timestamp(tmp_path, now=now)
    path.write_text(json.dumps({"osm3s": {"timestamp_osm_base": "2026-10-24T22:00:00Z"}}))
    assert source_timestamp(tmp_path, now=now) == "2026-10-24T22:00:00Z"
