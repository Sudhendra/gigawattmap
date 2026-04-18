"""Behavior tests for opendc.sources.gem._resolve_snapshot.

Resolution order (priority high -> low):
1. ``GEM_GIPT_PATH`` env var (raises if it points to a missing path)
2. exact ``out/raw/gem-latest.xlsx``
3. exact ``out/raw/gem-latest.csv``
4. glob ``out/raw/gem-latest*.xlsx`` (newest mtime wins)
5. glob ``out/raw/gem-latest*.csv`` (newest mtime wins)

We keep the dated-snapshot convenience (``gem-latest-March-2026.xlsx``)
so a human can drop a download in without renaming. .xlsx beats .csv at
the same priority because GEM's primary release format is xlsx.
"""

from __future__ import annotations

import os
import time
from collections.abc import Iterator
from pathlib import Path

import pytest

from opendc.sources.gem import DataSourceError, _resolve_snapshot


@pytest.fixture()
def in_tmp_cwd(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Run each test in a fresh CWD so relative ``out/raw/`` lookups are isolated."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("GEM_GIPT_PATH", raising=False)
    (tmp_path / "out" / "raw").mkdir(parents=True)
    yield tmp_path


def _same_file(a: Path, b: Path) -> bool:
    """Compare paths regardless of relative-vs-absolute form."""
    return a.resolve() == b.resolve()


def test_env_var_takes_precedence(in_tmp_cwd: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    custom = in_tmp_cwd / "custom.xlsx"
    custom.write_bytes(b"x")
    # Even if a default-named file exists, env var wins.
    (in_tmp_cwd / "out" / "raw" / "gem-latest.xlsx").write_bytes(b"y")
    monkeypatch.setenv("GEM_GIPT_PATH", str(custom))
    assert _same_file(_resolve_snapshot(), custom)


def test_env_var_missing_path_raises(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("GEM_GIPT_PATH", str(tmp_path / "nope.xlsx"))
    with pytest.raises(DataSourceError, match="does not exist"):
        _resolve_snapshot()


def test_exact_xlsx_preferred_over_exact_csv(in_tmp_cwd: Path) -> None:
    xlsx = in_tmp_cwd / "out" / "raw" / "gem-latest.xlsx"
    csv = in_tmp_cwd / "out" / "raw" / "gem-latest.csv"
    xlsx.write_bytes(b"x")
    csv.write_bytes(b"c")
    assert _same_file(_resolve_snapshot(), xlsx)


def test_exact_csv_used_when_xlsx_missing(in_tmp_cwd: Path) -> None:
    csv = in_tmp_cwd / "out" / "raw" / "gem-latest.csv"
    csv.write_bytes(b"c")
    assert _same_file(_resolve_snapshot(), csv)


def test_dated_xlsx_glob_when_no_exact(in_tmp_cwd: Path) -> None:
    """The user dropped ``gem-latest-March-2026.xlsx`` without renaming."""
    target = in_tmp_cwd / "out" / "raw" / "gem-latest-March-2026.xlsx"
    target.write_bytes(b"x")
    assert _same_file(_resolve_snapshot(), target)


def test_dated_csv_glob_when_no_xlsx(in_tmp_cwd: Path) -> None:
    target = in_tmp_cwd / "out" / "raw" / "gem-latest-2026Q1.csv"
    target.write_bytes(b"c")
    assert _same_file(_resolve_snapshot(), target)


def test_dated_xlsx_beats_dated_csv(in_tmp_cwd: Path) -> None:
    csv = in_tmp_cwd / "out" / "raw" / "gem-latest-2026.csv"
    xlsx = in_tmp_cwd / "out" / "raw" / "gem-latest-2026.xlsx"
    csv.write_bytes(b"c")
    xlsx.write_bytes(b"x")
    assert _same_file(_resolve_snapshot(), xlsx)


def test_newest_mtime_wins_among_dated_xlsx(in_tmp_cwd: Path) -> None:
    older = in_tmp_cwd / "out" / "raw" / "gem-latest-2025.xlsx"
    newer = in_tmp_cwd / "out" / "raw" / "gem-latest-2026.xlsx"
    older.write_bytes(b"o")
    newer.write_bytes(b"n")
    # Force a clearly older mtime on `older` so the test is deterministic.
    old_ts = time.time() - 86_400
    os.utime(older, (old_ts, old_ts))
    assert _same_file(_resolve_snapshot(), newer)


def test_exact_match_beats_dated_glob(in_tmp_cwd: Path) -> None:
    exact = in_tmp_cwd / "out" / "raw" / "gem-latest.xlsx"
    dated = in_tmp_cwd / "out" / "raw" / "gem-latest-2026.xlsx"
    exact.write_bytes(b"e")
    dated.write_bytes(b"d")
    assert _same_file(_resolve_snapshot(), exact)


def test_no_snapshot_raises_with_helpful_message(in_tmp_cwd: Path) -> None:
    with pytest.raises(DataSourceError, match="No GEM snapshot"):
        _resolve_snapshot()
