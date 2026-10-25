"""Versioned JSON snapshots. Publish current.json last; never overwrite a good release on failure."""

from __future__ import annotations

# S3 keyword names are defined by boto3, not by this module.
# ruff: noqa: N803
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Protocol, cast

from botocore.exceptions import ClientError
from pydantic import BaseModel, ConfigDict

from opendc.schemas import MapChanges
from opendc.tiles.upload import R2Config, _make_client, load_config

Channel = Literal["news", "map"]


class ReleaseError(ValueError):
    """The release failed a publication guard."""


class Body(Protocol):
    def read(self) -> bytes: ...


class ObjectResponse(Protocol):
    def __getitem__(self, key: str) -> Body: ...


class Storage(Protocol):
    def get_object(self, *, Bucket: str, Key: str) -> ObjectResponse: ...
    def put_object(
        self, *, Bucket: str, Key: str, Body: bytes, ContentType: str, CacheControl: str
    ) -> object: ...


class Release(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1] = 1
    channel: Channel
    updated_at: str
    records: list[dict[str, object]]
    sources: list[dict[str, object]]
    changes: MapChanges | None = None


def storage() -> tuple[R2Config, Storage]:
    config = load_config()
    return config, cast(Storage, _make_client(config))


def read_current(channel: Channel, config: R2Config, client: Storage) -> Release | None:
    try:
        response = client.get_object(Bucket=config.bucket, Key=f"v1/live/{channel}.json")
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in {"NoSuchKey", "404"}:
            return None
        raise
    release = Release.model_validate_json(response["Body"].read())
    if release.channel != channel:
        raise ReleaseError("Unexpected release channel")
    return release


def publish(release: Release, *, out_dir: Path, config: R2Config, client: Storage) -> None:
    if not release.records:
        raise ReleaseError("Refusing to publish an empty release")
    body = release.model_dump_json().encode()
    digest = hashlib.sha256(body).hexdigest()
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    key = f"v1/releases/{release.channel}/{stamp}-{digest[:12]}.json"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{release.channel}.json").write_bytes(body)
    manifest = {
        "updated_at": release.updated_at,
        "channel": release.channel,
        "sha256": digest,
        "row_count": len(release.records),
        "sources": release.sources,
        "release_key": key,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    client.put_object(
        Bucket=config.bucket,
        Key=key,
        Body=body,
        ContentType="application/json",
        CacheControl="public, max-age=31536000, immutable",
    )
    # Single object replacement is atomic. Readers receive an entire old or new snapshot.
    client.put_object(
        Bucket=config.bucket,
        Key=f"v1/live/{release.channel}.json",
        Body=body,
        ContentType="application/json",
        CacheControl="public, max-age=300",
    )
