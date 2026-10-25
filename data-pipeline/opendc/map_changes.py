"""Compare validated facility snapshots; publish history with the map, never separately."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict

from opendc.releases import Release, ReleaseError
from opendc.schemas import DatasetChange, DatasetFieldChange, MapChanges

FIELDS: tuple[Literal["operator", "status", "est_mw_mid"], ...] = (
    "operator",
    "status",
    "est_mw_mid",
)


class Properties(BaseModel):
    model_config = ConfigDict(strict=True, allow_inf_nan=False)
    id: str
    name: str
    operator: str
    status: Literal["operational", "construction", "announced", "blocked"] | None
    est_mw_mid: float | None
    sources: list[str]


def index(records: list[dict[str, object]]) -> dict[str, Properties]:
    result: dict[str, Properties] = {}
    for record in records:
        props = Properties.model_validate(record.get("properties"))
        if (
            not props.id
            or props.id in result
            or (props.est_mw_mid is not None and props.est_mw_mid < 0)
        ):
            raise ReleaseError("Invalid or duplicate facility in change comparison")
        result[props.id] = props
    if not result:
        raise ReleaseError("Cannot compare an empty map")
    return result


def timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ReleaseError("Change timestamps must have a timezone")
    return parsed.astimezone(UTC)


def compare(previous: Release | None, records: list[dict[str, object]], now: str) -> MapChanges:
    current = index(records)
    checked = timestamp(now)
    # An older release without history is a baseline, not thousands of discoveries.
    if previous is None or previous.changes is None:
        return MapChanges(baseline_at=now, compared_at=None, events=[])
    if previous.channel != "map" or timestamp(previous.updated_at) > checked:
        raise ReleaseError("Invalid previous map timestamp or channel")
    old = index(previous.records)
    history = previous.changes
    if timestamp(history.baseline_at) > checked:
        raise ReleaseError("Invalid history baseline")
    events = []
    for event in history.events:
        detected = timestamp(event.detected_at)
        if detected > checked:
            raise ReleaseError("Future change event")
        if detected >= checked - timedelta(days=90) and event.facility_id in current:
            events.append(event)
    for facility_id, props in sorted(current.items()):
        before = old.get(facility_id)
        fields = []
        if before is not None:
            for field in FIELDS:
                left, right = getattr(before, field), getattr(props, field)
                if left != right:
                    fields.append(DatasetFieldChange(field=field, before=left, after=right))
            if not fields:
                continue
        identity = f"{now}:{facility_id}"
        events.append(
            DatasetChange(
                id=hashlib.sha256(identity.encode()).hexdigest()[:24],
                facility_id=facility_id,
                facility_name=props.name,
                kind="added" if before is None else "updated",
                detected_at=now,
                sources=props.sources,
                fields=fields,
            )
        )
    events.sort(key=lambda event: (timestamp(event.detected_at), event.id), reverse=True)
    return MapChanges(
        baseline_at=history.baseline_at, compared_at=previous.updated_at, events=events[:500]
    )
