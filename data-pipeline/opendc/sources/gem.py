"""Global Energy Monitor — Global Integrated Power Tracker (GIPT).

GEM publishes a large CSV / Excel snapshot of every utility-scale power
plant on Earth at:

    https://globalenergymonitor.org/projects/global-integrated-power-tracker/

The download is **free but registration-gated**, so we cannot fetch it
unattended. The convention in this pipeline:

1. A human downloads the latest GIPT release once, saves it as
   ``out/raw/gem-latest.xlsx`` (or ``.csv``), or sets ``GEM_GIPT_PATH``
   to its location.
2. ``fetch()`` resolves that path, hashes it, and copies it under a
   timestamped name into ``out/raw/`` so re-runs are reproducible.
3. ``normalize()`` runs against the snapshot, filtering to >=50 MW and
   mapping each row through :func:`opendc.transform.normalize_fuel.normalize_fuel`
   into our :class:`opendc.schemas.PowerPlant` schema.

Known data quality issues (per task 011 notes and prior experience):
- Some rows have lat/lon swapped; we do a basic sanity check
  (``-90 <= lat <= 90`` and ``-180 <= lon <= 180``) and drop violators.
- Coordinates exactly at (0, 0) are GEM's "unknown location" sentinel
  for plants whose coordinates haven't been confirmed - dropped with a
  log line.
- ``commissioning_year`` is sometimes a range like "2025-2027" or
  "Unknown"; we parse the first 4-digit year if any, else None.

Licence: CC BY 4.0. Attribution lives in ``apps/web/src/app/about/page.tsx``
and any layer tooltip that surfaces a GEM-derived field.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd
from pydantic import ValidationError

from opendc.schemas import PowerPlant
from opendc.transform.normalize_fuel import normalize_fuel

logger = logging.getLogger(__name__)

# Public landing page; documented for the human who will re-download
# snapshots. Not used at runtime - the gate is a registration form.
GEM_LANDING_URL = "https://globalenergymonitor.org/projects/global-integrated-power-tracker/"

# Minimum capacity we keep. Below 50 MW the dataset balloons with rooftop
# solar and small-hydro that are irrelevant to AI-grid planning.
MIN_CAPACITY_MW = 50.0

# Column names vary across GEM releases. We try several aliases per field
# rather than hard-coding one schema; if a release changes them again we
# add to these tuples instead of touching the parsing logic.
_NAME_COLS = ("Project name", "Plant / Project name", "Project Name", "Name")
_FUEL_COLS = ("Type", "Fuel", "Technology")
_CAPACITY_COLS = ("Capacity (MW)", "Capacity", "Capacity MW")
_LAT_COLS = ("Latitude", "Lat")
_LON_COLS = ("Longitude", "Lon", "Lng")
_OPERATOR_COLS = ("Operator", "Owner", "Operator/Owner")
_YEAR_COLS = ("Start year", "Commissioning year", "Year of commissioning", "RFS year")
_ID_COLS = ("GEM unit/phase ID", "GEM project ID", "GEM ID", "Tracker ID")


class DataSourceError(RuntimeError):
    """Raised when we cannot locate or read the GEM snapshot."""


def _resolve_snapshot() -> Path:
    """Find the human-provided snapshot.

    Resolution order (high -> low priority):
    1. ``GEM_GIPT_PATH`` env var (raises if path missing)
    2. exact ``out/raw/gem-latest.xlsx``
    3. exact ``out/raw/gem-latest.csv``
    4. glob ``out/raw/gem-latest*.xlsx`` (newest mtime wins)
    5. glob ``out/raw/gem-latest*.csv`` (newest mtime wins)

    The dated-glob fallbacks let a human drop a release like
    ``gem-latest-March-2026.xlsx`` into ``out/raw/`` without renaming,
    which preserves the download's provenance in the filename.
    """
    env = os.environ.get("GEM_GIPT_PATH")
    if env:
        path = Path(env).expanduser()
        if not path.exists():
            raise DataSourceError(f"GEM_GIPT_PATH={env} does not exist")
        return path
    for candidate in (Path("out/raw/gem-latest.xlsx"), Path("out/raw/gem-latest.csv")):
        if candidate.exists():
            return candidate
    raw_dir = Path("out/raw")
    for ext in ("xlsx", "csv"):
        # ``glob`` with the bare ``*`` pattern would match ``gem-latest.<ext>``
        # too, but that exact case is already handled above and won't re-enter.
        matches = sorted(
            raw_dir.glob(f"gem-latest*.{ext}"), key=lambda p: p.stat().st_mtime, reverse=True
        )
        if matches:
            return matches[0]
    raise DataSourceError(
        "No GEM snapshot found. Download the GIPT release from "
        f"{GEM_LANDING_URL} and either set GEM_GIPT_PATH or save it to "
        "out/raw/gem-latest.{xlsx,csv} (or out/raw/gem-latest-<label>.{xlsx,csv})."
    )


def fetch(*, out_dir: Path | None = None) -> Path:
    """Copy the resolved snapshot into ``out/raw/gem-<ts>.<ext>``.

    We copy rather than read-in-place so re-runs of normalize() stay
    deterministic even if the human re-downloads the source file.
    """
    out_dir = out_dir or Path("out/raw")
    out_dir.mkdir(parents=True, exist_ok=True)
    src = _resolve_snapshot()
    ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    target = out_dir / f"gem-{ts}{src.suffix.lower()}"
    shutil.copy2(src, target)
    return target


# --- normalize -------------------------------------------------------------


def _read_table(path: Path) -> pd.DataFrame:
    """Read xlsx or csv with sensible defaults; preserves strings as-is."""
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[""])
    if suffix in {".xlsx", ".xls"}:
        # GIPT typically has a "Power facilities" sheet; fall back to first.
        try:
            return pd.read_excel(
                path, sheet_name="Power facilities", dtype=str, keep_default_na=False
            )
        except (ValueError, KeyError):
            return pd.read_excel(path, dtype=str, keep_default_na=False)
    raise DataSourceError(f"unsupported snapshot extension: {suffix}")


def _pick_column(row: pd.Series, candidates: tuple[str, ...]) -> str | None:
    """Return the first non-empty value among the candidate columns."""
    for col in candidates:
        if col in row.index:
            value = row[col]
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def _parse_float(s: str | None) -> float | None:
    if s is None:
        return None
    try:
        return float(s.replace(",", ""))
    except (TypeError, ValueError):
        return None


_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


def _parse_year(s: str | None) -> int | None:
    if not s:
        return None
    match = _YEAR_RE.search(s)
    return int(match.group(0)) if match else None


def _valid_coords(lat: float | None, lon: float | None) -> bool:
    if lat is None or lon is None:
        return False
    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        return False
    # GEM's "unknown" sentinel - drop with provenance.
    return not (lat == 0.0 and lon == 0.0)


def _stable_id(row: pd.Series, fallback_idx: int) -> str:
    raw_id = _pick_column(row, _ID_COLS)
    if raw_id:
        # GEM ids are alphanumeric+dashes already; slug-prefix to namespace.
        return f"gem-{raw_id}"
    return f"gem-row-{fallback_idx}"


def _row_to_powerplant(row: pd.Series, idx: int) -> PowerPlant | None:
    capacity = _parse_float(_pick_column(row, _CAPACITY_COLS))
    if capacity is None or capacity < MIN_CAPACITY_MW:
        return None
    lat = _parse_float(_pick_column(row, _LAT_COLS))
    lon = _parse_float(_pick_column(row, _LON_COLS))
    if not _valid_coords(lat, lon):
        logger.debug("dropping row %d: invalid coords lat=%s lon=%s", idx, lat, lon)
        return None
    name = _pick_column(row, _NAME_COLS) or f"Unnamed plant {idx}"
    fuel = normalize_fuel(_pick_column(row, _FUEL_COLS))
    operator = _pick_column(row, _OPERATOR_COLS)
    year = _parse_year(_pick_column(row, _YEAR_COLS))
    try:
        return PowerPlant(
            id=_stable_id(row, idx),
            name=name,
            fuel_type=fuel,
            capacity_mw=capacity,
            geometry={"type": "Point", "coordinates": [lon, lat]},
            operator=operator,
            commissioning_year=year,
            source="gem",
        )
    except ValidationError as exc:
        logger.warning("schema reject row %d (%s): %s", idx, name, exc.errors())
        return None


def normalize(raw_path: Path, *, out_path: Path | None = None) -> Path:
    """Map the GEM snapshot to a schema-validated GeoJSON FeatureCollection."""
    out_path = out_path or Path("out/interim/powerplants.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df = _read_table(raw_path)
    features: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        plant = _row_to_powerplant(row, int(idx))
        if plant is None:
            continue
        props = plant.model_dump()
        geometry = props.pop("geometry")
        features.append({"type": "Feature", "geometry": geometry, "properties": props})
    out_path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, indent=2))
    return out_path


def run(*, out_dir: Path = Path("out")) -> tuple[Path, int, float]:
    """Orchestrator used by the CLI: fetch + normalize + metrics."""
    started = time.monotonic()
    raw = fetch(out_dir=out_dir / "raw")
    out = normalize(raw, out_path=out_dir / "interim" / "powerplants.geojson")
    duration = time.monotonic() - started
    feature_count = len(json.loads(out.read_text())["features"])
    return out, feature_count, duration
