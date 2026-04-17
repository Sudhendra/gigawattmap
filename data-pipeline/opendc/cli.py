"""Top-level Typer CLI.

Each command is a thin shell in v0.1 — the real work lands in tasks 010
through 014. We declare them now so the rest of the pipeline (Makefile,
docs, deploy scripts) can wire against a stable command surface.
"""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console

from opendc import __version__
from opendc.manifest import make_entry, write_entry
from opendc.sources import osm as osm_source

app = typer.Typer(
    name="opendc",
    help="Gigawatt Map data pipeline CLI.",
    no_args_is_help=True,
    add_completion=False,
)

# A single console is shared across commands so output styling stays
# consistent and so tests can capture writes through one well-known sink.
console = Console()


def _stub(command: str) -> None:
    """Print a uniform "not implemented" message and return.

    Returning (rather than raising or exiting non-zero) keeps the skeleton
    usable in CI smoke-tests: ``opendc ingest --help`` and ``opendc ingest``
    both exit 0, so downstream automation can be wired before the real
    implementation lands.
    """
    console.print(f"[yellow]opendc {command}: not implemented yet[/yellow]")


@app.command()
def ingest(
    source: str = typer.Argument("all", help="Source name or 'all'."),
    sample: bool = typer.Option(False, "--sample", help="Fetch a small sample only."),
    out_dir: Path = typer.Option(Path("out"), "--out-dir", help="Artifact root."),
) -> None:
    """Fetch raw data from a source (OSM, GEM, TeleGeography, ...)."""
    if source not in {"osm", "all"}:
        # Other sources land in tasks 011/012 — keep the surface stable.
        console.print(f"[yellow]opendc ingest {source}: not implemented yet[/yellow]")
        return
    console.print(f"[cyan]Fetching OSM datacenters{' (sample)' if sample else ''}...[/cyan]")
    geojson_path, count, duration = osm_source.run(sample=sample, out_dir=out_dir)
    write_entry(
        out_dir / "manifest.json",
        make_entry(
            source="osm-datacenters",
            feature_count=count,
            duration_s=duration,
            url=osm_source.OVERPASS_URL,
            notes="sample=DFW" if sample else None,
        ),
    )
    console.print(
        f"[green]wrote {geojson_path} ({count} features, {duration:.1f}s)[/green]"
    )


@app.command()
def transform() -> None:
    """Normalize raw data into schema-validated GeoJSON / Parquet."""
    _stub("transform")


@app.command()
def tiles() -> None:
    """Build PMTiles archives from the normalized GeoJSON."""
    _stub("tiles")


@app.command()
def upload() -> None:
    """Upload built artifacts to R2 / object storage."""
    _stub("upload")


@app.command()
def version() -> None:
    """Print the pipeline version."""
    console.print(__version__)


if __name__ == "__main__":  # pragma: no cover — entry-point dispatch
    app()
