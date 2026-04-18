"""Top-level Typer CLI.

Each command is a thin shell in v0.1 — the real work lands in tasks 010
through 014. We declare them now so the rest of the pipeline (Makefile,
docs, deploy scripts) can wire against a stable command surface.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import typer
from rich.console import Console

from opendc import __version__, typegen
from opendc.manifest import make_entry, write_entry
from opendc.sources import announcements as announcements_source
from opendc.sources import cloud_regions as cloud_regions_source
from opendc.sources import curated as curated_source
from opendc.sources import gem as gem_source
from opendc.sources import opposition as opposition_source
from opendc.sources import osm as osm_source
from opendc.sources import osm_power as osm_power_source
from opendc.sources import telegeography as tg_source
from opendc.tiles import build as tiles_build
from opendc.tiles import upload as tiles_upload
from opendc.transform import enrich_substations as enrich_substations_transform
from opendc.transform import merge as merge_transform

# Repo root resolved from this file rather than CWD so `opendc gen-types`
# works regardless of where the user invokes it from.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_TYPES_GENERATED_DIR = _REPO_ROOT / "packages" / "types" / "src" / "generated"

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
    if source not in {
        "osm",
        "osm-power",
        "gem",
        "telegeography",
        "curated",
        "announcements",
        "cloud-regions",
        "opposition",
        "all",
    }:
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
    if source in {"osm-power", "all"}:
        console.print(
            f"[cyan]Fetching OSM power infrastructure"
            f"{' (sample=CONUS)' if sample else ''}...[/cyan]"
        )
        op_path, op_count, op_duration = osm_power_source.run(
            sample=sample, out_dir=out_dir
        )
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="osm-power",
                feature_count=op_count,
                duration_s=op_duration,
                url=osm_power_source.OVERPASS_URL,
                notes="sample=CONUS" if sample else None,
            ),
        )
        console.print(
            f"[green]wrote {op_path} ({op_count} features, {op_duration:.1f}s)[/green]"
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
    if source in {"curated", "all"}:
        console.print("[cyan]Loading curated AI campuses...[/cyan]")
        try:
            curated_path, curated_count, curated_duration = curated_source.run(out_dir=out_dir)
        except curated_source.CuratedCampusError as exc:
            console.print(f"[red]curated: {exc}[/red]")
            if source == "curated":
                raise typer.Exit(1) from exc
            return
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="curated-ai-campuses",
                feature_count=curated_count,
                duration_s=curated_duration,
                url="opendc/data/ai-campuses.csv",
                notes="hand-curated; see CSV row source_url for per-row citations",
            ),
        )
        console.print(
            f"[green]wrote {curated_path} ({curated_count} features, "
            f"{curated_duration:.2f}s)[/green]"
        )
    if source in {"announcements", "all"}:
        console.print("[cyan]Loading curated announcements feed...[/cyan]")
        try:
            announcements_path, announcements_count, announcements_duration = announcements_source.run(
                out_dir=out_dir
            )
        except announcements_source.AnnouncementError as exc:
            console.print(f"[red]announcements: {exc}[/red]")
            if source == "announcements":
                raise typer.Exit(1) from exc
            return
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="announcements",
                feature_count=announcements_count,
                duration_s=announcements_duration,
                url="opendc/data/announcements/*.yaml",
                notes="hand-curated YAML; uploaded as v1/announcements.json",
            ),
        )
        console.print(
            f"[green]wrote {announcements_path} ({announcements_count} rows, "
            f"{announcements_duration:.2f}s)[/green]"
        )
    if source in {"cloud-regions", "all"}:
        console.print("[cyan]Loading curated cloud provider regions...[/cyan]")
        try:
            cr_path, cr_count, cr_duration = cloud_regions_source.run(out_dir=out_dir)
        except cloud_regions_source.CloudRegionError as exc:
            console.print(f"[red]cloud-regions: {exc}[/red]")
            if source == "cloud-regions":
                raise typer.Exit(1) from exc
            return
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="cloud-regions",
                feature_count=cr_count,
                duration_s=cr_duration,
                url="opendc/data/cloud-regions.json",
                notes=(
                    "hand-curated metro-area centroids; per-row source_url cites "
                    "provider region docs"
                ),
            ),
        )
        console.print(
            f"[green]wrote {cr_path} ({cr_count} features, {cr_duration:.2f}s)[/green]"
        )
    if source in {"opposition", "all"}:
        console.print(
            "[cyan]Fetching datacenter-opposition-tracker (CC BY 4.0)...[/cyan]"
        )
        try:
            op_path, op_count, op_duration = opposition_source.run(out_dir=out_dir)
        except opposition_source.OppositionError as exc:
            console.print(f"[red]opposition: {exc}[/red]")
            if source == "opposition":
                raise typer.Exit(1) from exc
            return
        write_entry(
            out_dir / "manifest.json",
            make_entry(
                source="opposition-fights",
                feature_count=op_count,
                duration_s=op_duration,
                url=opposition_source.UPSTREAM_URL,
                notes=opposition_source.LICENSE_NOTE,
            ),
        )
        console.print(
            f"[green]wrote {op_path} ({op_count} features, {op_duration:.2f}s)[/green]"
        )


@app.command()
def transform(
    out_dir: Path = typer.Option(Path("out"), "--out-dir", help="Artifact root."),
) -> None:
    """Merge curated + OSM into a single datacenters FeatureCollection.

    Reads ``out/interim/curated-ai-campuses.geojson`` (from
    ``opendc ingest curated``) and ``out/interim/osm-datacenters.geojson``
    (from ``opendc ingest osm``); writes
    ``out/interim/datacenters-merged.geojson``.
    """
    console.print("[cyan]Merging curated + OSM datacenter features...[/cyan]")
    result = merge_transform.run(out_dir=out_dir)
    write_entry(
        out_dir / "manifest.json",
        make_entry(
            source="datacenters-merged",
            feature_count=
                result.merged_count + result.standalone_curated_count + result.osm_only_count,
            duration_s=0.0,
            url=str(result.out_path),
            notes=(
                f"merged={result.merged_count} "
                f"standalone_curated={result.standalone_curated_count} "
                f"osm_only={result.osm_only_count}"
            ),
        ),
    )
    console.print(
        f"[green]wrote {result.out_path} "
        f"(merged={result.merged_count} "
        f"standalone_curated={result.standalone_curated_count} "
        f"osm_only={result.osm_only_count})[/green]"
    )


@app.command()
def enrich(
    out_dir: Path = typer.Option(Path("out"), "--out-dir", help="Artifact root."),
    datacenters: Path = typer.Option(
        Path("out/interim/datacenters-merged.geojson"),
        "--datacenters",
        help="Input datacenters GeoJSON (output of `opendc transform`).",
    ),
    substations: Path = typer.Option(
        Path("out/interim/osm-power.geojson"),
        "--substations",
        help="Input OSM power GeoJSON (output of `opendc ingest osm-power`).",
    ),
) -> None:
    """Attach nearest-substation properties to datacenter features.

    Writes ``out/interim/datacenters-enriched.geojson`` with three new
    properties per feature: ``nearest_substation_id``,
    ``nearest_substation_distance_km`` (rounded to 0.1, max 10 km), and
    ``nearest_substation_voltage_kv``.
    """
    if not datacenters.exists():
        console.print(f"[red]enrich: missing {datacenters}. Run `opendc transform` first.[/red]")
        raise typer.Exit(1)
    if not substations.exists():
        console.print(
            f"[red]enrich: missing {substations}. Run `opendc ingest osm-power` first.[/red]"
        )
        raise typer.Exit(1)
    out_path = out_dir / "interim" / "datacenters-enriched.geojson"
    console.print("[cyan]Enriching datacenters with substation proximity...[/cyan]")
    enrich_substations_transform.enrich_datacenters(
        datacenters, substations, out_path=out_path
    )
    feature_count = len(json.loads(out_path.read_text())["features"])
    write_entry(
        out_dir / "manifest.json",
        make_entry(
            source="datacenters-enriched",
            feature_count=feature_count,
            duration_s=0.0,
            url=str(out_path),
            notes="nearest substation within 10km from osm power=substation",
        ),
    )
    console.print(f"[green]wrote {out_path} ({feature_count} features)[/green]")


tiles_app = typer.Typer(
    name="tiles",
    help="Build and upload PMTiles archives.",
    no_args_is_help=True,
)
app.add_typer(tiles_app, name="tiles")

data_app = typer.Typer(
    name="data",
    help="Upload static JSON data artifacts.",
    no_args_is_help=True,
)
app.add_typer(data_app, name="data")


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


@data_app.command("upload")
def data_upload_cmd(
    dry_run: bool = typer.Option(
        False, "--dry-run", help="Print what would be uploaded without calling R2."
    ),
    artifact: Path = typer.Option(
        Path("out/interim/announcements.json"),
        "--artifact",
        help="Static JSON artifact to upload.",
    ),
) -> None:
    """Upload a static JSON artifact to Cloudflare R2."""
    if not artifact.exists():
        console.print(
            f"[yellow]data upload: missing {artifact}. Run `opendc ingest announcements` first.[/yellow]"
        )
        return
    try:
        config = tiles_upload.load_config()
    except tiles_upload.R2ConfigError as exc:
        console.print(f"[red]data upload: {exc}[/red]")
        raise typer.Exit(1) from exc
    line = tiles_upload.upload_one(
        artifact,
        config,
        dry_run=dry_run,
        content_type="application/json",
    )
    console.print(f"[green]{line}[/green]")


@app.command()
def upload() -> None:
    """Upload built artifacts to R2 / object storage."""
    _stub("upload")


@app.command()
def version() -> None:
    """Print the pipeline version."""
    console.print(__version__)


@app.command("gen-types")
def gen_types(
    out_dir: Path = typer.Option(
        _TYPES_GENERATED_DIR,
        "--out-dir",
        help="Destination for schema.json and schema.ts.",
    ),
    skip_ts: bool = typer.Option(
        False,
        "--skip-ts",
        help="Write schema.json only; skip the json-schema-to-typescript pass.",
    ),
) -> None:
    """Emit JSON Schema from Pydantic models and codegen TypeScript types.

    Writes ``<out_dir>/schema.json`` then shells out to
    ``json-schema-to-typescript`` (via the workspace pnpm install) to
    produce ``<out_dir>/schema.ts``. Both files are committed so TypeScript
    consumers do not need a Python toolchain.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    schema = typegen.build_schema()
    schema_path = out_dir / "schema.json"
    # Trailing newline keeps POSIX-friendly tools (and most linters) happy
    # and avoids "no newline at end of file" diffs after every regeneration.
    schema_path.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")
    console.print(f"[green]wrote {schema_path}[/green]")
    if skip_ts:
        return
    ts_path = out_dir / "schema.ts"
    pnpm = shutil.which("pnpm")
    if pnpm is None:
        console.print(
            "[red]gen-types: pnpm not found on PATH; install pnpm or pass --skip-ts[/red]"
        )
        raise typer.Exit(1)
    # `pnpm exec` runs the workspace-installed binary (declared as a
    # devDependency on @gigawattmap/types) so contributors don't need a
    # global json-schema-to-typescript install.
    cmd = [
        pnpm,
        "--filter",
        "@gigawattmap/types",
        "exec",
        "json2ts",
        "--input",
        str(schema_path),
        "--output",
        str(ts_path),
        "--bannerComment",
        (
            "/* eslint-disable */\n"
            "// AUTO-GENERATED by `opendc gen-types`.\n"
            "// Do not edit by hand — regenerate via `make gen-types`.\n"
        ),
    ]
    result = subprocess.run(cmd, cwd=_REPO_ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        console.print(f"[red]gen-types: json2ts failed[/red]\n{result.stderr}")
        raise typer.Exit(result.returncode)
    console.print(f"[green]wrote {ts_path}[/green]")


if __name__ == "__main__":  # pragma: no cover — entry-point dispatch
    app()
