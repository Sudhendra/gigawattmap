"""Orchestrate the public-artifact publish pipeline (merge → export → upload → manifest).

One CLI verb (``opendc publish``) is the entire surface a user sees:

    uv run python -m opendc.cli publish              # merge + export + upload
    uv run python -m opendc.cli publish --dry-run    # show what would happen
    uv run python -m opendc.cli publish --skip-merge # re-upload existing artifacts

Why one command and not three: the merge/export/upload triple is always
done together in production. Splitting them into separate verbs would
just create opportunities to publish a stale CSV alongside a fresh
GeoJSON.

Why a static :data:`PUBLICATION_CATALOG`: every public file we ship has
a license, an attribution string, and a content-type. Hard-coding these
keeps the licensing-bug surface tiny and reviewable. If a source isn't
in the catalog, it isn't published — by construction.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from opendc.manifest import ArtifactEntry, write_artifact
from opendc.tiles import upload as tile_upload

logger = logging.getLogger(__name__)

# Downloads live under this prefix to keep them visually distinct from
# tile artifacts in R2 listings (``v1/`` is shared with PMTiles).
DOWNLOADS_PREFIX = "v1/downloads"


@dataclass(frozen=True, slots=True)
class PublishSpec:
    """One row of the publication catalog: how to publish ``filename``.

    ``source_relpath`` is relative to ``out_dir`` (the pipeline output
    root) so tests can drive the orchestrator with a tmp_path without
    mutating any global state.
    """

    filename: str
    source_relpath: str
    content_type: str
    license: str
    license_url: str
    attribution: str
    share_alike: bool
    commercial_use: bool
    source_group: str


@dataclass(frozen=True, slots=True)
class ArtifactMetadata:
    """Result of hashing one file — sha256 hex + byte size."""

    sha256: str
    size_bytes: int


# OSM is ODbL-1.0 (share-alike, commercial OK with attribution).
_ODBL = (
    "ODbL-1.0",
    "https://opendatacommons.org/licenses/odbl/1-0/",
    "© OpenStreetMap contributors",
    True,   # share_alike
    True,   # commercial_use
)
# TeleGeography submarine cables are CC BY-NC-SA 3.0 (NON-commercial).
# AGENTS.md mandates per-source downloads and a license-revocation plan
# if we ever monetise. The flag here is the source of truth the UI
# reads — if it's wrong, the licensing claim is wrong.
_TELEGEOG = (
    "CC-BY-NC-SA-3.0",
    "https://creativecommons.org/licenses/by-nc-sa/3.0/",
    "© TeleGeography (non-commercial use only)",
    True,
    False,
)
# Cloud-region centroids are hand-curated from each provider's own
# region documentation page; we relicense the curated set under CC BY 4.0.
_CC_BY = (
    "CC-BY-4.0",
    "https://creativecommons.org/licenses/by/4.0/",
    "Gigawatt Map (curated from provider region pages)",
    False,
    True,
)
# Opposition fights upstream is CC BY 4.0.
_OPP = (
    "CC-BY-4.0",
    "https://creativecommons.org/licenses/by/4.0/",
    "© datacenter-opposition-tracker contributors",
    False,
    True,
)


def _spec(
    filename: str,
    source_relpath: str,
    content_type: str,
    licensing: tuple[str, str, str, bool, bool],
    *,
    source_group: str,
) -> PublishSpec:
    return PublishSpec(
        filename=filename,
        source_relpath=source_relpath,
        content_type=content_type,
        license=licensing[0],
        license_url=licensing[1],
        attribution=licensing[2],
        share_alike=licensing[3],
        commercial_use=licensing[4],
        source_group=source_group,
    )


# The single source of truth for what we publish. Adding a row here is
# the only legal way to put a new file on R2.
PUBLICATION_CATALOG: tuple[PublishSpec, ...] = (
    _spec(
        "datacenters.geojson",
        "datacenters.geojson",
        "application/geo+json",
        _ODBL,
        source_group="datacenters",
    ),
    _spec(
        "datacenters.csv",
        "datacenters.csv",
        "text/csv",
        _ODBL,
        source_group="datacenters",
    ),
    _spec(
        "cables.geojson",
        "interim/cables.geojson",
        "application/geo+json",
        _TELEGEOG,
        source_group="cables",
    ),
    _spec(
        "landing-points.geojson",
        "interim/landing-points.geojson",
        "application/geo+json",
        _TELEGEOG,
        source_group="cables",
    ),
    _spec(
        "cloud-regions.geojson",
        "interim/cloud-regions.geojson",
        "application/geo+json",
        _CC_BY,
        source_group="cloud-regions",
    ),
    _spec(
        "opposition.geojson",
        "interim/opposition.geojson",
        "application/geo+json",
        _OPP,
        source_group="opposition",
    ),
)


def compute_artifact_metadata(path: Path) -> ArtifactMetadata:
    """Hash and measure ``path``. Single-pass read; safe for multi-GB files."""
    h = hashlib.sha256()
    size = 0
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(64 * 1024), b""):
            h.update(chunk)
            size += len(chunk)
    return ArtifactMetadata(sha256=h.hexdigest(), size_bytes=size)


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _feature_count(path: Path, spec: PublishSpec) -> int:
    """Best-effort feature count for the manifest.

    GeoJSON FeatureCollections expose ``len(features)``; CSVs return their
    row count (header excluded). Anything else returns 0 — the manifest
    field is informational, not a hard contract.
    """
    if spec.content_type == "application/geo+json":
        try:
            import json

            data = json.loads(path.read_text())
            features = data.get("features", []) if isinstance(data, dict) else []
            return len(features) if isinstance(features, list) else 0
        except (OSError, ValueError):
            return 0
    if spec.content_type == "text/csv":
        try:
            with path.open() as fh:
                # Subtract one for the header row.
                return max(0, sum(1 for _ in fh) - 1)
        except OSError:
            return 0
    return 0


def _run_merge_and_export(out_dir: Path) -> None:
    """Run merge + export. Imported lazily to avoid heavy deps at module load."""
    from opendc.transform.export_datacenters import export_datacenters
    from opendc.transform.merge import run as run_merge

    run_merge(out_dir=out_dir)
    merged = out_dir / "interim" / "datacenters-merged.geojson"
    export_datacenters(merged, out_dir)


def publish_all(
    *,
    out_dir: Path,
    manifest_path: Path,
    env: dict[str, str] | None = None,
    client: Any | None = None,
    dry_run: bool = False,
    skip_merge: bool = False,
) -> list[str]:
    """Publish every artifact in :data:`PUBLICATION_CATALOG` to R2.

    Returns a human-readable log line per spec — ``uploaded …``,
    ``DRY-RUN …``, or ``SKIP …``. The CLI prints them verbatim so a CI
    log preserves the exact decision per file.
    """
    if not skip_merge:
        _run_merge_and_export(out_dir)

    try:
        config = tile_upload.load_config(env)
    except tile_upload.R2ConfigError:
        if not dry_run:
            raise
        # Dry-run can describe intent without real credentials.
        config = tile_upload.R2Config(
            account_id="dry-run",
            access_key_id="dry-run",
            secret_access_key="dry-run",
            bucket=tile_upload.DEFAULT_BUCKET,
            public_base="",
        )
    if not dry_run and client is None:
        client = tile_upload._make_client(config)

    messages: list[str] = []
    for spec in PUBLICATION_CATALOG:
        local = out_dir / spec.source_relpath
        if not local.exists():
            messages.append(f"SKIP {spec.filename} (missing: {local})")
            logger.warning("skip %s — file missing at %s", spec.filename, local)
            continue

        msg = tile_upload.upload_one(
            local,
            config,
            prefix=DOWNLOADS_PREFIX,
            client=client,
            dry_run=dry_run,
            content_type=spec.content_type,
        )
        messages.append(msg)

        if dry_run:
            continue

        meta = compute_artifact_metadata(local)
        key = tile_upload.object_key(local, prefix=DOWNLOADS_PREFIX)
        entry = ArtifactEntry(
            filename=spec.filename,
            size_bytes=meta.size_bytes,
            sha256=meta.sha256,
            content_type=spec.content_type,
            feature_count=_feature_count(local, spec),
            license=spec.license,
            license_url=spec.license_url,
            attribution=spec.attribution,
            share_alike=spec.share_alike,
            commercial_use=spec.commercial_use,
            r2_key=key,
            r2_url=tile_upload.public_url(config, key),
            uploaded_at=_now_iso(),
            source_group=spec.source_group,
        )
        write_artifact(manifest_path, entry)

    return messages
