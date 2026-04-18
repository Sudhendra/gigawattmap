"""Tests for the Cmd+K search-index builder."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pytest

from opendc.search import build_index


def test_build_corpus_emits_three_sections_with_real_data() -> None:
    """Round-trip the real curated CSVs + announcements YAMLs into one corpus."""
    corpus = build_index.build_corpus()
    # Smoke-check the section shapes.
    assert set(corpus.keys()) == {"datacenters", "operators", "announcements"}
    assert isinstance(corpus["datacenters"], list)
    assert isinstance(corpus["operators"], list)
    assert isinstance(corpus["announcements"], list)
    # Sanity bounds — every section is meaningfully populated.
    assert len(corpus["datacenters"]) >= 50
    assert len(corpus["operators"]) >= 30
    assert len(corpus["announcements"]) >= 10


def test_datacenter_entries_carry_searchable_fields() -> None:
    """Headline campus surfaces all fields the palette joins on."""
    corpus = build_index.build_corpus()
    by_id = {row["id"]: row for row in corpus["datacenters"]}
    abilene = by_id["crusoe-abilene-tx"]
    # The TS SearchableDatacenter contract — match it exactly so the
    # client's Fuse weighting works without per-row coercion.
    assert abilene["name"] == "Stargate I — Abilene"
    assert abilene["operator"] == "crusoe"
    # Operator display name comes from operators.csv — keep this in sync with
    # that file rather than hand-coding the canonical name here.
    assert abilene["operator_name"] == "Crusoe Energy"
    assert abilene["tenant"] == "openai"
    assert abilene["country"] == "US"
    assert abilene["region"] == "US-TX"
    # No extra keys leak through — keeps the payload small and the
    # client contract honest.
    assert set(abilene.keys()) == {
        "id",
        "name",
        "operator",
        "operator_name",
        "tenant",
        "city",
        "region",
        "country",
    }


def test_operator_entries_carry_aliases_and_facility_count() -> None:
    """`facility_count` is computed from ai-campuses.csv, not hand-maintained."""
    corpus = build_index.build_corpus()
    by_id = {row["id"]: row for row in corpus["operators"]}
    crusoe = by_id["crusoe"]
    assert crusoe["name"] == "Crusoe Energy"
    assert isinstance(crusoe["aliases"], list)
    # crusoe owns at least the Abilene + Shackelford campuses in the seed.
    assert crusoe["facility_count"] >= 2
    assert set(crusoe.keys()) == {"id", "name", "aliases", "ticker", "facility_count"}


def test_announcement_entries_carry_title_summary_date_category() -> None:
    """The palette renders title + date; summary feeds Fuse for body matches."""
    corpus = build_index.build_corpus()
    sample = corpus["announcements"][0]
    assert set(sample.keys()) == {"id", "title", "summary", "date", "category"}
    assert sample["date"] != ""
    # Summary may be empty string when the YAML omits it; never None so the
    # Fuse key always sees a string.
    assert isinstance(sample["summary"], str)


def test_normalize_writes_index_json(tmp_path: Path) -> None:
    """End-to-end: the writer drops a parseable JSON artifact."""
    out_path = tmp_path / "search-index.json"
    written = build_index.normalize(out_path=out_path)
    assert written == out_path
    payload = json.loads(out_path.read_text(encoding="utf-8"))
    assert "datacenters" in payload
    assert "operators" in payload
    assert "announcements" in payload
    # Soft size budget: full corpus must fit in the 500 KB envelope from
    # the task spec.
    assert out_path.stat().st_size < 500_000
