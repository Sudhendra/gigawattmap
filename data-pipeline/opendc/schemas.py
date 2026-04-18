"""Pydantic v2 models — the source of truth for every artifact the pipeline emits.

These mirror the TypeScript declarations in ``packages/types`` 1:1 today;
task 015 swaps the hand-written TS types for ones generated from this module
so the two stay in lockstep automatically.

Design notes:

- ``Geometry`` is intentionally permissive (a dict with a ``type`` discriminator)
  rather than a discriminated union of every GeoJSON variant. Geopandas hands
  us shapely geometries that we serialize via ``__geo_interface__``; the
  receiving end (deck.gl) only needs the standard GeoJSON shape.
- All ``id`` fields are slug-style strings, never integers — slugs survive
  joins across heterogeneous sources better than synthetic ids.
- Numeric ranges (``est_mw_low/mid/high``) are nullable independently because
  some sources only disclose the midpoint.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# --- GeoJSON ---------------------------------------------------------------

GeometryType = Literal[
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon",
    "GeometryCollection",
]

# A minimal GeoJSON Geometry: any dict whose ``type`` is a recognised
# geometry kind. We deliberately don't validate ``coordinates`` shape here
# — shapely already does that on ingest, and double-validating wastes time
# on multi-million-row power-plant datasets.
Geometry = dict[str, Any]


def _is_geometry(value: Any) -> Geometry:
    if not isinstance(value, dict):
        raise TypeError("geometry must be a GeoJSON dict")
    geom_type = value.get("type")
    if geom_type not in GeometryType.__args__:  # type: ignore[attr-defined]
        raise ValueError(f"unknown geometry type: {geom_type!r}")
    return value


# --- Enums (mirrored as Literal aliases — keeps JSON output identical) ----

DatacenterTier = Literal["hyperscale", "colo", "neocloud", "enterprise"]
DatacenterStatus = Literal["operational", "construction", "announced", "blocked"]
MwSource = Literal["announcement", "utility-filing", "estimate"]
Confidence = Literal["verified", "osm_only", "press_release", "estimated"]
FuelType = Literal[
    "coal", "gas", "nuclear", "solar", "wind", "hydro", "storage", "other"
]
AnnouncementCategory = Literal[
    "lease", "ppa", "capex", "opening", "opposition", "permit", "m_and_a", "other"
]
CloudProvider = Literal["aws", "azure", "gcp", "oracle", "alibaba"]

# Opposition fights — see :class:`OppositionFight` below. The upstream
# dataset (datacenter-opposition-tracker, CC BY 4.0) uses string enums
# without a published spec; we widen to ``str`` rather than ``Literal``
# to avoid the schema rejecting future categories during a routine pull.
# Validation surface stays useful because the *shape* (lat/lng/sources/
# action_type as a list) is what we actually depend on.
OppositionStatus = Literal[
    "active",
    "approved",
    "approved_with_conditions",
    "defeated",
    "delayed",
    "expired",
    "blocked",
    "cancelled",
    "withdrawn",
    "settled",
    "unknown",
]
OppositionOutcome = Literal["win", "loss", "partial", "ongoing", "unknown"]
GeocodeConfidence = Literal["upstream", "high", "medium", "low"]


class _Base(BaseModel):
    """Shared config: forbid unknown keys, freeze instances, validate on assignment.

    We are strict by default. Any source bringing fields we don't model gets
    rejected at ingest, which forces the schema (and therefore the public
    types) to evolve deliberately rather than drift silently.
    """

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        validate_assignment=True,
        str_strip_whitespace=True,
    )


# --- Models ---------------------------------------------------------------


class Operator(_Base):
    id: str
    name: str
    ticker: str | None
    tier: DatacenterTier
    headquarters_country: Annotated[str, Field(min_length=2, max_length=2)]


class Datacenter(_Base):
    id: str
    name: str
    operator_id: str | None
    tier: DatacenterTier
    status: DatacenterStatus
    geometry: Geometry
    est_mw_low: float | None
    est_mw_mid: float | None
    est_mw_high: float | None
    mw_source: MwSource | None
    country: Annotated[str, Field(min_length=2, max_length=2)]
    region: str | None
    sources: list[str]
    confidence: Confidence

    @field_validator("geometry")
    @classmethod
    def _validate_geometry(cls, v: Any) -> Geometry:
        return _is_geometry(v)


class PowerPlant(_Base):
    id: str
    name: str
    fuel_type: FuelType
    capacity_mw: float
    geometry: Geometry
    operator: str | None
    commissioning_year: int | None
    source: str

    @field_validator("geometry")
    @classmethod
    def _validate_geometry(cls, v: Any) -> Geometry:
        return _is_geometry(v)


class CableLanding(_Base):
    name: str
    country: Annotated[str, Field(min_length=2, max_length=2)]
    coordinates: tuple[float, float]


class Cable(_Base):
    id: str
    name: str
    length_km: float | None
    capacity_tbps: float | None
    landing_points: list[CableLanding]
    geometry: Geometry
    rfs_year: int | None

    @field_validator("geometry")
    @classmethod
    def _validate_geometry(cls, v: Any) -> Geometry:
        return _is_geometry(v)


class Announcement(_Base):
    id: str
    date: Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
    title: str
    operator_id: str | None
    datacenter_id: str | None
    amount_usd: float | None
    category: AnnouncementCategory
    source_url: str


class CloudRegion(_Base):
    """Public cloud provider region.

    Cloud providers do not publish exact datacenter coordinates for their
    regions for security reasons. We carry hand-curated metro-area
    centroids and surface them as 10 km buffer circles in the UI so the
    approximation is explicit. ``source_url`` cites the provider's own
    region documentation page for each row's existence and launch year.
    """

    provider: CloudProvider
    code: str  # e.g. "us-east-1" (AWS), "westeurope" (Azure)
    display_name: str  # e.g. "US East (N. Virginia)"
    geometry: Geometry  # Point — metro-area centroid, NOT exact location
    country: Annotated[str, Field(min_length=2, max_length=2)]
    launch_year: int | None
    services: list[str] | None  # e.g. ["compute", "storage", "ai"]
    source_url: str

    @field_validator("geometry")
    @classmethod
    def _validate_geometry(cls, v: Any) -> Geometry:
        return _is_geometry(v)

    @field_validator("source_url")
    @classmethod
    def _require_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("source_url must be an http(s) URL")
        return v


class OppositionFight(_Base):
    """One community challenge to a datacenter project.

    Sourced from `Georgeingebretsen/datacenter-opposition-tracker`
    (CC BY 4.0; see ``README.md`` data-source manifest). The upstream
    dataset is irregularly populated — some early rows from the SSRN
    moratorium dataset only have jurisdiction + summary; recent rows
    include MW, $, opposition groups, and links to multiple primary
    sources. Most fields are therefore optional, with the structural
    invariants (``id``, ``state``, ``geometry``, ``sources``,
    ``data_source``) treated as required so we always have something to
    cite and somewhere to plot.

    The geometry is always a Point. We carry both the original upstream
    `data_source` (provenance trail back through Data Center Watch /
    Robert Bryce / FracTracker / news) and a per-row ``sources`` array
    of primary URLs that the card surfaces directly.

    ``geocode_confidence`` defaults to ``"upstream"`` because the
    upstream JSON ships lat/lng for every row; the value flips to
    ``high``/``medium``/``low`` only when our Nominatim fallback fires
    (see :mod:`opendc.sources.geocode`). The card warns when confidence
    is ``low`` so a user never mistakes a city centroid for the actual
    site.
    """

    id: str
    project_name: str | None = None
    company: str | None = None
    hyperscaler: str | None = None
    jurisdiction: str
    state: Annotated[str, Field(min_length=2, max_length=2)]
    county: str | None = None
    geometry: Geometry  # Point
    status: OppositionStatus
    community_outcome: OppositionOutcome
    action_type: list[str]
    issue_category: list[str]
    summary: str | None = None
    megawatts: float | None = None
    investment_million_usd: float | None = None
    opposition_groups: list[str]
    sources: list[str]
    date: str | None = None  # ISO-8601 date or fuzzy upstream string
    last_updated: str | None = None
    data_source: str
    geocode_confidence: GeocodeConfidence

    @field_validator("geometry")
    @classmethod
    def _validate_geometry(cls, v: Any) -> Geometry:
        return _is_geometry(v)

    @field_validator("sources")
    @classmethod
    def _require_one_source(cls, v: list[str]) -> list[str]:
        # `AGENTS.md` mandates a per-row source URL audit trail. We allow
        # an empty list ONLY if `data_source` is a known aggregator key
        # (checked in the loader) — at the schema layer we just require
        # http(s) shape on whatever URLs are present.
        for url in v:
            if not url.startswith(("http://", "https://")):
                raise ValueError(f"source must be an http(s) URL, got {url!r}")
        return v

    @field_validator("state")
    @classmethod
    def _uppercase_state(cls, v: str) -> str:
        return v.upper()
