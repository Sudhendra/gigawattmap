"""Substation proximity enrichment.

For every datacenter in the input GeoJSON, find the "best" high-voltage
substation within 10 km and attach its id, distance, and voltage class as
new properties. "Best" = highest voltage class first, then closest.

Why this lives in ``transform/`` and not ``sources/``: this is a pure
function of two GeoJSON files. We bake the join into the pipeline output
(rather than computing it at request time) so the front-end gets a flat,
fast-to-render PMTiles attribute table. Per-request spatial joins are a
v2 concern.

Spatial index: we build an :class:`rtree.index.Index` over the substation
centroids. For each datacenter we query a bounding box sized to roughly
+/- 10 km in degrees (using a conservative latitude factor), then refine
the candidate set with a haversine distance check. This is faster than
naive O(N*M) and correct at the poles.
"""

from __future__ import annotations

import json
import math
from collections.abc import Iterable
from pathlib import Path
from typing import Any, cast

from rtree import index

# Earth radius in km (mean). Used by :func:`haversine_km`.
_EARTH_RADIUS_KM = 6371.0088

# Datacenter -> substation match radius. Matches task 017's spec.
SEARCH_RADIUS_KM = 10.0

# Conservative degrees-per-km for bbox prefilter. 1 deg lat ~= 111 km
# everywhere; 1 deg lon shrinks toward the poles. Using 0.1 deg
# (~11.1 km) as the half-width gives a bbox slightly larger than needed
# at the equator and *much* larger near the poles, which is fine — the
# haversine refine step trims to the exact 10 km circle.
_BBOX_HALF_DEG = SEARCH_RADIUS_KM / 100.0  # 0.1 deg


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Great-circle distance in kilometers between two (lon, lat) points."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_KM * c


# A candidate is (substation_id, distance_km, voltage_kv_or_None).
Candidate = tuple[str, float, int | None]


def pick_best_substation(candidates: Iterable[Candidate]) -> Candidate | None:
    """Pick the highest-voltage candidate, breaking ties by closest distance.

    Substations with unknown voltage are treated as the lowest possible
    rank (sentinel ``-1``) so a real high-voltage match always wins over
    an untagged one. Returns ``None`` for an empty iterable.
    """
    best: Candidate | None = None
    best_voltage = -1
    best_distance = math.inf
    for sid, distance, voltage in candidates:
        v_rank = voltage if voltage is not None else -1
        if v_rank > best_voltage or (v_rank == best_voltage and distance < best_distance):
            best = (sid, distance, voltage)
            best_voltage = v_rank
            best_distance = distance
    return best


def _load_features(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text())
    features = raw.get("features", [])
    return cast(list[dict[str, Any]], features)


def _is_substation(feature: dict[str, Any]) -> bool:
    return bool(feature.get("properties", {}).get("kind") == "substation")


def _build_index(substations: list[dict[str, Any]]) -> index.Index:
    """Build an rtree index over substation centroids.

    The id stored in the index is the substation's positional offset in
    the input list, which the caller uses to look up properties after
    a query. rtree requires integer ids.
    """
    idx = index.Index()
    for i, feat in enumerate(substations):
        coords = feat.get("geometry", {}).get("coordinates")
        if not coords or len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        # rtree expects (minx, miny, maxx, maxy); a point is degenerate.
        idx.insert(i, (lon, lat, lon, lat))
    return idx


def enrich_datacenters(
    datacenters_path: Path,
    substations_path: Path,
    *,
    out_path: Path | None = None,
) -> Path:
    """Enrich datacenter features with the nearest substation in 10 km.

    Adds three properties to every output feature:
    - ``nearest_substation_id``: stable OSM id of the best substation, or ``None``
    - ``nearest_substation_distance_km``: rounded to 0.1 km, or ``None``
    - ``nearest_substation_voltage_kv``: int kV, or ``None`` if untagged or no match

    Other input properties are preserved verbatim.
    """
    out_path = out_path or Path("out/interim/datacenters-enriched.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    datacenters = _load_features(datacenters_path)
    all_power = _load_features(substations_path)
    substations = [f for f in all_power if _is_substation(f)]

    idx = _build_index(substations)

    enriched: list[dict[str, Any]] = []
    for dc in datacenters:
        coords = dc.get("geometry", {}).get("coordinates")
        if not coords or len(coords) < 2:
            # Pass through unchanged — we can't enrich what we can't locate.
            enriched.append(_with_substation_nulls(dc))
            continue
        lon, lat = float(coords[0]), float(coords[1])
        bbox = (
            lon - _BBOX_HALF_DEG,
            lat - _BBOX_HALF_DEG,
            lon + _BBOX_HALF_DEG,
            lat + _BBOX_HALF_DEG,
        )
        candidates: list[Candidate] = []
        for sub_offset in idx.intersection(bbox):
            sub = substations[sub_offset]
            slon, slat = sub["geometry"]["coordinates"]
            distance = haversine_km(lon, lat, float(slon), float(slat))
            if distance > SEARCH_RADIUS_KM:
                continue
            sprops = sub.get("properties", {})
            candidates.append(
                (sprops.get("id", ""), distance, sprops.get("voltage_kv"))
            )

        best = pick_best_substation(candidates)
        if best is None:
            enriched.append(_with_substation_nulls(dc))
        else:
            sid, distance, voltage = best
            enriched.append(_with_substation_match(dc, sid, distance, voltage))

    out_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": enriched}, indent=2)
    )
    return out_path


def _with_substation_nulls(dc: dict[str, Any]) -> dict[str, Any]:
    new_props = {
        **dc.get("properties", {}),
        "nearest_substation_id": None,
        "nearest_substation_distance_km": None,
        "nearest_substation_voltage_kv": None,
    }
    return {**dc, "properties": new_props}


def _with_substation_match(
    dc: dict[str, Any], sid: str, distance_km: float, voltage_kv: int | None
) -> dict[str, Any]:
    new_props = {
        **dc.get("properties", {}),
        "nearest_substation_id": sid,
        "nearest_substation_distance_km": round(distance_km, 1),
        "nearest_substation_voltage_kv": voltage_kv,
    }
    return {**dc, "properties": new_props}
