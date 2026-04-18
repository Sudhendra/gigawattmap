"""Merge curated AI-campus rows with OSM datacenter footprints.

For each curated point we look for OSM features within ``MATCH_RADIUS_M``
(500m by default — tight enough to avoid joining adjacent campuses,
loose enough to handle our hand-typed coordinate precision and OSM
centroid drift). The merge rules:

* Curated wins on **all properties** (operator, MW, tenant, status,
  enrichment fields, etc.) — the curated CSV is the audit-trailed
  source of truth.
* OSM wins on **geometry** when a polygon match is found — a hand-typed
  point is no substitute for the real footprint.
* Curated rows that don't match any OSM feature pass through as
  standalone Point features tagged ``confidence: "verified"``.
* OSM features that no curated row claims pass through unchanged with
  ``confidence: "osm_only"`` (already set by the OSM normaliser).

The output is a single FeatureCollection: ``out/interim/datacenters-merged.geojson``.

Why STRtree (shapely) and not the ``rtree`` package: shapely 2.0 bundles
it, so we save a transitive dep and an import. STRtree builds in O(n log n)
and we only build it once per run, so the throughput cost is irrelevant
even at 100k OSM features.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from shapely.geometry import Point, shape
from shapely.geometry.base import BaseGeometry
from shapely.strtree import STRtree

# 500m is the merge radius from task 014's acceptance criteria. We
# convert to degrees on the fly because shapely's STRtree works in the
# input CRS (WGS84 here) and we don't want to reproject 100k features
# just to do a proximity test.
MATCH_RADIUS_M = 500.0

# Approx metres per degree latitude. Longitude shrinks with latitude;
# we apply the cosine correction at query time so the buffer stays
# circular-ish near the curated point's latitude.
_M_PER_DEG_LAT = 111_320.0


@dataclass(frozen=True, slots=True)
class MergeResult:
    """Summary of a merge run; the CLI uses these for the manifest."""

    out_path: Path
    curated_count: int
    osm_count: int
    merged_count: int  # curated rows that matched an OSM feature
    standalone_curated_count: int  # curated rows with no OSM match
    osm_only_count: int  # OSM features no curated row claimed


def _read_features(path: Path) -> list[dict[str, Any]]:
    """Parse a FeatureCollection file; return its ``features`` list."""
    if not path.exists():
        return []
    payload = json.loads(path.read_text())
    features = payload.get("features", [])
    if not isinstance(features, list):
        raise ValueError(f"{path}: expected a FeatureCollection")
    return features


def _bounding_box_for(point: Point, radius_m: float) -> tuple[float, float, float, float]:
    """Compute a lat/lon bbox enclosing a circle of ``radius_m`` around ``point``.

    Returns ``(minx, miny, maxx, maxy)`` in degrees. Used to seed the
    STRtree query before we do the precise distance check.
    """
    deg_lat = radius_m / _M_PER_DEG_LAT
    # cos(lat) shrinks the longitude degree near the poles; clamp to a
    # tiny epsilon so we don't divide by zero exactly at the pole.
    cos_lat = max(math.cos(math.radians(point.y)), 1e-6)
    deg_lon = radius_m / (_M_PER_DEG_LAT * cos_lat)
    return (point.x - deg_lon, point.y - deg_lat, point.x + deg_lon, point.y + deg_lat)


def _haversine_m(a: Point, b: Point) -> float:
    """Great-circle distance between two WGS84 Points, in metres.

    We use haversine instead of shapely's planar ``distance`` because
    the latter would interpret degree-units as metres — wrong by
    factor ~111000.
    """
    lat1, lat2 = math.radians(a.y), math.radians(b.y)
    dlat = lat2 - lat1
    dlon = math.radians(b.x - a.x)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6_371_000.0 * math.asin(min(1.0, math.sqrt(h)))


def _representative_point(geometry: BaseGeometry) -> Point:
    """Return a single Point inside (or near) ``geometry``.

    Polygons return their centroid; lines/points pass through. The
    result is what we measure distance against during the proximity test.
    """
    if geometry.geom_type == "Point":
        return geometry  # already a Point
    return geometry.centroid


def _candidate_indices(
    tree: STRtree,
    osm_points: list[Point],
    curated_point: Point,
    radius_m: float,
) -> list[int]:
    """Find OSM feature indices whose representative point is within radius."""
    bbox = _bounding_box_for(curated_point, radius_m)
    raw = tree.query(shape({"type": "Polygon", "coordinates": [[
        [bbox[0], bbox[1]],
        [bbox[2], bbox[1]],
        [bbox[2], bbox[3]],
        [bbox[0], bbox[3]],
        [bbox[0], bbox[1]],
    ]]}))
    indices = [int(i) for i in raw]
    # Refine bbox candidates to the true haversine distance.
    return [i for i in indices if _haversine_m(curated_point, osm_points[i]) <= radius_m]


def _merged_feature(
    curated: dict[str, Any],
    osm: dict[str, Any],
) -> dict[str, Any]:
    """Combine one curated + one OSM feature.

    Curated wins on every property; OSM wins on geometry. We retain the
    OSM ``id`` under ``properties.osm_id`` so audit tooling can trace
    the merge backwards.
    """
    props: dict[str, Any] = dict(curated["properties"])
    osm_props = osm.get("properties", {})
    props["osm_id"] = osm_props.get("id")
    props["confidence"] = "verified"
    # ``sources`` tracks every contributor; deduplicate while preserving
    # order so the canonical ``curated`` stays first.
    seen: set[str] = set()
    sources: list[str] = []
    for tag in (*props.get("sources", []), *osm_props.get("sources", [])):
        if tag not in seen:
            seen.add(tag)
            sources.append(tag)
    props["sources"] = sources
    return {
        "type": "Feature",
        "geometry": osm["geometry"],
        "properties": props,
    }


def merge(
    curated_path: Path,
    osm_path: Path,
    *,
    out_path: Path | None = None,
    radius_m: float = MATCH_RADIUS_M,
) -> MergeResult:
    """Merge curated + OSM into a single FeatureCollection.

    Both inputs are optional on disk: a missing curated file produces
    pass-through OSM-only output, and vice versa. Tests that exercise
    one side at a time rely on this.
    """
    out_path = out_path or Path("out/interim/datacenters-merged.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    curated_features = _read_features(curated_path)
    osm_features = _read_features(osm_path)

    osm_geometries: list[BaseGeometry] = [shape(f["geometry"]) for f in osm_features]
    osm_points: list[Point] = [_representative_point(g) for g in osm_geometries]
    tree = STRtree(osm_points) if osm_points else None

    output: list[dict[str, Any]] = []
    claimed_osm: set[int] = set()
    merged_count = 0
    standalone_curated_count = 0

    for curated in curated_features:
        curated_point = shape(curated["geometry"])
        # Curated rows are always Points (enforced by curated.py); the
        # narrow assertion documents that contract for the type checker.
        if curated_point.geom_type != "Point":
            raise ValueError(
                f"curated feature {curated['properties'].get('id')!r}: "
                "expected Point geometry"
            )
        candidates = (
            _candidate_indices(tree, osm_points, curated_point, radius_m)
            if tree is not None
            else []
        )
        if candidates:
            # If multiple OSM features fall inside the radius, pick the
            # nearest — bigger campuses sometimes have multiple polygons
            # tagged separately and we want the one closest to where the
            # human placed the marker.
            nearest = min(
                candidates,
                key=lambda i: _haversine_m(curated_point, osm_points[i]),
            )
            output.append(_merged_feature(curated, osm_features[nearest]))
            claimed_osm.add(nearest)
            merged_count += 1
        else:
            # No nearby OSM feature — pass curated through as a standalone
            # verified Point. Its ``confidence`` is already "verified".
            output.append(curated)
            standalone_curated_count += 1

    osm_only_count = 0
    for idx, feature in enumerate(osm_features):
        if idx in claimed_osm:
            continue
        output.append(feature)
        osm_only_count += 1

    out_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": output}, indent=2)
    )
    return MergeResult(
        out_path=out_path,
        curated_count=len(curated_features),
        osm_count=len(osm_features),
        merged_count=merged_count,
        standalone_curated_count=standalone_curated_count,
        osm_only_count=osm_only_count,
    )


def run(out_dir: Path = Path("out")) -> MergeResult:
    """CLI helper — wires the conventional input paths."""
    return merge(
        curated_path=out_dir / "interim" / "curated-ai-campuses.geojson",
        osm_path=out_dir / "interim" / "osm-datacenters.geojson",
        out_path=out_dir / "interim" / "datacenters-merged.geojson",
    )
