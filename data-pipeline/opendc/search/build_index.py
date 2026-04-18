"""Build the compact JSON corpus consumed by the Cmd+K palette.

The web client (``apps/web/src/lib/search.ts``) feeds three Fuse.js indexes:
datacenters, operators, and announcements. The shape of each row is the TS
``Searchable*`` type — duplicated here as a runtime contract so a drift in
either side fails a test loudly instead of silently degrading search quality.

Why a separate corpus rather than reusing the GeoJSON / announcements JSON
already on R2?
- The map tiles carry geometry + 15 enrichment fields per row; the palette
  only needs ~7. Stripping at build time keeps the cold-open payload under
  the 500 KB budget called out in ``tasks/022-search.md``.
- The search payload is denormalized (operator id → operator display name)
  so the client never has to join across files at runtime.
"""

from __future__ import annotations

import json
import time
from collections import Counter
from pathlib import Path
from typing import Any

from opendc.operators import load_operators
from opendc.sources import announcements as announcements_source
from opendc.sources import curated

# The TS contract — keep these in lock-step with ``apps/web/src/lib/search.ts``.
# Tests assert ``set(row.keys()) ==`` these so an accidental extra field is a
# loud failure rather than a silent bundle-size regression.
DATACENTER_KEYS: frozenset[str] = frozenset(
    {
        "id",
        "name",
        "operator",
        "operator_name",
        "tenant",
        "city",
        "region",
        "country",
    }
)
OPERATOR_KEYS: frozenset[str] = frozenset(
    {"id", "name", "aliases", "ticker", "facility_count"}
)
ANNOUNCEMENT_KEYS: frozenset[str] = frozenset(
    {"id", "title", "summary", "date", "category"}
)


def _operator_name_lookup() -> dict[str, str]:
    """Build operator-id → display-name map once per call."""
    return {op.id: op.name for op in load_operators()}


def _build_datacenter_rows() -> list[dict[str, Any]]:
    """Project curated campuses into the compact searchable shape.

    ``city`` is intentionally ``None`` — the curated CSV doesn't carry a city
    column today (region + country are sufficient for the seed dataset). When
    the field is added, this is the only place that needs to read it.
    """
    name_by_id = _operator_name_lookup()
    rows: list[dict[str, Any]] = []
    for row in curated.iter_rows():
        rows.append(
            {
                "id": row.id,
                "name": row.name,
                "operator": row.operator,
                "operator_name": name_by_id.get(row.operator),
                "tenant": row.tenant,
                # No city column on ai-campuses.csv yet; the palette renders
                # region + country instead. Keep the key present so the TS
                # contract stays satisfied.
                "city": None,
                "region": row.region,
                "country": row.country,
            }
        )
    return rows


def _build_operator_rows() -> list[dict[str, Any]]:
    """Emit one row per curated operator with a derived facility count.

    ``facility_count`` is computed from ``ai-campuses.csv`` rather than
    hand-maintained — every campus row already references its operator by id,
    so the count stays correct without a second source of truth.
    """
    facility_counts = Counter(row.operator for row in curated.iter_rows())
    rows: list[dict[str, Any]] = []
    for op in load_operators():
        rows.append(
            {
                "id": op.id,
                "name": op.name,
                # Convert the immutable tuple to a list — JSON has no tuple
                # type, and the TS side expects ``string[]``.
                "aliases": list(op.aliases),
                "ticker": op.ticker,
                "facility_count": facility_counts.get(op.id, 0),
            }
        )
    return rows


def _build_announcement_rows() -> list[dict[str, Any]]:
    """Stream announcements through the curated YAML loader.

    ``summary`` is coerced to an empty string when the source omits it so the
    Fuse key always sees a string (Fuse otherwise treats missing keys as no
    match, which is what we want, but explicit is safer than implicit).
    """
    rows: list[dict[str, Any]] = []
    for row in announcements_source.iter_rows():
        rows.append(
            {
                "id": row.id,
                "title": row.title,
                "summary": row.summary or "",
                # ``date`` is already an ISO string per the Announcement schema
                # (kept as string upstream so YAML round-trips losslessly).
                "date": row.date,
                "category": row.category,
            }
        )
    return rows


def build_corpus() -> dict[str, list[dict[str, Any]]]:
    """Build the full three-section corpus in memory."""
    return {
        "datacenters": _build_datacenter_rows(),
        "operators": _build_operator_rows(),
        "announcements": _build_announcement_rows(),
    }


def normalize(out_path: Path | None = None) -> Path:
    """Write the corpus to ``out_path`` as compact JSON.

    Compact (no indentation) because the file ships to the browser and every
    byte counts toward the 500 KB envelope. Pretty-printing is reserved for
    the per-source GeoJSONs that humans actually read.
    """
    out_path = out_path or Path("out/interim/search-index.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    corpus = build_corpus()
    out_path.write_text(
        json.dumps(corpus, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )
    return out_path


def run(*, out_dir: Path = Path("out")) -> tuple[Path, int, float]:
    """CLI entry point — mirrors the ``(path, count, duration)`` shape of
    every other source so the manifest writer stays uniform."""
    started = time.monotonic()
    out_path = normalize(out_dir / "interim" / "search-index.json")
    duration = time.monotonic() - started
    payload = json.loads(out_path.read_text(encoding="utf-8"))
    total = sum(len(payload[key]) for key in payload)
    return out_path, total, duration
