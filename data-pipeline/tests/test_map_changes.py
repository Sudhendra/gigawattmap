from copy import deepcopy
from pathlib import Path
from unittest.mock import Mock

import pytest
from pydantic import ValidationError

from opendc.map_changes import compare
from opendc.releases import Release, ReleaseError, publish
from opendc.tiles.upload import R2Config

BASE = "2026-10-25T00:00:00+00:00"
NEXT = "2026-11-01T00:00:00+00:00"


def feature(id: str = "one", **values: object) -> dict[str, object]:
    return {
        "properties": {
            "id": id,
            "name": id,
            "operator": "Unknown",
            "status": None,
            "est_mw_mid": None,
            "sources": ["osm"],
            **values,
        }
    }


def release(
    records: list[dict[str, object]], previous: Release | None = None, now: str = BASE
) -> Release:
    return Release(
        channel="map",
        updated_at=now,
        records=records,
        sources=[],
        changes=compare(previous, records, now),
    )


def test_first_release_and_legacy_snapshot_establish_baseline() -> None:
    rows = [feature(), feature("two")]
    legacy = Release(channel="map", updated_at=BASE, records=rows, sources=[])
    for previous in [None, legacy]:
        history = compare(previous, rows, NEXT)
        assert history.events == []
        assert history.baseline_at == NEXT
        assert history.compared_at is None


def test_addition_and_nullable_field_changes_are_attributed_and_repeat_safe() -> None:
    old = release([feature()])
    rows = [feature(operator="Acme", status="construction", est_mw_mid=100), feature("two")]
    updated = release(rows, old, NEXT)
    assert updated.changes is not None
    events = {event.facility_id: event for event in updated.changes.events}
    assert events["two"].kind == "added"
    assert events["two"].fields == []
    assert events["one"].sources == ["osm"]
    assert [(f.field, f.before, f.after) for f in events["one"].fields] == [
        ("operator", "Unknown", "Acme"),
        ("status", None, "construction"),
        ("est_mw_mid", None, 100),
    ]
    repeated = compare(updated, list(reversed(rows)), "2026-11-02T00:00:00+00:00")
    assert repeated.events == updated.changes.events
    unknown = compare(updated, [feature(), feature("two")], "2026-11-03T00:00:00+00:00")
    assert any(f.field == "est_mw_mid" and f.after is None for f in unknown.events[0].fields)


def test_retention_and_missing_facilities_do_not_claim_closure() -> None:
    old = release([feature()])
    updated = release([feature(), feature("two")], old, NEXT)
    assert compare(updated, [feature()], "2026-11-02T00:00:00+00:00").events == []
    assert compare(updated, updated.records, "2027-03-01T00:00:00+00:00").events == []


def test_history_is_bounded_to_latest_500_events() -> None:
    old = release([feature()])
    result = compare(old, [feature()] + [feature(str(i)) for i in range(501)], NEXT)
    assert len(result.events) == 500
    assert len({event.id for event in result.events}) == 500


@pytest.mark.parametrize(
    "rows",
    [
        [],
        [feature(), feature()],
        [feature(est_mw_mid=-1)],
        [feature(est_mw_mid=float("nan"))],
        [{"properties": {}}],
    ],
)
def test_invalid_comparison_fails(rows: list[dict[str, object]]) -> None:
    with pytest.raises((ReleaseError, ValidationError)):
        compare(release([feature()]), rows, NEXT)


def test_failed_publish_preserves_public_map_and_history(tmp_path: Path) -> None:
    old = release([feature()])
    new = release([feature(), feature("two")], old, NEXT)
    live = old.model_dump_json().encode()
    client = Mock()
    client.put_object.side_effect = RuntimeError("storage unavailable")
    config = R2Config("account", "key", "secret", "bucket", "")
    original = deepcopy(old)
    with pytest.raises(RuntimeError):
        publish(new, out_dir=tmp_path, config=config, client=client)
    assert old == original
    assert old.model_dump_json().encode() == live
    assert client.put_object.call_args.kwargs["Key"].startswith("v1/releases/map/")


def test_map_and_history_are_in_one_atomic_live_write(tmp_path: Path) -> None:
    current = release([feature(), feature("two")], release([feature()]), NEXT)
    client = Mock()
    publish(current, out_dir=tmp_path, config=R2Config("a", "k", "s", "b", ""), client=client)
    writes = client.put_object.call_args_list
    assert len(writes) == 2
    assert writes[1].kwargs["Key"] == "v1/live/map.json"
    restored = Release.model_validate_json(writes[1].kwargs["Body"])
    assert restored.records == current.records
    assert restored.changes == current.changes


def test_final_write_failure_keeps_previous_map_and_history(tmp_path: Path) -> None:
    old = release([feature()])
    new = release([feature(), feature("two")], old, NEXT)
    objects = {"v1/live/map.json": old.model_dump_json().encode()}
    client = Mock()

    def write(**kwargs: object) -> None:
        key, body = kwargs["Key"], kwargs["Body"]
        assert isinstance(key, str) and isinstance(body, bytes)
        if key == "v1/live/map.json":
            raise RuntimeError("live write failed")
        objects[key] = body

    client.put_object.side_effect = write
    with pytest.raises(RuntimeError):
        publish(new, out_dir=tmp_path, config=R2Config("a", "k", "s", "b", ""), client=client)
    assert Release.model_validate_json(objects["v1/live/map.json"]) == old
    assert len(objects) == 2
