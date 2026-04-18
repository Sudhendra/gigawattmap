"""Tests for the hand-curated announcements loader."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pytest

from opendc.sources import announcements


def _write_yaml(path: Path, body: str) -> None:
    path.write_text(textwrap.dedent(body).strip() + "\n", encoding="utf-8")


def test_iter_rows_yields_validated_models(tmp_path: Path) -> None:
    source_dir = tmp_path / "announcements"
    source_dir.mkdir()
    _write_yaml(
        source_dir / "2026-04-15-meta-richland.yaml",
        """
        id: 2026-04-15-meta-richland
        date: 2026-04-15
        title: Meta breaks ground on Richland phase II
        category: launch
        amount_usd: 1500000000
        operator_id: meta
        datacenter_id: meta-richland-parish
        source_url: https://example.com/meta-richland
        summary: |
          Meta disclosed a second Richland phase.
          The buildout expands the operator's Washington footprint.
        """,
    )

    rows = list(announcements.iter_rows(source_dir))
    assert len(rows) == 1
    row = rows[0]
    assert row.id == "2026-04-15-meta-richland"
    assert row.category == "launch"
    assert row.operator_id == "meta"
    assert row.datacenter_id == "meta-richland-parish"
    assert row.summary is not None
    assert row.summary.startswith("Meta disclosed")


def test_normalize_writes_sorted_json_and_seed_copy(tmp_path: Path) -> None:
    source_dir = tmp_path / "announcements"
    source_dir.mkdir()
    _write_yaml(
        source_dir / "2026-04-15-meta-richland.yaml",
        """
        id: 2026-04-15-meta-richland
        date: 2026-04-15
        title: Meta breaks ground on Richland phase II
        category: launch
        operator_id: meta
        datacenter_id: meta-richland-parish
        source_url: https://example.com/meta-richland
        summary: |
          Meta disclosed a second Richland phase.
        """,
    )
    _write_yaml(
        source_dir / "2026-05-01-talen-susquehanna.yaml",
        """
        id: 2026-05-01-talen-susquehanna
        date: 2026-05-01
        title: Talen expands Amazon nuclear arrangement
        category: deal
        amount_usd: 18000000000
        operator_id: talen
        datacenter_id: talen-susquehanna-pa
        source_url: https://example.com/talen-susquehanna
        summary: |
          Talen disclosed an expanded arrangement with Amazon.
        """,
    )

    out_path = tmp_path / "out" / "interim" / "announcements.json"
    seed_path = tmp_path / "web" / "public" / "seed" / "announcements.json"
    written = announcements.normalize(source_dir=source_dir, out_path=out_path, seed_path=seed_path)

    assert written == out_path
    payload = json.loads(out_path.read_text())
    assert [entry["id"] for entry in payload] == [
        "2026-05-01-talen-susquehanna",
        "2026-04-15-meta-richland",
    ]
    assert json.loads(seed_path.read_text()) == payload


def test_invalid_date_rejected(tmp_path: Path) -> None:
    source_dir = tmp_path / "announcements"
    source_dir.mkdir()
    _write_yaml(
        source_dir / "bad-date.yaml",
        """
        id: bad-date
        date: 04/15/2026
        title: Bad date
        category: policy
        source_url: https://example.com/policy
        summary: |
          Date is not ISO 8601.
        """,
    )

    with pytest.raises(announcements.AnnouncementError, match="bad-date"):
        list(announcements.iter_rows(source_dir))


def test_unknown_operator_rejected(tmp_path: Path) -> None:
    source_dir = tmp_path / "announcements"
    source_dir.mkdir()
    _write_yaml(
        source_dir / "unknown-operator.yaml",
        """
        id: unknown-operator
        date: 2026-04-15
        title: Unknown operator
        category: milestone
        operator_id: no-such-operator
        source_url: https://example.com/operator
        summary: |
          Operator ids must match operators.csv.
        """,
    )

    with pytest.raises(announcements.AnnouncementError, match="unknown operator"):
        list(announcements.iter_rows(source_dir))


def test_unknown_datacenter_rejected(tmp_path: Path) -> None:
    source_dir = tmp_path / "announcements"
    source_dir.mkdir()
    _write_yaml(
        source_dir / "unknown-datacenter.yaml",
        """
        id: unknown-datacenter
        date: 2026-04-15
        title: Unknown datacenter
        category: launch
        datacenter_id: no-such-campus
        source_url: https://example.com/datacenter
        summary: |
          Datacenter ids must match ai-campuses.csv.
        """,
    )

    with pytest.raises(announcements.AnnouncementError, match="unknown datacenter"):
        list(announcements.iter_rows(source_dir))


def test_run_returns_count_and_duration(tmp_path: Path) -> None:
    source_dir = tmp_path / "announcements"
    source_dir.mkdir()
    _write_yaml(
        source_dir / "2026-04-15-meta-richland.yaml",
        """
        id: 2026-04-15-meta-richland
        date: 2026-04-15
        title: Meta breaks ground on Richland phase II
        category: launch
        operator_id: meta
        datacenter_id: meta-richland-parish
        source_url: https://example.com/meta-richland
        summary: |
          Meta disclosed a second Richland phase.
        """,
    )

    out_path, count, duration = announcements.run(
        out_dir=tmp_path / "artifacts",
        source_dir=source_dir,
        seed_path=tmp_path / "web" / "public" / "seed" / "announcements.json",
    )
    assert out_path.exists()
    assert count == 1
    assert duration >= 0.0


def test_duplicate_ids_rejected(tmp_path: Path) -> None:
    source_dir = tmp_path / "announcements"
    source_dir.mkdir()
    _write_yaml(
        source_dir / "first.yaml",
        """
        id: duplicate-id
        date: 2026-04-15
        title: First row
        category: launch
        source_url: https://example.com/first
        summary: |
          First row.
        """,
    )
    _write_yaml(
        source_dir / "second.yaml",
        """
        id: duplicate-id
        date: 2026-04-16
        title: Second row
        category: deal
        source_url: https://example.com/second
        summary: |
          Second row.
        """,
    )

    with pytest.raises(announcements.AnnouncementError, match="duplicate announcement id"):
        announcements.normalize(source_dir=source_dir, out_path=tmp_path / "out.json")
