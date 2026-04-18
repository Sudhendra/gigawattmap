"""Tests for the run-manifest writer (sources + artifacts).

The manifest is consumed by the web app's /about and /downloads pages,
so the on-disk shape is part of the public contract: ``{"sources": {...},
"artifacts": {...}, "updated_at": "..."}``.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from opendc.manifest import (
    ArtifactEntry,
    SourceEntry,
    make_entry,
    write_artifact,
    write_entry,
)


@pytest.fixture
def manifest_path(tmp_path: Path) -> Path:
    return tmp_path / "out" / "manifest.json"


class TestWriteEntry:
    def test_creates_file_with_sources_key(self, manifest_path: Path) -> None:
        entry = make_entry(source="osm", feature_count=42, duration_s=1.23)
        write_entry(manifest_path, entry)
        data = json.loads(manifest_path.read_text())
        assert "sources" in data
        assert data["sources"]["osm"]["feature_count"] == 42
        assert "updated_at" in data

    def test_replaces_existing_source(self, manifest_path: Path) -> None:
        write_entry(manifest_path, make_entry(source="osm", feature_count=1, duration_s=0.1))
        write_entry(manifest_path, make_entry(source="osm", feature_count=99, duration_s=0.2))
        data = json.loads(manifest_path.read_text())
        assert data["sources"]["osm"]["feature_count"] == 99


class TestWriteArtifact:
    def _entry(self) -> ArtifactEntry:
        return ArtifactEntry(
            filename="datacenters.geojson",
            size_bytes=1024,
            sha256="a" * 64,
            content_type="application/geo+json",
            feature_count=10,
            license="ODbL-1.0",
            license_url="https://opendatacommons.org/licenses/odbl/1-0/",
            attribution="© OpenStreetMap contributors",
            share_alike=True,
            commercial_use=True,
            r2_key="v1/downloads/datacenters.geojson",
            r2_url="https://pub-xyz.r2.dev/v1/downloads/datacenters.geojson",
            uploaded_at="2026-04-18T19:00:00Z",
            source_group="datacenters",
        )

    def test_writes_artifact_to_new_manifest(self, manifest_path: Path) -> None:
        write_artifact(manifest_path, self._entry())
        data = json.loads(manifest_path.read_text())
        assert "artifacts" in data
        assert data["artifacts"]["datacenters.geojson"]["size_bytes"] == 1024
        assert data["artifacts"]["datacenters.geojson"]["sha256"] == "a" * 64

    def test_artifacts_coexist_with_sources(self, manifest_path: Path) -> None:
        write_entry(manifest_path, make_entry(source="osm", feature_count=5, duration_s=0.1))
        write_artifact(manifest_path, self._entry())
        data = json.loads(manifest_path.read_text())
        assert data["sources"]["osm"]["feature_count"] == 5
        assert data["artifacts"]["datacenters.geojson"]["feature_count"] == 10

    def test_replaces_existing_artifact(self, manifest_path: Path) -> None:
        write_artifact(manifest_path, self._entry())
        replaced = self._entry().model_copy(update={"size_bytes": 9999})
        write_artifact(manifest_path, replaced)
        data = json.loads(manifest_path.read_text())
        assert data["artifacts"]["datacenters.geojson"]["size_bytes"] == 9999
