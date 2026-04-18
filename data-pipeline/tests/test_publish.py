"""Tests for the opendc publish orchestrator.

The orchestrator wires merge → export → upload → manifest into one CLI
verb (``opendc publish``). Tests inject a fake S3 client and a tmp output
dir so they exercise the real wiring without touching R2.

Verifies:
  - PUBLICATION_CATALOG covers every public artifact (per SPEC §3)
  - sha256 + size are computed accurately
  - Each file is uploaded under the configured prefix with the right MIME
  - Each upload writes a corresponding ArtifactEntry to manifest.json
  - --dry-run skips the network call but still prints intent
  - --skip-merge bypasses merge+export and uploads existing artifacts
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pytest

from opendc import publish
from opendc.publish import PUBLICATION_CATALOG, PublishSpec, publish_all


@pytest.fixture
def fake_env() -> dict[str, str]:
    return {
        "R2_ACCOUNT_ID": "abc123",
        "R2_ACCESS_KEY_ID": "AKIATEST",
        "R2_SECRET_ACCESS_KEY": "secret",
        "R2_BUCKET": "gigawattmap-test",
        "R2_PUBLIC_BASE": "https://pub-xyz.r2.dev",
    }


class _FakeS3Client:
    """Boto3 stand-in. Identical contract to the one in test_tiles_upload."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def upload_file(
        self,
        *,
        Filename: str,  # noqa: N803
        Bucket: str,  # noqa: N803
        Key: str,  # noqa: N803
        ExtraArgs: dict[str, str],  # noqa: N803
    ) -> None:
        self.calls.append(
            {"Filename": Filename, "Bucket": Bucket, "Key": Key, "ExtraArgs": ExtraArgs}
        )


def _seed_artifact(out_dir: Path, relpath: str, body: bytes = b"hello") -> Path:
    """Drop a file at ``out_dir/relpath``, returning its Path."""
    p = out_dir / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(body)
    return p


class TestComputeArtifactMetadata:
    def test_sha256_and_size_match_file_bytes(self, tmp_path: Path) -> None:
        body = b"the quick brown fox"
        f = tmp_path / "x.bin"
        f.write_bytes(body)
        meta = publish.compute_artifact_metadata(f)
        assert meta.size_bytes == len(body)
        assert meta.sha256 == hashlib.sha256(body).hexdigest()


class TestPublicationCatalog:
    def test_catalog_includes_required_artifacts(self) -> None:
        names = {spec.filename for spec in PUBLICATION_CATALOG}
        # Per SPEC §3 + locked decision in plan: ship all five families.
        assert {
            "datacenters.geojson",
            "datacenters.csv",
            "powerplants.geojson",
            "cables.geojson",
            "landing-points.geojson",
            "cloud-regions.geojson",
            "opposition.geojson",
            "announcements.json",
        }.issubset(names)

    def test_announcements_marked_editorial_cc_by(self) -> None:
        # Editorial dataset is curated by us; relicensed CC BY 4.0.
        ann = next(s for s in PUBLICATION_CATALOG if s.filename == "announcements.json")
        assert ann.license == "CC-BY-4.0"
        assert ann.share_alike is False
        assert ann.commercial_use is True
        assert ann.content_type == "application/json"

    def test_powerplants_marked_cc_by(self) -> None:
        # GEM is CC BY 4.0 — commercial use OK, no share-alike.
        pp = next(s for s in PUBLICATION_CATALOG if s.filename == "powerplants.geojson")
        assert pp.license == "CC-BY-4.0"
        assert pp.share_alike is False
        assert pp.commercial_use is True
        assert "Global Energy Monitor" in pp.attribution

    def test_telegeography_artifacts_marked_noncommercial(self) -> None:
        cables = next(s for s in PUBLICATION_CATALOG if s.filename == "cables.geojson")
        assert cables.license == "CC-BY-NC-SA-3.0"
        assert cables.commercial_use is False
        assert cables.share_alike is True

    def test_osm_derived_artifacts_marked_share_alike(self) -> None:
        dc = next(s for s in PUBLICATION_CATALOG if s.filename == "datacenters.geojson")
        # OSM is ODbL — share-alike, but commercial use is allowed.
        assert dc.share_alike is True
        assert dc.commercial_use is True


class TestPublishAllDryRun:
    def test_dry_run_skips_uploads_but_lists_intent(
        self, tmp_path: Path, fake_env: dict[str, str]
    ) -> None:
        # Seed every file the catalog expects so we exercise the metadata path.
        for spec in PUBLICATION_CATALOG:
            _seed_artifact(tmp_path, spec.source_relpath, b"x" * 32)

        client = _FakeS3Client()
        manifest_path = tmp_path / "manifest.json"

        messages = publish_all(
            out_dir=tmp_path,
            manifest_path=manifest_path,
            env=fake_env,
            client=client,
            dry_run=True,
            skip_merge=True,
        )

        assert all(m.startswith("DRY-RUN") for m in messages)
        assert client.calls == []  # no network
        assert not manifest_path.exists()  # no manifest writes in dry run


class TestPublishAllRealRun:
    def test_uploads_each_artifact_and_writes_manifest(
        self, tmp_path: Path, fake_env: dict[str, str]
    ) -> None:
        body = b'{"type":"FeatureCollection","features":[]}'
        for spec in PUBLICATION_CATALOG:
            _seed_artifact(tmp_path, spec.source_relpath, body)

        client = _FakeS3Client()
        manifest_path = tmp_path / "manifest.json"

        messages = publish_all(
            out_dir=tmp_path,
            manifest_path=manifest_path,
            env=fake_env,
            client=client,
            skip_merge=True,
        )

        # One upload per catalog entry.
        assert len(client.calls) == len(PUBLICATION_CATALOG)
        keys = {call["Key"] for call in client.calls}
        assert "v1/downloads/datacenters.geojson" in keys

        # Manifest captured every artifact with sha256 + size.
        manifest = json.loads(manifest_path.read_text())
        assert "artifacts" in manifest
        assert len(manifest["artifacts"]) == len(PUBLICATION_CATALOG)
        dc = manifest["artifacts"]["datacenters.geojson"]
        assert dc["sha256"] == hashlib.sha256(body).hexdigest()
        assert dc["size_bytes"] == len(body)
        assert dc["r2_key"] == "v1/downloads/datacenters.geojson"
        assert dc["r2_url"].startswith("https://pub-xyz.r2.dev/")
        assert dc["license"]  # truthy — populated from spec
        assert dc["attribution"]
        assert "uploaded" in messages[0] or "uploaded" in messages[-1]

    def test_skips_missing_artifacts_with_warning(
        self, tmp_path: Path, fake_env: dict[str, str]
    ) -> None:
        # Seed only one file; everything else missing.
        target = next(s for s in PUBLICATION_CATALOG if s.filename == "datacenters.geojson")
        _seed_artifact(tmp_path, target.source_relpath, b"x")

        client = _FakeS3Client()
        manifest_path = tmp_path / "manifest.json"

        messages = publish_all(
            out_dir=tmp_path,
            manifest_path=manifest_path,
            env=fake_env,
            client=client,
            skip_merge=True,
        )

        # Exactly one upload; the rest produce SKIP messages.
        assert len(client.calls) == 1
        skips = [m for m in messages if m.startswith("SKIP")]
        assert len(skips) == len(PUBLICATION_CATALOG) - 1
