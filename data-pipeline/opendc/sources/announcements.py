"""Hand-curated announcements loader.

Reads one YAML file per announcement from ``opendc/data/announcements/``,
validates each row against :class:`opendc.schemas.Announcement`, cross-checks
referenced operators and datacenters against the curated canonical datasets,
and emits a single JSON array sorted newest-first.

The same normalized JSON is written to both the pipeline artifacts dir and the
web app's ``public/seed`` dir so local development can stay file-based while
production reads the published R2 artifact.
"""

from __future__ import annotations

import json
import time
from collections.abc import Iterator
from importlib.resources import files
from pathlib import Path

import yaml
from pydantic import ValidationError

from opendc.operators import load_operators
from opendc.schemas import Announcement
from opendc.sources import curated

ANNOUNCEMENTS_DIR = "announcements"
_REPO_ROOT = Path(__file__).resolve().parents[3]
_DEFAULT_SEED_PATH = _REPO_ROOT / "apps" / "web" / "public" / "seed" / "announcements.json"


class AnnouncementError(ValueError):
    """Raised when an announcement row fails validation."""


def _announcements_dir() -> Path:
    return Path(str(files("opendc.data").joinpath(ANNOUNCEMENTS_DIR)))


def _known_operator_ids() -> frozenset[str]:
    return frozenset(op.id for op in load_operators())


def _known_datacenter_ids() -> frozenset[str]:
    return frozenset(row.id for row in curated.iter_rows())


def _load_yaml(path: Path) -> dict[str, object]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise AnnouncementError(f"{path.name}: expected a YAML object")
    return payload


def _row_id(payload: dict[str, object], path: Path) -> str:
    raw_id = payload.get("id")
    if isinstance(raw_id, str) and raw_id.strip():
        return raw_id
    return path.stem


def _row_to_model(path: Path) -> Announcement:
    payload = _load_yaml(path)
    row_id = _row_id(payload, path)
    try:
        row = Announcement.model_validate(payload)
    except ValidationError as exc:
        raise AnnouncementError(f"{path.name} row {row_id!r}: {exc}") from exc
    if row.operator_id is not None and row.operator_id not in _known_operator_ids():
        raise AnnouncementError(
            f"{path.name} row {row.id!r}: unknown operator {row.operator_id!r}"
        )
    if row.datacenter_id is not None and row.datacenter_id not in _known_datacenter_ids():
        raise AnnouncementError(
            f"{path.name} row {row.id!r}: unknown datacenter {row.datacenter_id!r}"
        )
    return row


def iter_rows(source_dir: Path | None = None) -> Iterator[Announcement]:
    announcements_dir = source_dir or _announcements_dir()
    for path in sorted(announcements_dir.glob("*.yaml")):
        yield _row_to_model(path)


def normalize(
    *,
    source_dir: Path | None = None,
    out_path: Path | None = None,
    seed_path: Path | None = None,
) -> Path:
    out_path = out_path or Path("out/interim/announcements.json")
    seed_path = seed_path or _DEFAULT_SEED_PATH
    seen_ids: set[str] = set()
    rows = list(iter_rows(source_dir))
    for row in rows:
        if row.id in seen_ids:
            raise AnnouncementError(f"duplicate announcement id {row.id!r}")
        seen_ids.add(row.id)
    rows.sort(key=lambda row: (row.date, row.id), reverse=True)
    payload = [row.model_dump() for row in rows]
    serialized = json.dumps(payload, indent=2)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(serialized, encoding="utf-8")
    seed_path.parent.mkdir(parents=True, exist_ok=True)
    seed_path.write_text(serialized, encoding="utf-8")
    return out_path


def run(
    *,
    out_dir: Path = Path("out"),
    source_dir: Path | None = None,
    seed_path: Path | None = None,
) -> tuple[Path, int, float]:
    started = time.monotonic()
    out_path = normalize(
        source_dir=source_dir,
        out_path=out_dir / "interim" / "announcements.json",
        seed_path=seed_path,
    )
    duration = time.monotonic() - started
    row_count = len(json.loads(out_path.read_text(encoding="utf-8")))
    return out_path, row_count, duration
