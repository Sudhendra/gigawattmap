"""Datacenter community-opposition tracker loader (CC BY 4.0).

Pulls `Georgeingebretsen/datacenter-opposition-tracker
<https://github.com/Georgeingebretsen/datacenter-opposition-tracker>`_
— a community-maintained database of moratoria, zoning denials,
ratepayer fights, and grassroots opposition campaigns against US
datacenter projects. The upstream JSON lives at
``site/data/fights.json`` (the README mistakenly says ``data/fights.json``;
trust the file). As of 2026-04-14 the file holds **934 rows**, all with
lat/lng, status, action_type, sources[], and per-row ``data_source``.

Pipeline shape mirrors :mod:`opendc.sources.cloud_regions`: ``iter_rows``
yields validated :class:`opendc.schemas.OppositionFight` instances,
``normalize`` writes ``out/interim/opposition.geojson``, ``run`` returns
the standard ``(path, count, duration)`` triple consumed by the manifest
writer in :mod:`opendc.cli`.

Provenance discipline (per ``AGENTS.md``):

- Raw upstream JSON is cached under ``out/raw/opposition-<YYYY-MM-DD>.json``
  so a re-run can replay the same input.
- Each fight carries the upstream ``data_source`` aggregator key
  (``data_center_watch`` / ``robert_bryce`` / ``fractracker`` /
  ``ssrn_moratorium_nation`` / ``manual``) and the ``sources[]`` array
  of primary URLs the card surfaces directly.
- ``geocode_confidence`` defaults to ``"upstream"``; the Nominatim
  fallback (:mod:`opendc.sources.geocode`) only fires for rows that
  lose lat/lng in a future upstream release.
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Iterable, Iterator
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from opendc.schemas import OppositionFight
from opendc.sources.geocode import geocode as geocode_query
from opendc.utils.http import get_http_client, retry_network

logger = logging.getLogger(__name__)

UPSTREAM_URL = (
    "https://raw.githubusercontent.com/"
    "Georgeingebretsen/datacenter-opposition-tracker/main/site/data/fights.json"
)

SOURCE_TAG = "opposition"
LICENSE_NOTE = (
    "datacenter-opposition-tracker (CC BY 4.0); compiled from "
    "Data Center Watch, Robert Bryce, FracTracker Alliance, and local news"
)

# Upstream sometimes uses fields we deliberately don't carry forward
# (acreage, building_sq_ft, water_usage_gallons_per_day, jobs_promised,
# opposition_website/facebook/instagram/twitter, petition_url,
# petition_signatures, scope, county_lean, authority_level, objective).
# We strip them at the loader rather than widening the schema, because
# adding fields nobody renders just inflates payloads and drags PMTiles
# pack times. Re-introduce them here when a UI needs them.
_UPSTREAM_DROP_KEYS = frozenset(
    {
        "lat",
        "lng",
        "acreage",
        "building_sq_ft",
        "water_usage_gallons_per_day",
        "water_gallons_per_day",
        "jobs_promised",
        "opposition_website",
        "opposition_facebook",
        "opposition_facebook_members",
        "opposition_instagram",
        "opposition_instagram_followers",
        "opposition_twitter",
        "petition_url",
        "petition_signatures",
        "scope",
        "county_lean",
        "authority_level",
        "objective",
        # Bill / legislative tracker fields — useful eventually, but
        # nothing in the v1 card surfaces them.
        "bill_name",
        "bill_url",
        "sponsors",
        # Free-form narrative fields the v1 card subsumes into ``summary``.
        "concerns",
        # Alternate units / mirror fields we already capture as
        # ``megawatts`` / ``investment_million_usd``.
        "energy_mw",
        "investment_usd",
        # External media embeds we don't render in v1.
        "more_perfect_union_video",
    }
)

# Status values we have observed in the upstream file. Any string outside
# this set falls back to ``"unknown"`` rather than failing the row — the
# upstream is community-edited and we'd rather plot a fight than reject
# it over a typo.
_STATUS_PASSTHROUGH = frozenset(
    {
        "active",
        "approved",
        "approved_with_conditions",
        "defeated",
        "delayed",
        "expired",
        "blocked",
        "cancelled",
        "withdrawn",
        "settled",
    }
)
_OUTCOME_PASSTHROUGH = frozenset({"win", "loss", "partial", "ongoing"})


class OppositionError(ValueError):
    """Raised when a row fails validation; carries the row id for context."""


@retry_network
def _fetch_raw(url: str = UPSTREAM_URL) -> bytes:
    """Fetch the upstream JSON, retrying transient network failures."""
    with get_http_client(timeout=60.0) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content


def fetch(out_dir: Path = Path("out")) -> Path:
    """Fetch the raw JSON and cache it under ``out/raw/opposition-<date>.json``.

    Returns the cache path. Idempotent within a day: if today's snapshot
    already exists we reuse it rather than re-hitting the upstream, which
    keeps `opendc ingest opposition` cheap to re-run during development.
    """
    raw_dir = out_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_path = raw_dir / f"opposition-{today}.json"
    if cache_path.exists():
        logger.info("opposition: reusing cached %s", cache_path)
        return cache_path
    logger.info("opposition: fetching %s", UPSTREAM_URL)
    cache_path.write_bytes(_fetch_raw())
    return cache_path


def _coerce_status(raw: Any) -> str:
    if not isinstance(raw, str):
        return "unknown"
    s = raw.strip().lower()
    return s if s in _STATUS_PASSTHROUGH else "unknown"


def _coerce_outcome(raw: Any) -> str:
    if not isinstance(raw, str):
        return "unknown"
    s = raw.strip().lower()
    return s if s in _OUTCOME_PASSTHROUGH else "unknown"


def _coerce_str_list(raw: Any) -> list[str]:
    """Upstream uses null OR list for array fields — collapse both to []."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw if x is not None]
    # Defensive: occasionally a single string slips in.
    if isinstance(raw, str):
        return [raw]
    return []


def _row_to_model(raw: dict[str, Any], *, allow_geocode: bool = False) -> OppositionFight:
    """Coerce one upstream row into the typed model.

    Geocoding is OFF by default to keep ``iter_rows`` fast and offline-
    friendly; the CLI flips it on when ``--allow-geocode`` is passed.
    """
    row_id = raw.get("id") or "<no-id>"
    lat = raw.get("lat")
    lng = raw.get("lng")
    confidence = "upstream"

    if lat is None or lng is None:
        if not allow_geocode:
            raise OppositionError(
                f"row {row_id!r}: missing lat/lng (run with allow_geocode=True to fall back)"
            )
        query_parts = [raw.get("jurisdiction"), raw.get("county"), raw.get("state")]
        query = ", ".join(p for p in query_parts if p)
        result = geocode_query(query, country_code="US")
        if result is None:
            raise OppositionError(f"row {row_id!r}: geocode failed for {query!r}")
        lat, lng, confidence = result.lat, result.lon, result.confidence

    payload: dict[str, Any] = {
        k: v for k, v in raw.items() if k not in _UPSTREAM_DROP_KEYS
    }
    payload["geometry"] = {"type": "Point", "coordinates": [float(lng), float(lat)]}
    payload["status"] = _coerce_status(raw.get("status"))
    payload["community_outcome"] = _coerce_outcome(raw.get("community_outcome"))
    payload["action_type"] = _coerce_str_list(raw.get("action_type"))
    payload["issue_category"] = _coerce_str_list(raw.get("issue_category"))
    payload["opposition_groups"] = _coerce_str_list(raw.get("opposition_groups"))
    payload["sources"] = _coerce_str_list(raw.get("sources"))
    # Provenance tag: a small fraction of upstream rows omit `data_source`.
    # We never want to drop a fight over missing metadata, so fall back
    # to a literal "unknown" rather than the schema-required string.
    if not payload.get("data_source"):
        payload["data_source"] = "unknown"
    payload["geocode_confidence"] = confidence

    try:
        return OppositionFight.model_validate(payload)
    except ValidationError as exc:
        raise OppositionError(f"row {row_id!r}: {exc}") from exc


def iter_rows(
    rows: Iterable[dict[str, Any]] | None = None,
    *,
    cache_path: Path | None = None,
    allow_geocode: bool = False,
) -> Iterator[OppositionFight]:
    """Yield validated rows from an iterable, a cache file, or a fresh fetch.

    ``rows`` wins over ``cache_path`` (test injection); ``cache_path``
    wins over a network call (offline replay). Defaults to fetching.
    """
    if rows is None:
        if cache_path is None:
            cache_path = fetch()
        loaded = json.loads(cache_path.read_text())
        if not isinstance(loaded, list):
            raise OppositionError(
                f"{cache_path}: expected a JSON array, got {type(loaded).__name__}"
            )
        rows = loaded

    for raw in rows:
        if not isinstance(raw, dict):
            raise OppositionError(
                f"every entry must be an object, got {type(raw).__name__}"
            )
        yield _row_to_model(raw, allow_geocode=allow_geocode)


def _to_feature(row: OppositionFight) -> dict[str, Any]:
    """Wrap an :class:`OppositionFight` as a GeoJSON Feature."""
    props = row.model_dump()
    geometry = props.pop("geometry")
    return {
        "type": "Feature",
        "id": row.id,
        "geometry": geometry,
        "properties": props,
    }


def normalize(
    out_path: Path | None = None,
    *,
    cache_path: Path | None = None,
    allow_geocode: bool = False,
) -> Path:
    """Read + validate the cached JSON; emit a GeoJSON FeatureCollection."""
    out_path = out_path or Path("out/interim/opposition.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    features: list[dict[str, Any]] = []
    skipped = 0
    for raw_row in _iter_raw(cache_path=cache_path):
        try:
            features.append(_to_feature(_row_to_model(raw_row, allow_geocode=allow_geocode)))
        except OppositionError as exc:
            # One bad row should never sink the layer. Log and continue;
            # the manifest count tells the caller how many made it.
            skipped += 1
            logger.warning("opposition: skipping row: %s", exc)
    if skipped:
        logger.info("opposition: skipped %d row(s) during normalize", skipped)
    out_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, indent=2)
    )
    return out_path


def _iter_raw(*, cache_path: Path | None) -> Iterator[dict[str, Any]]:
    """Internal helper — yield raw dicts from cache (fetch if missing)."""
    path = cache_path or fetch()
    loaded = json.loads(path.read_text())
    if not isinstance(loaded, list):
        raise OppositionError(
            f"{path}: expected a JSON array, got {type(loaded).__name__}"
        )
    for raw in loaded:
        if not isinstance(raw, dict):
            raise OppositionError(
                f"every entry must be an object, got {type(raw).__name__}"
            )
        yield raw


def run(
    *,
    out_dir: Path = Path("out"),
    allow_geocode: bool = False,
) -> tuple[Path, int, float]:
    """CLI helper returning the standard ``(path, count, duration)`` triple."""
    started = time.monotonic()
    cache_path = fetch(out_dir=out_dir)
    out_path = normalize(
        out_dir / "interim" / "opposition.geojson",
        cache_path=cache_path,
        allow_geocode=allow_geocode,
    )
    duration = time.monotonic() - started
    feature_count = len(json.loads(out_path.read_text())["features"])
    return out_path, feature_count, duration
