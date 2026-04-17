"""TeleGeography submarine cable map (v3 public API).

Three endpoints, joined by cable id:

* ``/api/v3/cable/cable-geo.json`` — line geometries (MultiLineString features).
  Note: a cable can appear as multiple features (different segments); we merge
  them into one MultiLineString per cable.
* ``/api/v3/landing-point/landing-point-geo.json`` — landing point geometries
  (Point features). Joined to landing points by id.
* ``/api/v3/cable/all.json`` — list of ``{id, name}`` only. Per-cable detail
  (``length``, ``rfs_year``, ``owners``, ``landing_points``) requires fetching
  ``/api/v3/cable/<id>.json`` once per cable. ~700 calls; cached aggressively.

Licence: **CC BY-NC-SA 3.0 — non-commercial only**. Manifest entry records
this in ``notes``; ``/about`` page surfaces full attribution. Task 012b
tracks the eventual replacement with open-source equivalents (ITU ITR +
Wikipedia + press releases) so monetization isn't blocked by this dep.

Implementation notes:
- Country names in landing-point names use ``city, [state,] country`` format,
  but country itself can contain commas (e.g. ``"Congo, Dem. Rep."``).
  We resolve country via the per-cable detail's ``landing_points[].country``
  field, which is unambiguous, then map to ISO-3166-1 alpha-2 via the curated
  CSV at ``opendc/data/country-iso2.csv``.
- Cables whose detail JSON 404s, or whose all landing points fail country
  lookup, are skipped with a log line rather than failing the whole run.
"""

from __future__ import annotations

import csv
import json
import logging
import time
from datetime import UTC, datetime
from importlib import resources
from pathlib import Path
from typing import Any, cast

import httpx
from pydantic import ValidationError

from opendc.schemas import Cable, CableLanding
from opendc.utils.http import get_http_client, retry_network


@retry_network
def _get_json(client: httpx.Client, url: str) -> Any:
    """Retry-wrapped JSON GET. 404s are not retried (HTTPStatusError is)."""
    resp = client.get(url)
    resp.raise_for_status()
    return resp.json()

logger = logging.getLogger(__name__)

CABLES_API_BASE = "https://www.submarinecablemap.com/api/v3"
CABLE_GEO_URL = f"{CABLES_API_BASE}/cable/cable-geo.json"
LANDING_GEO_URL = f"{CABLES_API_BASE}/landing-point/landing-point-geo.json"
CABLE_INDEX_URL = f"{CABLES_API_BASE}/cable/all.json"
CABLE_DETAIL_URL_TMPL = f"{CABLES_API_BASE}/cable/{{cable_id}}.json"

# Documented in task 012 and surfaced on /about. Updating this string also
# updates the manifest note, so reviewers can audit license posture from the
# manifest alone.
LICENSE_NOTE = "license=CC BY-NC-SA 3.0; non-commercial only"


class DataSourceError(RuntimeError):
    """Raised when a TeleGeography fetch cannot be recovered from."""


# --- country-name -> ISO-2 ------------------------------------------------


def _load_country_iso2() -> dict[str, str]:
    """Load the curated mapping at import time (small, ~190 rows)."""
    raw = resources.files("opendc.data").joinpath("country-iso2.csv").read_text()
    mapping: dict[str, str] = {}
    reader = csv.DictReader(line for line in raw.splitlines() if not line.startswith("#"))
    for row in reader:
        mapping[row["name"].strip()] = row["iso2"].strip().upper()
    return mapping


_COUNTRY_ISO2 = _load_country_iso2()


def country_to_iso2(name: str | None) -> str | None:
    """Return the 2-letter code for a TeleGeography country string, or None."""
    if not name:
        return None
    return _COUNTRY_ISO2.get(name.strip())


# --- fetch ----------------------------------------------------------------


def _ts() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload))


def fetch(
    *,
    out_dir: Path | None = None,
    sample: bool = False,
    sample_ids: tuple[str, ...] = ("marea", "apricot"),
    client: httpx.Client | None = None,
) -> dict[str, Path]:
    """Fetch the three endpoints + per-cable details, caching to ``out/raw/``.

    Returns a dict with keys ``cable_geo``, ``landing_geo``, ``details``
    (the third being a single JSON file mapping cable id -> detail dict).

    If ``sample=True``, only the cables in ``sample_ids`` are detail-fetched
    and the geo/landing collections are filtered to that set. Useful for
    smoke tests; the production pipeline always passes ``sample=False``.
    """
    out_dir = out_dir or Path("out/raw")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = _ts()
    owns_client = client is None
    client = client or get_http_client()
    try:
        cable_geo = _get_json(client, CABLE_GEO_URL)
        landing_geo = _get_json(client, LANDING_GEO_URL)
        index = _get_json(client, CABLE_INDEX_URL)

        all_ids = [item["id"] for item in index if "id" in item]
        ids_to_fetch = list(sample_ids) if sample else all_ids
        if sample:
            cable_geo = _filter_geo_by_ids(cable_geo, set(ids_to_fetch))
            # Keep only landing points referenced by sampled cables (resolved
            # below). We can't filter landings before details, so postpone.
        details: dict[str, dict[str, Any]] = {}
        for cid in ids_to_fetch:
            try:
                d = _get_json(client, CABLE_DETAIL_URL_TMPL.format(cable_id=cid))
            except httpx.HTTPError as exc:
                logger.warning("cable detail fetch failed for %s: %s", cid, exc)
                continue
            details[cid] = d

        if sample:
            keep_lp_ids = {
                lp["id"]
                for d in details.values()
                for lp in d.get("landing_points", [])
                if "id" in lp
            }
            landing_geo = _filter_geo_by_ids(landing_geo, keep_lp_ids)
    finally:
        if owns_client:
            client.close()

    paths = {
        "cable_geo": out_dir / f"telegeography-cables-geo-{ts}.json",
        "landing_geo": out_dir / f"telegeography-landings-geo-{ts}.json",
        "details": out_dir / f"telegeography-cable-details-{ts}.json",
    }
    _write_json(paths["cable_geo"], cable_geo)
    _write_json(paths["landing_geo"], landing_geo)
    _write_json(paths["details"], details)
    return paths


def _filter_geo_by_ids(fc: dict[str, Any], keep: set[str]) -> dict[str, Any]:
    """Return a FeatureCollection with only features whose properties.id is in ``keep``."""
    return {
        "type": "FeatureCollection",
        "features": [f for f in fc.get("features", []) if f["properties"].get("id") in keep],
    }


# --- normalize ------------------------------------------------------------


def _parse_length_km(s: str | None) -> float | None:
    """Parse strings like ``"6,605 km"`` -> ``6605.0``."""
    if not s:
        return None
    cleaned = s.replace(",", "").replace("km", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _merge_cable_geometries(features: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Group features by ``properties.id`` and merge into one MultiLineString each.

    Single-feature cables are kept as-is; multi-feature cables (e.g. Apricot,
    which TG splits into two segments) get all line strings concatenated into
    one MultiLineString. Non-MultiLineString geometries are skipped with a log.
    """
    grouped: dict[str, list[list[list[float]]]] = {}
    for feat in features:
        cid = feat["properties"].get("id")
        if not cid:
            continue
        geom = feat.get("geometry") or {}
        if geom.get("type") != "MultiLineString":
            logger.warning("skipping non-MultiLineString geometry for cable %s", cid)
            continue
        coords = geom.get("coordinates") or []
        grouped.setdefault(cid, []).extend(coords)
    return {
        cid: {"type": "MultiLineString", "coordinates": lines}
        for cid, lines in grouped.items()
    }


def _build_landing_index(landing_geo: dict[str, Any]) -> dict[str, tuple[float, float]]:
    """Return ``{landing_point_id: (lon, lat)}``."""
    out: dict[str, tuple[float, float]] = {}
    for f in landing_geo.get("features", []):
        lp_id = f["properties"].get("id")
        geom = f.get("geometry") or {}
        if not lp_id or geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates") or []
        if len(coords) >= 2:
            out[lp_id] = (float(coords[0]), float(coords[1]))
    return out


def _detail_to_cable(
    detail: dict[str, Any],
    geometry: dict[str, Any],
    landing_coords: dict[str, tuple[float, float]],
) -> Cable | None:
    """Map a single cable's detail JSON + merged geometry into a Cable."""
    cid = detail.get("id")
    name = detail.get("name")
    if not cid or not name:
        logger.warning("cable detail missing id/name: %s", detail)
        return None

    landings: list[CableLanding] = []
    for lp in detail.get("landing_points", []):
        lp_id = lp.get("id")
        iso2 = country_to_iso2(lp.get("country"))
        coords = landing_coords.get(lp_id) if lp_id else None
        if iso2 is None:
            logger.debug(
                "cable %s: dropping landing %s (country=%r unmapped)",
                cid, lp_id, lp.get("country"),
            )
            continue
        if coords is None:
            logger.debug(
                "cable %s: dropping landing %s (no point geometry)", cid, lp_id
            )
            continue
        landings.append(
            CableLanding(name=lp.get("name", lp_id), country=iso2, coordinates=coords)
        )

    try:
        return Cable(
            id=f"tg-{cid}",
            name=name,
            length_km=_parse_length_km(detail.get("length")),
            capacity_tbps=None,  # TG v3 does not expose capacity publicly
            landing_points=landings,
            geometry=cast(Any, geometry),
            rfs_year=detail.get("rfs_year"),
        )
    except ValidationError as exc:
        logger.warning("cable %s schema reject: %s", cid, exc.errors())
        return None


def normalize(
    raw_paths: dict[str, Path],
    *,
    out_dir: Path | None = None,
) -> tuple[Path, Path]:
    """Join the three raw artifacts into our schema and write two GeoJSONs.

    Returns ``(cables_path, landings_path)``.
    """
    out_dir = out_dir or Path("out/interim")
    out_dir.mkdir(parents=True, exist_ok=True)

    cable_geo = json.loads(raw_paths["cable_geo"].read_text())
    landing_geo = json.loads(raw_paths["landing_geo"].read_text())
    details: dict[str, dict[str, Any]] = json.loads(raw_paths["details"].read_text())

    geometries = _merge_cable_geometries(cable_geo.get("features", []))
    landing_coords = _build_landing_index(landing_geo)

    cable_features: list[dict[str, Any]] = []
    for cid, detail in details.items():
        geom = geometries.get(cid)
        if geom is None:
            logger.warning("cable %s has no geometry; skipping", cid)
            continue
        cable = _detail_to_cable(detail, geom, landing_coords)
        if cable is None:
            continue
        props = cable.model_dump()
        geometry = props.pop("geometry")
        cable_features.append(
            {"type": "Feature", "geometry": geometry, "properties": props}
        )

    landing_features: list[dict[str, Any]] = []
    for f in landing_geo.get("features", []):
        lp_id = f["properties"].get("id")
        if not lp_id:
            continue
        landing_features.append(
            {
                "type": "Feature",
                "geometry": f["geometry"],
                "properties": {
                    "id": f"tg-lp-{lp_id}",
                    "name": f["properties"].get("name", lp_id),
                    "is_tbd": bool(f["properties"].get("is_tbd")),
                },
            }
        )

    cables_path = out_dir / "cables.geojson"
    landings_path = out_dir / "landing-points.geojson"
    cables_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": cable_features}, indent=2)
    )
    landings_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": landing_features}, indent=2)
    )
    return cables_path, landings_path


# --- orchestrator --------------------------------------------------------


def run(
    *,
    out_dir: Path = Path("out"),
    sample: bool = False,
) -> tuple[Path, Path, int, int, float]:
    """CLI entry: fetch + normalize. Returns (cables, landings, cable_count, landing_count, secs)."""
    started = time.monotonic()
    raw = fetch(out_dir=out_dir / "raw", sample=sample)
    cables, landings = normalize(raw, out_dir=out_dir / "interim")
    duration = time.monotonic() - started
    cable_count = len(json.loads(cables.read_text())["features"])
    landing_count = len(json.loads(landings.read_text())["features"])
    return cables, landings, cable_count, landing_count, duration
