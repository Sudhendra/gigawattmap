"""Run-manifest: a single JSON file that records what we fetched and when.

Each pipeline source writes a small entry keyed by source name. Downstream
tooling (the web app's ``/about`` page, CI dashboards) reads this to show
data freshness without having to re-derive it from artifact mtimes, which
get clobbered by R2 uploads and CI cache restores.

The file is updated read-modify-write under a process-local lock. We do
not need cross-process locking because the pipeline runs serially in one
container; if that ever changes, swap in ``filelock``.
"""

from __future__ import annotations

import json
import threading
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Process-local guard. The CLI is single-threaded today, but a future
# Typer command that fans out to threads/asyncio shouldn't corrupt the file.
_LOCK = threading.Lock()


@dataclass(frozen=True, slots=True)
class SourceEntry:
    """One row of the manifest, identified by ``source``."""

    source: str
    timestamp: str  # ISO-8601 UTC, e.g. "2025-01-15T18:42:11Z"
    feature_count: int
    duration_s: float
    url: str | None = None
    notes: str | None = None


def _now_iso() -> str:
    """ISO-8601 UTC with trailing ``Z`` — the format Web platform code expects."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_entry(manifest_path: Path, entry: SourceEntry) -> None:
    """Insert/replace ``entry`` in the manifest, creating the file if missing.

    The file is laid out as ``{"sources": {<name>: {...}, ...}, "updated_at": "..."}``
    so future top-level metadata (commit sha, schema version) has a place
    to live without breaking readers.
    """
    with _LOCK:
        if manifest_path.exists():
            data: dict[str, Any] = json.loads(manifest_path.read_text())
        else:
            data = {"sources": {}}
        sources = data.setdefault("sources", {})
        sources[entry.source] = asdict(entry)
        data["updated_at"] = _now_iso()
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(data, indent=2, sort_keys=True))


def make_entry(
    *,
    source: str,
    feature_count: int,
    duration_s: float,
    url: str | None = None,
    notes: str | None = None,
) -> SourceEntry:
    """Convenience constructor that stamps the timestamp at call time."""
    return SourceEntry(
        source=source,
        timestamp=_now_iso(),
        feature_count=feature_count,
        duration_s=round(duration_s, 2),
        url=url,
        notes=notes,
    )
