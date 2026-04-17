"""Upload PMTiles to Cloudflare R2 (S3-compatible).

R2 endpoint format::

    https://<account_id>.r2.cloudflarestorage.com

Required env vars (typically loaded from ``data-pipeline/.env.local``):

* ``R2_ACCOUNT_ID``
* ``R2_ACCESS_KEY_ID``
* ``R2_SECRET_ACCESS_KEY``
* ``R2_BUCKET`` — defaults to ``gigawattmap``
* ``R2_PUBLIC_BASE`` — public URL base, e.g. ``https://pub-<hash>.r2.dev``

Uploads land under ``v1/`` so a future schema-breaking refresh can ship
as ``v2/`` without downtime.

Public URLs returned by :func:`upload_all` are what the web app's
``NEXT_PUBLIC_PMTILES_BASE`` should be pointed at (the directory, not the
file).
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"
DEFAULT_PREFIX = "v1"
DEFAULT_BUCKET = "gigawattmap"


class R2ConfigError(RuntimeError):
    """Raised when required R2 env vars are missing."""


@dataclass(frozen=True, slots=True)
class R2Config:
    """All inputs the uploader needs, resolved from env."""

    account_id: str
    access_key_id: str
    secret_access_key: str
    bucket: str
    public_base: str  # e.g. https://pub-<hash>.r2.dev — no trailing slash

    @property
    def endpoint_url(self) -> str:
        return f"https://{self.account_id}.r2.cloudflarestorage.com"


def load_config(env: dict[str, str] | None = None) -> R2Config:
    """Build :class:`R2Config` from env vars (or an injected dict for tests)."""
    env = env if env is not None else dict(os.environ)
    missing = [
        k for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY") if not env.get(k)
    ]
    if missing:
        raise R2ConfigError(
            "missing required env var(s): " + ", ".join(missing)
            + ". See data-pipeline/.env.example for the full set."
        )
    return R2Config(
        account_id=env["R2_ACCOUNT_ID"],
        access_key_id=env["R2_ACCESS_KEY_ID"],
        secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        bucket=env.get("R2_BUCKET", DEFAULT_BUCKET),
        public_base=env.get("R2_PUBLIC_BASE", "").rstrip("/"),
    )


def _make_client(config: R2Config) -> Any:  # boto3.client is untyped
    """Build a boto3 S3 client pointed at R2.

    Imported lazily so that a developer who only needs the build step
    doesn't pay the boto3 import cost (~150 ms cold).
    """
    import boto3  # local import, see docstring

    return boto3.client(
        "s3",
        endpoint_url=config.endpoint_url,
        aws_access_key_id=config.access_key_id,
        aws_secret_access_key=config.secret_access_key,
        region_name="auto",  # required by boto3 even though R2 ignores it
    )


def object_key(local_path: Path, *, prefix: str = DEFAULT_PREFIX) -> str:
    """Compute the R2 key for a local PMTiles file."""
    return f"{prefix}/{local_path.name}"


def public_url(config: R2Config, key: str) -> str:
    """Build the public URL for an uploaded key (or empty string if no base)."""
    if not config.public_base:
        return ""
    return f"{config.public_base}/{key}"


def upload_one(
    local_path: Path,
    config: R2Config,
    *,
    prefix: str = DEFAULT_PREFIX,
    client: Any | None = None,
    dry_run: bool = False,
) -> str:
    """Upload one file; return the (key, url) pair as a single human string."""
    key = object_key(local_path, prefix=prefix)
    url = public_url(config, key)
    if dry_run:
        return f"DRY-RUN would upload {local_path} -> r2://{config.bucket}/{key} ({url})"
    if client is None:
        client = _make_client(config)
    client.upload_file(
        Filename=str(local_path),
        Bucket=config.bucket,
        Key=key,
        ExtraArgs={
            "ContentType": "application/vnd.pmtiles",
            "CacheControl": CACHE_CONTROL,
        },
    )
    return f"uploaded {local_path} -> r2://{config.bucket}/{key} ({url})"


def upload_all(
    paths: list[Path],
    *,
    prefix: str = DEFAULT_PREFIX,
    config: R2Config | None = None,
    dry_run: bool = False,
) -> list[str]:
    """Upload every path; returns one log line per upload."""
    config = config or load_config()
    client = None if dry_run else _make_client(config)
    return [
        upload_one(p, config, prefix=prefix, client=client, dry_run=dry_run)
        for p in paths
    ]

