"""Hand-curated AI campus loader.

Reads two CSVs that are the human-maintained source of truth for the
~50 most consequential AI campuses and the operators behind them:

* ``opendc/data/operators.csv`` — canonical operator list (also consumed
  by :mod:`opendc.operators` for fuzzy matching against OSM strings).
* ``opendc/data/ai-campuses.csv`` — campus rows with disclosed MW,
  tenants, GPU counts, CAPEX, PPA counterparties, and source URLs.

The curated CSV intentionally carries fields the canonical
:class:`opendc.schemas.Datacenter` doesn't model (``tenant``, ``gpus``,
``capex_usd_b``, ``announced_date``, ``rfs_date``, ``ppa_counterparty``,
``notes``). Those ride along as GeoJSON ``properties`` so the web tier
can surface them in the intelligence drawer (task 006 onward) without
forcing a second fetch.

Validation strategy:
- Validate the *core* Datacenter fields with pydantic so any schema drift
  shows up immediately at ingest, the same way OSM/GEM rows do.
- Validate the *enrichment* fields with a separate pydantic model so we
  catch typos in dates, missing source URLs, etc. without polluting
  Datacenter with optional fields no other source produces.
- Reject the whole row on validation error rather than silently dropping
  fields. This CSV is hand-edited; loud failures are the goal.
"""

from __future__ import annotations

import csv
import json
import time
from collections.abc import Iterator
from importlib.resources import files
from pathlib import Path
from typing import Any, cast

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from opendc.operators import load_operators
from opendc.schemas import Datacenter, DatacenterStatus, DatacenterTier

CAMPUSES_CSV = "ai-campuses.csv"

# Source URL recorded on every emitted Datacenter so /about and audit
# tooling can trace the row back to this CSV alongside its row-level
# ``source_url`` enrichment field.
SOURCE_TAG = "curated"


class CuratedCampusError(ValueError):
    """Raised when a row fails validation; carries the row id for context."""


class _CampusRow(BaseModel):
    """Schema for one row of ``ai-campuses.csv``.

    Models the CSV exactly — including the enrichment fields that don't
    exist on the canonical :class:`Datacenter` model. We split into two
    models so this one can evolve independently of the cross-source
    contract.
    """

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        str_strip_whitespace=True,
    )

    id: str
    name: str
    operator: str
    tenant: str | None
    status: str
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    country: str = Field(min_length=2, max_length=2)
    region: str | None
    est_mw_low: float | None
    est_mw_mid: float | None
    est_mw_high: float | None
    gpus: str | None
    capex_usd_b: float | None
    announced_date: str | None
    rfs_date: str | None
    ppa_counterparty: str | None
    source_url: str
    notes: str | None

    @field_validator("source_url")
    @classmethod
    def _require_url(cls, v: str) -> str:
        # Keep the audit trail intact: every row must cite something.
        if not v.startswith(("http://", "https://")):
            raise ValueError("source_url must be an http(s) URL")
        return v

    @field_validator("status")
    @classmethod
    def _validate_status(cls, v: str) -> str:
        # Mirror DatacenterStatus's Literal so a typo here fails at parse
        # time with a row-level error message, not deep inside Datacenter.
        allowed = {"operational", "construction", "announced", "blocked"}
        if v not in allowed:
            raise ValueError(f"status must be one of {sorted(allowed)}, got {v!r}")
        return v


def _csv_path() -> Path:
    """Resolve the bundled CSV via importlib.resources.

    Same pattern as :func:`opendc.operators._operators_path` so the file
    works whether opendc is run from source, an installed wheel, or a
    zipped artifact.
    """
    return Path(str(files("opendc.data").joinpath(CAMPUSES_CSV)))


def _coerce_optional(value: str) -> str | None:
    """Convert empty CSV cells to ``None``; pydantic does the rest."""
    return value if value.strip() else None


def _row_to_model(raw: dict[str, str]) -> _CampusRow:
    """Coerce a DictReader row into the typed model.

    csv.DictReader hands us strings for everything; pydantic does the
    numeric coercion but doesn't know that empty strings should become
    ``None`` for nullable numeric fields.
    """
    cleaned: dict[str, Any] = {k: _coerce_optional(v) for k, v in raw.items()}
    return _CampusRow.model_validate(cleaned)


def iter_rows(path: Path | None = None) -> Iterator[_CampusRow]:
    """Stream validated rows from the curated CSV.

    Comment lines (leading ``#``) are stripped before parsing so the file
    can carry the schema documentation that ``operators.csv`` already does.
    """
    csv_path = path or _csv_path()
    with csv_path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(line for line in fh if not line.startswith("#"))
        for line_no, row in enumerate(reader, start=2):
            try:
                yield _row_to_model(row)
            except ValidationError as exc:
                # Surface the row id (or line number) so the operator can
                # find the offending entry in seconds.
                row_id = row.get("id") or f"line-{line_no}"
                raise CuratedCampusError(
                    f"ai-campuses.csv row {row_id!r}: {exc}"
                ) from exc


def _validate_operator(row: _CampusRow, known: frozenset[str]) -> None:
    """Cross-check operator id against the curated operators list."""
    if row.operator not in known:
        raise CuratedCampusError(
            f"ai-campuses.csv row {row.id!r}: unknown operator {row.operator!r}"
            f" (add to operators.csv first)"
        )


def _to_datacenter(row: _CampusRow) -> Datacenter:
    """Project a curated row into the canonical Datacenter schema.

    Only fields that exist on Datacenter survive; enrichment fields are
    re-attached by :func:`_to_feature` so they show up in GeoJSON
    properties without polluting the core schema.
    """
    return Datacenter(
        id=row.id,
        name=row.name,
        operator_id=row.operator,
        # Curated rows are by definition the most newsworthy AI campuses,
        # so we tag every one as hyperscale unless an operator's tier in
        # operators.csv overrides — which we look up on demand to avoid a
        # circular import.
        tier=cast(DatacenterTier, _operator_tier(row.operator)),
        status=cast(DatacenterStatus, row.status),
        geometry={"type": "Point", "coordinates": [row.lon, row.lat]},
        est_mw_low=row.est_mw_low,
        est_mw_mid=row.est_mw_mid,
        est_mw_high=row.est_mw_high,
        mw_source="announcement" if row.est_mw_mid is not None else None,
        country=row.country,
        region=row.region,
        sources=[SOURCE_TAG],
        confidence="verified",
    )


def _operator_tier(operator_id: str) -> str:
    """Look up an operator's tier; default to colo if unknown.

    We can't import :mod:`opendc.operators` at module top because that
    module already imports the data CSV and we want this file's import
    cost to stay flat.
    """
    for op in load_operators():
        if op.id == operator_id:
            return op.tier
    return "colo"


def _enrichment_props(row: _CampusRow) -> dict[str, Any]:
    """The fields that don't exist on Datacenter but matter to the UI."""
    return {
        "tenant": row.tenant,
        "gpus": row.gpus,
        "capex_usd_b": row.capex_usd_b,
        "announced_date": row.announced_date,
        "rfs_date": row.rfs_date,
        "ppa_counterparty": row.ppa_counterparty,
        "source_url": row.source_url,
        "notes": row.notes,
    }


def _to_feature(row: _CampusRow) -> dict[str, Any]:
    """Wrap a curated row as a GeoJSON Feature with full enrichment props."""
    dc = _to_datacenter(row)
    props = dc.model_dump()
    geometry = props.pop("geometry")
    props.update(_enrichment_props(row))
    return {
        "type": "Feature",
        "geometry": geometry,
        "properties": props,
    }


def normalize(out_path: Path | None = None) -> Path:
    """Read + validate the CSV and emit a GeoJSON FeatureCollection.

    ``operators.csv`` is loaded once and used to validate every row's
    operator id — a typo there would otherwise produce a row pointing at
    a nonexistent canonical operator.
    """
    out_path = out_path or Path("out/interim/curated-ai-campuses.geojson")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    known_operators = frozenset(op.id for op in load_operators())
    features: list[dict[str, Any]] = []
    for row in iter_rows():
        _validate_operator(row, known_operators)
        features.append(_to_feature(row))
    out_path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, indent=2)
    )
    return out_path


def run(*, out_dir: Path = Path("out")) -> tuple[Path, int, float]:
    """Convenience wrapper used by the CLI.

    Mirrors the ``(geojson_path, count, duration)`` tuple shape the OSM
    and GEM sources return so manifest writing stays uniform.
    """
    started = time.monotonic()
    out_path = normalize(out_dir / "interim" / "curated-ai-campuses.geojson")
    duration = time.monotonic() - started
    feature_count = len(json.loads(out_path.read_text())["features"])
    return out_path, feature_count, duration
