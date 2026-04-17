"""OpenStreetMap datacenter ingestion via the Overpass API.

We query for every node/way/relation tagged ``telecom=data_center`` or
``building=data_center`` (see ``SPEC.md §9``), cache the raw response, and
normalize each feature into our :class:`opendc.schemas.Datacenter` schema.

Why cache the raw payload? Overpass is rate-limited and a global query
can take 5+ minutes. ``normalize`` is a pure function of the raw file, so
we can iterate on schema/heuristic changes without re-fetching.

Geometry handling:
- ``node`` → Point at (lon, lat)
- ``way`` → LineString of its nodes; if first==last, treated as a Polygon
- ``relation`` → MultiPolygon assembled from member ways with role=outer
  (we ignore inner rings for v1; OSM datacenter relations rarely have holes)

Centroid: every Datacenter row also stores the centroid as the canonical
``geometry`` because the UI's intelligence-card uses point geometry for
labelling and the original polygon is preserved upstream in the raw file.
"""

from __future__ import annotations

import json
import time
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import httpx
from pydantic import ValidationError
from shapely.geometry import (
    LineString,
    MultiPolygon,
    Point,
    Polygon,
    mapping,
)
from shapely.geometry.base import BaseGeometry

from opendc.operators import match_operator
from opendc.schemas import Datacenter
from opendc.transform.estimate_mw import estimate_mw_from_geometry
from opendc.utils.http import get_http_client, retry_network

# Public Overpass instance. Switching to a self-hosted mirror is a
# config-only change; we don't expose the URL elsewhere so callers can't
# inadvertently bypass our retry policy.
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# DFW metro bbox used by ``--sample`` — small enough to return in <30s,
# large enough to cover several real datacenters (Equinix DA, Digital
# Realty, Microsoft Quincy-equivalent). Tuple is (south, west, north, east)
# to match Overpass's bbox order.
SAMPLE_BBOX_DFW: tuple[float, float, float, float] = (32.5, -97.3, 33.2, -96.3)

# SPEC.md §9 query, parameterised on an optional bbox filter that we
# inject into each predicate. Overpass requires the bbox immediately
# after the tag selector, which is awkward to template; we build the
# string explicitly to keep the query readable.
_TAG_FILTERS = (
    ('node', 'telecom', 'data_center'),
    ('way', 'telecom', 'data_center'),
    ('relation', 'telecom', 'data_center'),
    ('node', 'building', 'data_center'),
    ('way', 'building', 'data_center'),
    ('relation', 'building', 'data_center'),
)

# Default to 5 minutes (matches the [timeout:300] in the query). Overpass
# enforces this server-side; we set the client timeout slightly higher so
# we surface the server's structured 504 rather than a transport timeout.
_FETCH_TIMEOUT_S = 360.0


def _build_query(bbox: tuple[float, float, float, float] | None) -> str:
    """Render the Overpass QL string, optionally constrained to a bbox."""
    bbox_clause = (
        f"({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]})" if bbox else ""
    )
    selectors = "\n".join(
        f'  {kind}["{key}"="{val}"]{bbox_clause};'
        for kind, key, val in _TAG_FILTERS
    )
    # The 300s timeout is Overpass-side; the http client's timeout is set
    # separately above and is intentionally generous.
    return f"[out:json][timeout:300];\n(\n{selectors}\n);\nout body geom;"


@retry_network
def _post_overpass(client: httpx.Client, query: str) -> bytes:
    """POST the Overpass QL and return raw bytes.

    We retry through ``retry_network`` so transient 504s/connection resets
    don't kill a long ingest run. Persistent 4xx (429 in particular)
    eventually escapes after the retry budget is spent.
    """
    response = client.post(OVERPASS_URL, content=f"data={query}".encode())
    response.raise_for_status()
    return response.content


def fetch(
    bbox: tuple[float, float, float, float] | None = None,
    *,
    out_dir: Path | None = None,
) -> Path:
    """Fetch raw Overpass JSON, write it to ``out/raw/osm-<ts>.json``.

    Returns the path of the cached file so ``normalize`` can pick it up
    independently. ``bbox`` is ``(south, west, north, east)`` per
    Overpass convention.
    """
    out_dir = out_dir or Path("out/raw")
    out_dir.mkdir(parents=True, exist_ok=True)
    query = _build_query(bbox)
    with get_http_client(timeout=_FETCH_TIMEOUT_S) as client:
        payload = _post_overpass(client, query)
    ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    target = out_dir / f"osm-{ts}.json"
    target.write_bytes(payload)
    return target


# --- normalize -------------------------------------------------------------


def _node_geometry(element: dict[str, Any]) -> BaseGeometry | None:
    lat, lon = element.get("lat"), element.get("lon")
    if lat is None or lon is None:
        return None
    return Point(float(lon), float(lat))


def _way_geometry(element: dict[str, Any]) -> BaseGeometry | None:
    """Return Polygon if closed, else LineString. None if degenerate."""
    geom = element.get("geometry") or []
    if len(geom) < 2:
        return None
    coords = [(float(g["lon"]), float(g["lat"])) for g in geom]
    if coords[0] == coords[-1] and len(coords) >= 4:
        return Polygon(coords)
    return LineString(coords)


def _relation_geometry(element: dict[str, Any]) -> BaseGeometry | None:
    """Assemble a MultiPolygon from outer-role member ways.

    Inner rings are ignored: OSM datacenter relations almost never have
    real holes, and reconstructing them correctly requires ring-direction
    fix-ups that we don't need for the v1 cartography.
    """
    polygons: list[Polygon] = []
    for member in element.get("members", []):
        if member.get("type") != "way" or member.get("role") != "outer":
            continue
        coords = [
            (float(g["lon"]), float(g["lat"])) for g in member.get("geometry", [])
        ]
        if len(coords) >= 4 and coords[0] == coords[-1]:
            polygons.append(Polygon(coords))
    if not polygons:
        return None
    if len(polygons) == 1:
        return polygons[0]
    return MultiPolygon(polygons)


def _element_geometry(element: dict[str, Any]) -> BaseGeometry | None:
    match element.get("type"):
        case "node":
            return _node_geometry(element)
        case "way":
            return _way_geometry(element)
        case "relation":
            return _relation_geometry(element)
        case _:
            return None


def _country_from_tags(tags: dict[str, str]) -> str:
    """Best-effort 2-letter country code.

    OSM rarely tags ``addr:country`` on data-centre features. When absent
    we use ``"XX"`` as the schema-valid sentinel; task 014 wires reverse
    geocoding to fix this properly.
    """
    code = (tags.get("addr:country") or "").strip().upper()
    if len(code) == 2:
        return code
    return "XX"


def _stable_id(element: dict[str, Any]) -> str:
    """Slug derived from OSM type + id; survives re-ingest."""
    return f"osm-{element['type']}-{element['id']}"


def _name(tags: dict[str, str], element: dict[str, Any]) -> str:
    return tags.get("name") or tags.get("operator") or f"OSM {element['type']} {element['id']}"


def _iter_elements(raw: dict[str, Any]) -> Iterator[dict[str, Any]]:
    yield from raw.get("elements", [])


def _to_centroid_geometry(geom: BaseGeometry) -> dict[str, Any]:
    """Datacenter.geometry is the centroid Point — the polygon stays in the raw file."""
    if geom.geom_type == "Point":
        return cast(dict[str, Any], mapping(geom))
    return cast(dict[str, Any], mapping(geom.centroid))


def _normalize_element(element: dict[str, Any]) -> Datacenter | None:
    tags: dict[str, str] = element.get("tags") or {}
    geom = _element_geometry(element)
    if geom is None or geom.is_empty:
        return None
    op_match = match_operator(tags.get("operator"))
    mw = estimate_mw_from_geometry(geom)
    try:
        return Datacenter(
            id=_stable_id(element),
            name=_name(tags, element),
            operator_id=op_match.operator_id if op_match else None,
            tier="hyperscale" if op_match and op_match.operator_id in {"amazon", "microsoft", "google", "meta", "oracle"} else "colo",
            status="operational",  # OSM doesn't model lifecycle; assume live
            geometry=_to_centroid_geometry(geom),
            est_mw_low=mw.low,
            est_mw_mid=mw.mid,
            est_mw_high=mw.high,
            mw_source=mw.source,  # type: ignore[arg-type]
            country=_country_from_tags(tags),
            region=tags.get("addr:state") or tags.get("addr:region"),
            sources=["osm"],
            confidence="osm_only",
        )
    except ValidationError:
        # Skip rows that fail validation (malformed geometry, etc) rather
        # than abort the whole run. Counts surface in the manifest.
        return None


def _feature(dc: Datacenter, raw_geometry: BaseGeometry) -> dict[str, Any]:
    """Wrap a Datacenter as a GeoJSON Feature with the *full* geometry.

    We export the original polygon (not the centroid stored on the
    Datacenter row) so deck.gl can render footprints when zoomed in. The
    Datacenter row's centroid lives under ``properties.centroid``.
    """
    props = dc.model_dump()
    centroid = props.pop("geometry")
    props["centroid"] = centroid
    return {
        "type": "Feature",
        "geometry": cast(dict[str, Any], mapping(raw_geometry)),
        "properties": props,
    }


def normalize(raw_path: Path, *, out_path: Path | None = None) -> Path:
    """Map cached Overpass JSON to a schema-validated GeoJSON FeatureCollection."""
    out_path = out_path or Path("out/interim/osm-datacenters.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    raw: dict[str, Any] = json.loads(raw_path.read_text())
    features: list[dict[str, Any]] = []
    for element in _iter_elements(raw):
        geom = _element_geometry(element)
        if geom is None or geom.is_empty:
            continue
        dc = _normalize_element(element)
        if dc is None:
            continue
        features.append(_feature(dc, geom))
    out_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, indent=2)
    )
    return out_path


# --- one-shot orchestration used by the CLI --------------------------------


def run(*, sample: bool, out_dir: Path = Path("out")) -> tuple[Path, int, float]:
    """Convenience wrapper: fetch + normalize + return paths/metrics.

    Returns ``(geojson_path, feature_count, duration_seconds)``. The CLI
    uses the metrics tuple to write the manifest entry.
    """
    bbox = SAMPLE_BBOX_DFW if sample else None
    started = time.monotonic()
    raw_path = fetch(bbox, out_dir=out_dir / "raw")
    geojson_path = normalize(raw_path, out_path=out_dir / "interim" / "osm-datacenters.geojson")
    duration = time.monotonic() - started
    feature_count = len(json.loads(geojson_path.read_text())["features"])
    return geojson_path, feature_count, duration
