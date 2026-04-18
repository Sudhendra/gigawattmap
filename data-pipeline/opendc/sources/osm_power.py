"""OpenStreetMap power infrastructure ingestion via the Overpass API.

We query for every node/way/relation tagged ``power=substation``,
``power=plant``, or ``power=line`` (the last for context only — task 017's
enrichment uses substations). The raw response is cached, then normalized
into a GeoJSON FeatureCollection of point centroids with a small,
typed property bag suitable for spatial indexing.

Why centroids? The substation enrichment in
:mod:`opendc.transform.enrich_substations` only needs (lon, lat) plus
a voltage tag to compute "nearest substation within 10km." Storing the
full polygon would balloon the file size for no analytical gain at v1.

bbox handling mirrors :mod:`opendc.sources.osm` — a global query for
``power=*`` returns gigabytes and times out, so the ``--sample`` flag
(or any explicit bbox) is the practical default.
"""

from __future__ import annotations

import json
import time
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import httpx
from shapely.geometry import (
    LineString,
    MultiPolygon,
    Point,
    Polygon,
    mapping,
)
from shapely.geometry.base import BaseGeometry

from opendc.utils.http import get_http_client, retry_network

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# CONUS bbox used for ``--sample``. Wider than the osm.py DFW sample
# because substations are sparser than datacenters; this gives the
# enrichment something meaningful to join against in tests/dev.
# Tuple is (south, west, north, east) per Overpass convention.
SAMPLE_BBOX_CONUS: tuple[float, float, float, float] = (24.0, -125.0, 49.5, -66.5)

# Subset of OSM power tags we ingest. ``line`` is included per task 017's
# acceptance criteria (for future context layers); only ``substation`` is
# consumed by the enrichment transform today.
_TAG_FILTERS = (
    ("node", "power", "substation"),
    ("way", "power", "substation"),
    ("relation", "power", "substation"),
    ("node", "power", "plant"),
    ("way", "power", "plant"),
    ("relation", "power", "plant"),
    ("way", "power", "line"),
)

# Overpass-side timeout. Generous because power queries even at country
# scale routinely take 60-180s.
_FETCH_TIMEOUT_S = 600.0


def _build_query(bbox: tuple[float, float, float, float] | None) -> str:
    """Render the Overpass QL string, optionally constrained to a bbox."""
    bbox_clause = f"({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]})" if bbox else ""
    selectors = "\n".join(
        f'  {kind}["{key}"="{val}"]{bbox_clause};' for kind, key, val in _TAG_FILTERS
    )
    return f"[out:json][timeout:540];\n(\n{selectors}\n);\nout body geom;"


@retry_network
def _post_overpass(client: httpx.Client, query: str) -> bytes:
    response = client.post(OVERPASS_URL, content=f"data={query}".encode())
    response.raise_for_status()
    return response.content


def fetch(
    bbox: tuple[float, float, float, float] | None = None,
    *,
    out_dir: Path | None = None,
) -> Path:
    """Fetch raw Overpass JSON for power features; write to ``out/raw/osm-power-<ts>.json``."""
    out_dir = out_dir or Path("out/raw")
    out_dir.mkdir(parents=True, exist_ok=True)
    query = _build_query(bbox)
    with get_http_client(timeout=_FETCH_TIMEOUT_S) as client:
        payload = _post_overpass(client, query)
    ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    target = out_dir / f"osm-power-{ts}.json"
    target.write_bytes(payload)
    return target


# --- normalize -------------------------------------------------------------


def _node_geometry(element: dict[str, Any]) -> BaseGeometry | None:
    lat, lon = element.get("lat"), element.get("lon")
    if lat is None or lon is None:
        return None
    return Point(float(lon), float(lat))


def _way_geometry(element: dict[str, Any]) -> BaseGeometry | None:
    geom = element.get("geometry") or []
    if len(geom) < 2:
        return None
    coords = [(float(g["lon"]), float(g["lat"])) for g in geom]
    if coords[0] == coords[-1] and len(coords) >= 4:
        return Polygon(coords)
    return LineString(coords)


def _relation_geometry(element: dict[str, Any]) -> BaseGeometry | None:
    polygons: list[Polygon] = []
    for member in element.get("members", []):
        if member.get("type") != "way" or member.get("role") != "outer":
            continue
        coords = [(float(g["lon"]), float(g["lat"])) for g in member.get("geometry", [])]
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


def parse_max_voltage_kv(raw: str | None) -> int | None:
    """Parse OSM ``voltage`` tag (volts) into a kV integer, picking the maximum.

    OSM commonly stores multiple voltages as a semicolon-delimited string
    (``"115000;230000"``) when a substation has multiple voltage classes.
    Values are in volts; we return kV. Garbage values (non-numeric,
    blank, negative) yield ``None`` so the caller can treat voltage as
    unknown without crashing.

    Examples:
        >>> parse_max_voltage_kv("115000;230000")
        230
        >>> parse_max_voltage_kv("345000")
        345
        >>> parse_max_voltage_kv(None)

        >>> parse_max_voltage_kv("high")

    """
    if not raw:
        return None
    best: int | None = None
    for part in raw.split(";"):
        part = part.strip()
        if not part:
            continue
        try:
            volts = int(float(part))
        except ValueError:
            continue
        if volts <= 0:
            continue
        kv = volts // 1000
        if best is None or kv > best:
            best = kv
    return best


def _iter_elements(raw: dict[str, Any]) -> Iterator[dict[str, Any]]:
    yield from raw.get("elements", [])


def _power_kind(tags: dict[str, str]) -> str | None:
    """Return the canonical power kind we care about, or None to skip."""
    val = tags.get("power")
    if val in {"substation", "plant", "line"}:
        return val
    return None


def _to_centroid(geom: BaseGeometry) -> Point:
    if geom.geom_type == "Point":
        # mypy can't see the runtime check; cast is safe.
        return cast(Point, geom)
    return cast(Point, geom.centroid)


def _normalize_element(element: dict[str, Any]) -> dict[str, Any] | None:
    tags: dict[str, str] = element.get("tags") or {}
    kind = _power_kind(tags)
    if kind is None:
        return None
    geom = _element_geometry(element)
    if geom is None or geom.is_empty:
        return None
    centroid = _to_centroid(geom)
    return {
        "type": "Feature",
        "geometry": cast(dict[str, Any], mapping(centroid)),
        "properties": {
            "id": f"osm-{element['type']}-{element['id']}",
            "kind": kind,
            "voltage_kv": parse_max_voltage_kv(tags.get("voltage")),
            "name": tags.get("name"),
            "operator": tags.get("operator"),
        },
    }


def normalize(raw_path: Path, *, out_path: Path | None = None) -> Path:
    """Map cached Overpass JSON to a GeoJSON FeatureCollection of power centroids."""
    out_path = out_path or Path("out/interim/osm-power.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    raw: dict[str, Any] = json.loads(raw_path.read_text())
    features: list[dict[str, Any]] = []
    for element in _iter_elements(raw):
        feat = _normalize_element(element)
        if feat is not None:
            features.append(feat)
    out_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, indent=2)
    )
    return out_path


# --- one-shot orchestration used by the CLI --------------------------------


def run(*, sample: bool, out_dir: Path = Path("out")) -> tuple[Path, int, float]:
    """Convenience wrapper: fetch + normalize + return ``(path, count, duration_s)``."""
    bbox = SAMPLE_BBOX_CONUS if sample else None
    started = time.monotonic()
    raw_path = fetch(bbox, out_dir=out_dir / "raw")
    geojson_path = normalize(raw_path, out_path=out_dir / "interim" / "osm-power.geojson")
    duration = time.monotonic() - started
    feature_count = len(json.loads(geojson_path.read_text())["features"])
    return geojson_path, feature_count, duration
