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
from opendc.sources import gem as gem_source
from opendc.sources import osm as osm_source
from opendc.sources import telegeography as tg_source
from opendc.tiles import build as tiles_build
from opendc.tiles import upload as tiles_upload

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
    if source not in {"osm", "gem", "telegeography", "all"}:
        # Other sources land in tasks 013+ — keep the surface stable.
        console.print(f"[yellow]opendc ingest {source}: not implemented yet[/yellow]")
        return
    if source in {"osm", "all"}:
        console.print(
            f"[cyan]Fetching OSM datacenters{' (sample)' if sample else ''}...[/cyan]"
        )
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
    if source in {"gem", "all"}:
        console.print("[cyan]Normalizing GEM power plants...[/cyan]")
        try:
            geojson_path, count, duration = gem_source.run(out_dir=out_dir)
        except gem_source.DataSourceError as exc:
            console.print(f"[red]gem: {exc}[/red]")
            if source == "gem":
                raise typer.Exit(1) from exc
            return
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="gem-powerplants",
                feature_count=count,
                duration_s=duration,
                url=gem_source.GEM_LANDING_URL,
            ),
        )
        console.print(
            f"[green]wrote {geojson_path} ({count} features, {duration:.1f}s)[/green]"
        )
    if source in {"telegeography", "all"}:
        console.print(
            f"[cyan]Fetching TeleGeography submarine cables{' (sample)' if sample else ''}...[/cyan]"
        )
        cables_path, landings_path, cable_count, landing_count, duration = tg_source.run(
            out_dir=out_dir, sample=sample
        )
        # One manifest entry per artifact, both flagged with the licence note
        # so /about and audit tooling can read it without a second source.
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="telegeography-cables",
                feature_count=cable_count,
                duration_s=duration,
                url=tg_source.CABLE_GEO_URL,
                notes=tg_source.LICENSE_NOTE,
            ),
        )
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="telegeography-landings",
                feature_count=landing_count,
                duration_s=duration,
                url=tg_source.LANDING_GEO_URL,
                notes=tg_source.LICENSE_NOTE,
            ),
        )
        console.print(
            f"[green]wrote {cables_path} ({cable_count} cables) and "
            f"{landings_path} ({landing_count} landings) in {duration:.1f}s[/green]"
        )


@app.command()
def transform() -> None:
    """Normalize raw data into schema-validated GeoJSON / Parquet."""
    _stub("transform")


tiles_app = typer.Typer(
    name="tiles",
    help="Build and upload PMTiles archives.",
    no_args_is_help=True,
)
app.add_typer(tiles_app, name="tiles")


@tiles_app.command("build")
def tiles_build_cmd() -> None:
    """Build PMTiles archives from interim GeoJSON via tippecanoe."""
    try:
        produced = tiles_build.build_all()
    except tiles_build.TippecanoeError as exc:
        console.print(f"[red]tiles build: {exc}[/red]")
        raise typer.Exit(1) from exc
    if not produced:
        console.print(
            "[yellow]tiles build: no inputs found under out/interim/. "
            "Run `opendc ingest` first.[/yellow]"
        )
        return
    for path in produced:
        console.print(f"[green]built {path}[/green]")


@tiles_app.command("upload")
def tiles_upload_cmd(
    dry_run: bool = typer.Option(
        False, "--dry-run", help="Print what would be uploaded without calling R2."
    ),
    tiles_dir: Path = typer.Option(
        Path("out/tiles"), "--tiles-dir", help="Directory containing built .pmtiles files."
    ),
) -> None:
    """Upload built PMTiles to Cloudflare R2."""
    paths = sorted(tiles_dir.glob("*.pmtiles"))
    if not paths:
        console.print(
            f"[yellow]tiles upload: no *.pmtiles files in {tiles_dir}. "
            "Run `opendc tiles build` first.[/yellow]"
        )
        return
    try:
        # Dry-run never touches the network; load_config still runs so the
        # caller learns about missing env early.
        config = tiles_upload.load_config()
    except tiles_upload.R2ConfigError as exc:
        console.print(f"[red]tiles upload: {exc}[/red]")
        raise typer.Exit(1) from exc
    lines = tiles_upload.upload_all(paths, config=config, dry_run=dry_run)
    for line in lines:
        console.print(f"[green]{line}[/green]")


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
