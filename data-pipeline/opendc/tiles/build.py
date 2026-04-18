"""Build PMTiles archives from interim GeoJSON.

Wraps ``tippecanoe`` with three preset commands — one per layer:

* ``datacenters`` (z2-14): the headline polygon/point layer; uses
  ``--drop-densest-as-needed`` + ``--extend-zooms-if-still-dropping`` so
  hot clusters (Ashburn, Dublin) don't lose individual sites at high zoom.
* ``powerplants`` (z3-12): mid-zoom only; below z3 the world is a noise
  field of dots, above z12 we don't need plant-level detail for grid context.
* ``cables`` (z1-8): low-zoom; cables are a global pattern, individual
  segments below z1 collapse to a tangle and above z8 they overwhelm the
  data layer they're meant to contextualise.

The presets reflect SPEC.md §4.2 plus the per-layer zoom ranges from
task 013 ACs. Tweaking them is a deliberate decision — touch the constants,
not the function bodies.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


class TippecanoeError(RuntimeError):
    """Raised when tippecanoe is missing or exits non-zero."""


@dataclass(frozen=True, slots=True)
class TileSpec:
    """One layer's tippecanoe configuration.

    Frozen so tests can compare specs by value without surprises and so
    the global preset table is treated as configuration, not state.
    """

    name: str  # logical layer name (becomes --layer=)
    input_path: Path  # interim/<name>.geojson
    output_path: Path  # out/tiles/<name>.pmtiles
    min_zoom: int
    max_zoom: int
    extra_args: tuple[str, ...] = ()


# Defaults align with SPEC.md §4.2 and the per-layer zoom budgets in the
# task card. Override per call if needed.
DEFAULT_SPECS: tuple[TileSpec, ...] = (
    TileSpec(
        name="datacenters",
        # Canonical merged output of the curated + OSM merge (transform/merge.py).
        # Using the merged file rather than osm-datacenters.geojson keeps the
        # curated 53 visible even when an OSM ingest is stale or missing.
        input_path=Path("out/interim/datacenters-merged.geojson"),
        output_path=Path("out/tiles/datacenters.pmtiles"),
        min_zoom=2,
        max_zoom=14,
        extra_args=(
            "--drop-densest-as-needed",
            "--extend-zooms-if-still-dropping",
            "--coalesce",
            "--reorder",
        ),
    ),
    TileSpec(
        name="powerplants",
        input_path=Path("out/interim/powerplants.geojson"),
        output_path=Path("out/tiles/powerplants.pmtiles"),
        min_zoom=3,
        max_zoom=12,
        extra_args=("--drop-densest-as-needed",),
    ),
    TileSpec(
        name="cables",
        input_path=Path("out/interim/cables.geojson"),
        output_path=Path("out/tiles/cables.pmtiles"),
        min_zoom=1,
        max_zoom=8,
        # Cables are line features - coalescing them across tiles keeps
        # rendered lines visually continuous at low zoom.
        extra_args=("--coalesce", "--reorder"),
    ),
    TileSpec(
        name="cloud_regions",
        # Hand-curated centroid points (~120 rows total). Visible from a
        # global overview (z2) all the way to metro detail (z12); we don't
        # need higher zoom because coordinates are deliberately approximate.
        input_path=Path("out/interim/cloud-regions.geojson"),
        output_path=Path("out/tiles/cloud-regions.pmtiles"),
        min_zoom=2,
        max_zoom=12,
    ),
    TileSpec(
        name="opposition",
        # Community-opposition fights (~900 rows, US-only as of 2026-04).
        # Visible from continental overview down to county-level detail.
        # No --drop-densest-as-needed because the dataset is small enough
        # that every fight should remain pickable at every zoom.
        input_path=Path("out/interim/opposition.geojson"),
        output_path=Path("out/tiles/opposition.pmtiles"),
        min_zoom=2,
        max_zoom=12,
    ),
)


def _ensure_tippecanoe() -> str:
    """Locate the ``tippecanoe`` binary or raise a clear error."""
    path = shutil.which("tippecanoe")
    if path is None:
        raise TippecanoeError(
            "tippecanoe not found on PATH. Install it: "
            "macOS `brew install tippecanoe`, Linux build from source "
            "(see docs/dev-setup.md)."
        )
    return path


def build_tippecanoe_args(spec: TileSpec, *, binary: str = "tippecanoe") -> list[str]:
    """Compose the argv list for one spec.

    Pure helper so tests can assert flag composition without invoking the
    real binary. ``-o`` is forced first after the binary so that any
    caller who logs argv sees the output path immediately.
    """
    return [
        binary,
        "-o",
        str(spec.output_path),
        f"--layer={spec.name}",
        f"--minimum-zoom={spec.min_zoom}",
        f"--maximum-zoom={spec.max_zoom}",
        "--force",  # overwrite without prompt - we always rebuild fresh
        *spec.extra_args,
        str(spec.input_path),
    ]


def build_one(spec: TileSpec) -> Path:
    """Run tippecanoe for a single spec; return the resulting PMTiles path."""
    if not spec.input_path.exists():
        raise FileNotFoundError(f"input geojson missing: {spec.input_path}")
    binary = _ensure_tippecanoe()
    spec.output_path.parent.mkdir(parents=True, exist_ok=True)
    args = build_tippecanoe_args(spec, binary=binary)
    logger.info("tippecanoe build: %s", " ".join(args))
    proc = subprocess.run(args, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        # tippecanoe prints progress on stderr; surface the tail to the user.
        raise TippecanoeError(
            f"tippecanoe failed for {spec.name} (exit {proc.returncode}):\n"
            f"{proc.stderr[-1000:]}"
        )
    return spec.output_path


def build_all(
    specs: tuple[TileSpec, ...] | None = None,
    *,
    skip_missing: bool = True,
) -> list[Path]:
    """Build every spec; return the paths actually produced.

    ``skip_missing=True`` lets a partial pipeline run (e.g. only OSM
    ingested so far) skip layers that have no input rather than failing
    the whole tile build.
    """
    specs = specs or DEFAULT_SPECS
    out: list[Path] = []
    for spec in specs:
        if skip_missing and not spec.input_path.exists():
            logger.warning(
                "skipping %s: input %s not found", spec.name, spec.input_path
            )
            continue
        out.append(build_one(spec))
    return out
