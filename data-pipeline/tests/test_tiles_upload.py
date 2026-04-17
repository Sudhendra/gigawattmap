"""Tests for opendc.tiles.upload (R2 / S3-compat uploader).

Boto3 is mocked at the seam (`_make_client` returns a fake) so tests run
without credentials and without network. A separate live-upload test is
out of scope for this card.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from opendc.tiles import upload as tile_upload


class _FakeS3Client:
    """Records uploads so tests can assert on them."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def upload_file(
        self,
        *,
        Filename: str,  # noqa: N803 — boto3 API uses PascalCase kwargs
        Bucket: str,  # noqa: N803
        Key: str,  # noqa: N803
        ExtraArgs: dict[str, str],  # noqa: N803
    ) -> None:
        self.calls.append(
            {"Filename": Filename, "Bucket": Bucket, "Key": Key, "ExtraArgs": ExtraArgs}
        )


@pytest.fixture()
def fake_env() -> dict[str, str]:
    return {
        "R2_ACCOUNT_ID": "abc123",
        "R2_ACCESS_KEY_ID": "AKIATEST",
        "R2_SECRET_ACCESS_KEY": "secret",
        "R2_BUCKET": "gigawattmap-test",
        "R2_PUBLIC_BASE": "https://pub-xyz.r2.dev/",  # trailing slash on purpose
    }


@pytest.fixture()
def pmtiles_file(tmp_path: Path) -> Path:
    p = tmp_path / "datacenters.pmtiles"
    p.write_bytes(b"PMTiles\x03fakebody")
    return p


class TestLoadConfig:
    def test_full(self, fake_env: dict[str, str]) -> None:
        cfg = tile_upload.load_config(fake_env)
        assert cfg.bucket == "gigawattmap-test"
        assert cfg.endpoint_url == "https://abc123.r2.cloudflarestorage.com"
        # public_base trailing slash is stripped to keep URL composition simple.
        assert cfg.public_base == "https://pub-xyz.r2.dev"

    def test_defaults_bucket_when_unset(self) -> None:
        env = {
            "R2_ACCOUNT_ID": "id",
            "R2_ACCESS_KEY_ID": "a",
            "R2_SECRET_ACCESS_KEY": "s",
        }
        cfg = tile_upload.load_config(env)
        assert cfg.bucket == "gigawattmap"

    def test_missing_required_raises(self) -> None:
        with pytest.raises(tile_upload.R2ConfigError, match="R2_ACCOUNT_ID"):
            tile_upload.load_config({})


class TestKeyAndUrl:
    def test_object_key(self) -> None:
        assert (
            tile_upload.object_key(Path("/x/y/z/datacenters.pmtiles"))
            == "v1/datacenters.pmtiles"
        )

    def test_object_key_custom_prefix(self) -> None:
        assert (
            tile_upload.object_key(Path("/foo/cables.pmtiles"), prefix="v2")
            == "v2/cables.pmtiles"
        )

    def test_public_url(self, fake_env: dict[str, str]) -> None:
        cfg = tile_upload.load_config(fake_env)
        url = tile_upload.public_url(cfg, "v1/x.pmtiles")
        assert url == "https://pub-xyz.r2.dev/v1/x.pmtiles"

    def test_public_url_empty_when_no_base(self) -> None:
        env = {
            "R2_ACCOUNT_ID": "id",
            "R2_ACCESS_KEY_ID": "a",
            "R2_SECRET_ACCESS_KEY": "s",
        }
        cfg = tile_upload.load_config(env)
        assert tile_upload.public_url(cfg, "v1/x.pmtiles") == ""


class TestUploadOne:
    def test_dry_run_does_not_call_client(
        self, fake_env: dict[str, str], pmtiles_file: Path
    ) -> None:
        cfg = tile_upload.load_config(fake_env)
        msg = tile_upload.upload_one(pmtiles_file, cfg, dry_run=True)
        assert msg.startswith("DRY-RUN")
        assert "v1/datacenters.pmtiles" in msg

    def test_real_run_uses_client(
        self, fake_env: dict[str, str], pmtiles_file: Path
    ) -> None:
        cfg = tile_upload.load_config(fake_env)
        client = _FakeS3Client()
        msg = tile_upload.upload_one(pmtiles_file, cfg, client=client)
        assert msg.startswith("uploaded")
        assert len(client.calls) == 1
        call = client.calls[0]
        assert call["Bucket"] == "gigawattmap-test"
        assert call["Key"] == "v1/datacenters.pmtiles"
        # Cache and content type are essential - PMTiles needs the right MIME
        # so MapLibre's pmtiles:// protocol parses it, and the cache header
        # is what makes R2 delivery cheap.
        assert call["ExtraArgs"]["ContentType"] == "application/vnd.pmtiles"
        assert "stale-while-revalidate" in call["ExtraArgs"]["CacheControl"]


class TestUploadAll:
    def test_dry_run_lists_all(
        self, fake_env: dict[str, str], tmp_path: Path
    ) -> None:
        files = []
        for n in ("datacenters", "powerplants", "cables"):
            p = tmp_path / f"{n}.pmtiles"
            p.write_bytes(b"PMTiles\x03")
            files.append(p)
        cfg = tile_upload.load_config(fake_env)
        msgs = tile_upload.upload_all(files, config=cfg, dry_run=True)
        assert len(msgs) == 3
        for m in msgs:
            assert m.startswith("DRY-RUN")
