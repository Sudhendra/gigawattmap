"""Public datacenters export — turns the merged interim into download-ready files.

Reads ``out/interim/datacenters-merged.geojson`` (produced by
:mod:`opendc.transform.merge`) and writes the two consumer-facing files:

  out/datacenters.geojson — copy, suitable for direct GIS use
  out/datacenters.csv     — flat tabular form with ``lon``/``lat`` columns

Column order in the CSV is the public contract: the union of every
property key seen across all features, sorted, with ``id``, ``name``,
``lon``, ``lat`` pinned to the front. Lists (e.g. ``sources``) are
pipe-delimited; pipes are not used in any source URL we accept, so the
delimiter is unambiguous and the file stays single-table.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from shapely.geometry import shape

# Columns we always want first, in this exact order, when present.
# Everything else gets appended in alphabetical order.
_PINNED_COLUMNS: tuple[str, ...] = ("id", "name", "lon", "lat")


@dataclass(frozen=True, slots=True)
class ExportResult:
    """Summary of an export run; the publish pipeline forwards these to manifest."""

    geojson_path: Path
    csv_path: Path
    feature_count: int


def _centroid_lon_lat(geometry: dict[str, Any]) -> tuple[float, float]:
    """Return a representative ``(lon, lat)`` for any GeoJSON geometry.

    Points pass through; polygons/lines collapse to their centroid. We
    do not skip non-Point geometries because the CSV needs *some*
    coordinate per row — analysts joining on lat/lon expect every row
    to have one.
    """
    geom = shape(geometry)
    if geom.geom_type == "Point":
        return (float(geom.x), float(geom.y))
    centroid = geom.centroid
    return (float(centroid.x), float(centroid.y))


def _flatten_value(value: Any) -> str:
    """Render a property value as a CSV cell.

    - ``None`` → empty string (sentinel; analysts can ``IS NULL``-equivalent it)
    - lists → ``a|b|c`` (pipe-delimited; pipes never appear in our source URLs)
    - everything else → ``str(value)``
    """
    if value is None:
        return ""
    if isinstance(value, list):
        return "|".join(str(v) for v in value)
    return str(value)


def _column_order(features: list[dict[str, Any]]) -> list[str]:
    """Compute the union of property keys, with pinned columns first."""
    keys: set[str] = set()
    for feat in features:
        keys.update(feat.get("properties", {}).keys())
    # Pinned columns ``lon``/``lat`` are synthesised, not properties.
    keys.discard("lon")
    keys.discard("lat")
    pinned_present = [c for c in _PINNED_COLUMNS if c in keys or c in ("lon", "lat")]
    rest = sorted(k for k in keys if k not in _PINNED_COLUMNS)
    return pinned_present + rest


def export_datacenters(merged_path: Path, out_dir: Path) -> ExportResult:
    """Produce ``datacenters.geojson`` and ``datacenters.csv`` under ``out_dir``."""
    if not merged_path.exists():
        raise FileNotFoundError(f"merged input not found: {merged_path}")
    payload = json.loads(merged_path.read_text())
    features: list[dict[str, Any]] = payload.get("features", [])

    out_dir.mkdir(parents=True, exist_ok=True)
    geojson_path = out_dir / "datacenters.geojson"
    csv_path = out_dir / "datacenters.csv"

    # GeoJSON output: re-serialise (don't byte-copy) so the on-disk format
    # is canonical regardless of how the merge wrote it.
    geojson_path.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            indent=2,
            sort_keys=True,
        )
    )

    columns = _column_order(features)
    with csv_path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns)
        writer.writeheader()
        for feat in features:
            lon, lat = _centroid_lon_lat(feat["geometry"])
            row = {col: "" for col in columns}
            for key, value in feat.get("properties", {}).items():
                if key in row:
                    row[key] = _flatten_value(value)
            row["lon"] = f"{lon:.6f}"
            row["lat"] = f"{lat:.6f}"
            writer.writerow(row)

    return ExportResult(
        geojson_path=geojson_path,
        csv_path=csv_path,
        feature_count=len(features),
    )
