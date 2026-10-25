"""Weekly full OSM refresh and compact, atomic map snapshot publication."""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime, timedelta
from pathlib import Path

import typer
from rich.console import Console
from shapely.geometry import shape

from opendc import releases
from opendc.map_changes import compare
from opendc.operators import load_operators
from opendc.schemas import Datacenter
from opendc.sources import curated, osm
from opendc.transform import merge

app = typer.Typer()


def check_count(count: int, previous: int) -> None:
    if count < 4000 or count < previous * 0.8:
        raise releases.ReleaseError(
            f"Refusing incomplete map: {count} facilities, previous {previous}"
        )


def build_records(path: Path) -> list[dict[str, object]]:
    raw = json.loads(path.read_text())
    if (
        not isinstance(raw, dict)
        or raw.get("type") != "FeatureCollection"
        or not isinstance(raw.get("features"), list)
    ):
        raise releases.ReleaseError("Expected a GeoJSON FeatureCollection")
    operators = {op.id: op.name for op in load_operators()}
    records: list[dict[str, object]] = []
    seen: set[str] = set()
    for feature in raw["features"]:
        props = feature["properties"]
        geom = shape(feature["geometry"])
        point = geom.representative_point()
        lon, lat = float(point.x), float(point.y)
        if (
            not math.isfinite(lon)
            or not math.isfinite(lat)
            or not -180 <= lon <= 180
            or not -90 <= lat <= 90
        ):
            raise releases.ReleaseError("Invalid facility coordinates")
        geometry = {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}
        model = Datacenter.model_validate(
            {
                **{key: value for key, value in props.items() if key in Datacenter.model_fields},
                "geometry": geometry,
            }
        )
        if model.id in seen:
            raise releases.ReleaseError(f"Duplicate facility id: {model.id}")
        seen.add(model.id)
        records.append(
            {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "id": model.id,
                    "name": model.name,
                    "operator": operators.get(model.operator_id or "", "Unknown"),
                    "operator_id": model.operator_id,
                    "tenant": props.get("tenant") or "",
                    "tier": model.tier,
                    "status": model.status if "curated" in model.sources else None,
                    "est_mw_mid": model.est_mw_mid,
                    "country": model.country if model.country != "ZZ" else "Unknown",
                    "region": model.region,
                    "sources": model.sources,
                    "confidence": model.confidence,
                    "source_url": props.get("source_url"),
                },
            }
        )
    return records


def source_timestamp(out_dir: Path, *, now: datetime | None = None) -> str:
    paths = sorted((out_dir / "raw").glob("osm-*.json"))
    if not paths:
        raise releases.ReleaseError("Missing raw OSM provenance")
    raw = json.loads(paths[-1].read_text())
    if not isinstance(raw, dict) or raw.get("remark"):
        raise releases.ReleaseError("Partial or invalid Overpass response")
    metadata = raw.get("osm3s")
    stamp = metadata.get("timestamp_osm_base") if isinstance(metadata, dict) else None
    if not isinstance(stamp, str):
        raise releases.ReleaseError("Missing OSM source timestamp")
    try:
        timestamp = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise releases.ReleaseError("Invalid OSM source timestamp") from exc
    now = now or datetime.now(UTC)
    if timestamp.tzinfo is None or timestamp > now or now - timestamp > timedelta(days=7):
        raise releases.ReleaseError(f"OSM upstream is stale: {stamp}; refusing publication")
    return stamp


def refresh_map(*, out_dir: Path) -> releases.Release:
    config, client = releases.storage()
    previous = releases.read_current("map", config, client)
    osm_path, count, _duration = osm.run(sample=False, out_dir=out_dir)
    osm_timestamp = source_timestamp(out_dir)
    check_count(count, len(previous.records) if previous else 4255)
    curated.run(out_dir=out_dir)
    result = merge.run(out_dir=out_dir)
    records = build_records(result.out_path)
    check_count(len(records), len(previous.records) if previous else 4255)
    now = datetime.now(UTC).isoformat()
    release = releases.Release(
        channel="map",
        updated_at=now,
        records=records,
        changes=compare(previous, records, now),
        sources=[
            {
                "name": "OpenStreetMap",
                "url": osm.OVERPASS_URL,
                "checked_at": now,
                "data_timestamp": osm_timestamp,
                "row_count": count,
                "license": "ODbL-1.0",
                "attribution": "© OpenStreetMap contributors",
            },
            {
                "name": "Curated AI campuses",
                "url": "https://github.com/Sudhendra/gigawattmap/blob/main/data-pipeline/opendc/data/ai-campuses.csv",
                "notes": "Loaded from repository. Editorial claims are not re-verified by this automated refresh.",
            },
        ],
    )
    # Archive the full geometries with the run; browser gets compact representative points.
    if not osm_path.exists():
        raise releases.ReleaseError("Missing normalized OSM artifact")
    releases.publish(release, out_dir=out_dir, config=config, client=client)
    return release


@app.command()
def main(out_dir: Path = typer.Option(Path("out/refresh-map"))) -> None:
    """Fetch OSM, merge curated sites, validate, and publish the full map."""
    result = refresh_map(out_dir=out_dir)
    Console().log(f"Published {len(result.records)} facilities")


if __name__ == "__main__":
    app()
