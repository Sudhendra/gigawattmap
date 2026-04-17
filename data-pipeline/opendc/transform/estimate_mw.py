"""Estimate datacenter IT-load (MW) from physical footprint.

A v1 placeholder per task 010: 50 W/sqft of building footprint, with a
±25% interval to communicate uncertainty. The published heuristic in
SPEC §6.1 will refine this in a later card; right now the goal is to
produce a non-null value whenever we have a polygon, and ``None``
everywhere else, so the UI's confidence shading has something to bind to.

Areas are computed geodesically via :class:`pyproj.Geod` so the result
is real square metres rather than degrees-squared. That detail matters
because data-centre polygons span every latitude on Earth and a planar
``shapely.area`` on lon/lat would underestimate equatorial sites and
massively overestimate polar ones.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pyproj import Geod
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

# WGS-84 — the CRS every GeoJSON in this project uses.
_GEOD = Geod(ellps="WGS84")

# Conversion: 1 m² = 10.7639 ft²
_M2_TO_FT2 = 10.7639

# v1 watts-per-square-foot heuristic. Hand-wavy but broadly defensible;
# it gives ~50 MW for a 1,000,000 sqft hyperscale shell and ~5 MW for a
# 100,000 sqft colo, both within an order of magnitude of reality.
_W_PER_SQFT = 50

# Half-width of the published interval, as a fraction of the midpoint.
# 25% reflects how rough the W/sqft heuristic actually is — we'd rather
# show an honest range than a precise-looking single number.
_INTERVAL_HALF_WIDTH = 0.25


@dataclass(frozen=True, slots=True)
class MwEstimate:
    """Three-point MW estimate with provenance tag."""

    low: float | None
    mid: float | None
    high: float | None
    # Always 'estimate' for this v1 path; structured so the field stays
    # truthful when the real heuristic ships and yields, e.g., 'utility-filing'.
    source: str | None


_NULL = MwEstimate(low=None, mid=None, high=None, source=None)


def polygon_area_m2(geometry: dict[str, Any] | BaseGeometry) -> float:
    """Geodesic area in m². Returns 0.0 for non-areal geometries.

    Accepts either a GeoJSON-style dict or an already-parsed shapely
    geometry, so callers can avoid an extra `shape()` round-trip when they
    already have the shapely object in hand.
    """
    geom = geometry if isinstance(geometry, BaseGeometry) else shape(geometry)
    if geom.is_empty:
        return 0.0
    if geom.geom_type == "Polygon":
        polygons = [geom]
    elif geom.geom_type == "MultiPolygon":
        polygons = list(geom.geoms)
    else:
        return 0.0
    total = 0.0
    for poly in polygons:
        # Geod.geometry_area_perimeter returns signed area; abs() drops
        # the orientation so we don't need to worry about CCW vs CW rings.
        area, _perim = _GEOD.geometry_area_perimeter(poly)
        total += abs(area)
    return total


def estimate_mw_from_geometry(geometry: dict[str, Any] | BaseGeometry | None) -> MwEstimate:
    """Run the v1 W/sqft heuristic against a polygon geometry.

    Non-polygon or missing geometries return all-``None`` so the caller's
    schema mapping just falls through.
    """
    if geometry is None:
        return _NULL
    area_m2 = polygon_area_m2(geometry)
    if area_m2 <= 0:
        return _NULL
    sqft = area_m2 * _M2_TO_FT2
    mid_w = sqft * _W_PER_SQFT
    mid_mw = mid_w / 1_000_000
    return MwEstimate(
        low=round(mid_mw * (1 - _INTERVAL_HALF_WIDTH), 2),
        mid=round(mid_mw, 2),
        high=round(mid_mw * (1 + _INTERVAL_HALF_WIDTH), 2),
        source="estimate",
    )
