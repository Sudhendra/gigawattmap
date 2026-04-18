"""Hand-curated cloud provider regions loader.

Reads ``opendc/data/cloud-regions.json`` — a hand-maintained inventory of
public-cloud regions for AWS, Azure, GCP, Oracle, and Alibaba — and emits
a GeoJSON FeatureCollection of Point features at metro-area centroids.

Cloud providers intentionally do not publish exact datacenter coordinates
for their regions, so every row carries an approximate centroid and the
UI renders a 10 km buffer to make the approximation visible (see
:class:`opendc.schemas.CloudRegion`).

Validation is loud: every row must satisfy
:class:`opendc.schemas.CloudRegion`, including a real http(s) ``source_url``
that cites the provider's own documentation. The JSON file uses a
``regions`` key wrapped in a top-level object so a leading ``_comment``
block can document curation methodology in-tree.
"""

from __future__ import annotations

import json
import time
from collections.abc import Iterator
from importlib.resources import files
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from opendc.schemas import CloudRegion

REGIONS_JSON = "cloud-regions.json"

SOURCE_TAG = "cloud-regions"


class CloudRegionError(ValueError):
    """Raised when a row fails validation; carries the row id for context."""


def _json_path() -> Path:
    """Resolve the bundled JSON via importlib.resources."""
    return Path(str(files("opendc.data").joinpath(REGIONS_JSON)))


def _row_to_model(raw: dict[str, Any]) -> CloudRegion:
    """Coerce one ``regions[]`` entry into the typed model.

    The on-disk format is flat (``lat``/``lon`` fields) for human
    readability; the Pydantic model demands a GeoJSON ``geometry`` so we
    transform here rather than asking curators to hand-write nested dicts.
    """
    lat = raw.get("lat")
    lon = raw.get("lon")
    if lat is None or lon is None:
        raise CloudRegionError(
            f"row {raw.get('code', '<unknown>')!r}: missing lat/lon"
        )
    payload = {k: v for k, v in raw.items() if k not in {"lat", "lon"}}
    payload["geometry"] = {"type": "Point", "coordinates": [lon, lat]}
    try:
        return CloudRegion.model_validate(payload)
    except ValidationError as exc:
        raise CloudRegionError(
            f"row {raw.get('code', '<unknown>')!r}: {exc}"
        ) from exc


def iter_rows(path: Path | None = None) -> Iterator[CloudRegion]:
    """Stream validated CloudRegion rows from the JSON file."""
    json_path = path or _json_path()
    payload = json.loads(json_path.read_text())
    rows = payload.get("regions", [])
    if not isinstance(rows, list):
        raise CloudRegionError(
            f"{json_path}: expected 'regions' to be a list, got {type(rows).__name__}"
        )
    for raw in rows:
        if not isinstance(raw, dict):
            raise CloudRegionError(
                f"{json_path}: every entry must be an object, got {type(raw).__name__}"
            )
        yield _row_to_model(raw)


def _to_feature(row: CloudRegion) -> dict[str, Any]:
    """Wrap a CloudRegion as a GeoJSON Feature."""
    props = row.model_dump()
    geometry = props.pop("geometry")
    # Stable feature id so the web tier can dedupe / link by region code.
    return {
        "type": "Feature",
        "id": f"{row.provider}:{row.code}",
        "geometry": geometry,
        "properties": props,
    }


def normalize(out_path: Path | None = None) -> Path:
    """Read + validate the JSON and emit a GeoJSON FeatureCollection."""
    out_path = out_path or Path("out/interim/cloud-regions.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    features = [_to_feature(row) for row in iter_rows()]
    out_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, indent=2)
    )
    return out_path


def run(*, out_dir: Path = Path("out")) -> tuple[Path, int, float]:
    """CLI helper returning the ``(path, count, duration)`` triple.

    Mirrors the shape used by every other source so manifest writing
    stays uniform across the pipeline.
    """
    started = time.monotonic()
    out_path = normalize(out_dir / "interim" / "cloud-regions.geojson")
    duration = time.monotonic() - started
    feature_count = len(json.loads(out_path.read_text())["features"])
    return out_path, feature_count, duration
