"""Tests for the artifact-publication schema and helpers.

These guard the contract between the Python publish pipeline and the
TypeScript API/UI consumers. Drift here means /data shows wrong license
metadata, which is non-negotiable.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from opendc.schemas import ArtifactEntry, ArtifactManifest


def _good_entry() -> dict:
    return {
        "filename": "datacenters.geojson",
        "size_bytes": 4_823_104,
        "sha256": "a" * 64,
        "content_type": "application/geo+json",
        "feature_count": 12483,
        "license": "ODbL-1.0",
        "license_url": "https://opendatacommons.org/licenses/odbl/1-0/",
        "attribution": "© OpenStreetMap contributors",
        "share_alike": True,
        "commercial_use": True,
        "r2_key": "v1/downloads/datacenters.geojson",
        "r2_url": "https://pub-xyz.r2.dev/v1/downloads/datacenters.geojson",
        "uploaded_at": "2026-04-18T19:00:00Z",
        "source_group": "datacenters",
    }


class TestArtifactEntry:
    def test_round_trip(self) -> None:
        entry = ArtifactEntry.model_validate(_good_entry())
        assert entry.filename == "datacenters.geojson"
        assert entry.share_alike is True
        # round-trip preserves every field
        assert entry.model_dump() == _good_entry()

    def test_rejects_unknown_field(self) -> None:
        bad = _good_entry() | {"surprise": "value"}
        with pytest.raises(ValidationError):
            ArtifactEntry.model_validate(bad)

    def test_rejects_short_sha(self) -> None:
        bad = _good_entry() | {"sha256": "deadbeef"}
        with pytest.raises(ValidationError):
            ArtifactEntry.model_validate(bad)

    def test_rejects_negative_size(self) -> None:
        bad = _good_entry() | {"size_bytes": -1}
        with pytest.raises(ValidationError):
            ArtifactEntry.model_validate(bad)

    def test_rejects_missing_license(self) -> None:
        bad = {k: v for k, v in _good_entry().items() if k != "license"}
        with pytest.raises(ValidationError):
            ArtifactEntry.model_validate(bad)

    def test_telegeography_noncommercial_flag(self) -> None:
        entry = ArtifactEntry.model_validate(
            _good_entry()
            | {
                "filename": "cables.geojson",
                "license": "CC-BY-NC-SA-3.0",
                "commercial_use": False,
                "share_alike": True,
                "attribution": "© TeleGeography",
            }
        )
        assert entry.commercial_use is False
        assert entry.share_alike is True


class TestArtifactManifest:
    def test_collects_entries_by_filename(self) -> None:
        manifest = ArtifactManifest.model_validate(
            {
                "artifacts": {
                    "datacenters.geojson": _good_entry(),
                }
            }
        )
        assert "datacenters.geojson" in manifest.artifacts
        assert manifest.artifacts["datacenters.geojson"].feature_count == 12483

    def test_empty_manifest_is_valid(self) -> None:
        manifest = ArtifactManifest.model_validate({"artifacts": {}})
        assert manifest.artifacts == {}
