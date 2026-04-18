"""Emit a single composite JSON Schema covering every public Pydantic model.

The output is consumed by ``json-schema-to-typescript`` to generate
``packages/types/src/generated/schema.ts``. Keeping this in one composite
schema (rather than one file per model) means cross-references resolve
through the same ``$defs`` block — the TS output stays a single tidy
module that downstream code imports types from by name.

Design notes:

- We hand-pick the exported models rather than walking ``opendc.schemas``
  reflectively. New models are deliberate API decisions; an explicit list
  forces a code change (and therefore review) when surface area grows.
- Pydantic v2's ``model_json_schema`` already inlines ``$defs`` for nested
  models, which is exactly what json-schema-to-typescript prefers.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from opendc.schemas import (
    Announcement,
    Cable,
    CableLanding,
    Datacenter,
    Operator,
    PowerPlant,
)

# Models exposed to TypeScript consumers. Order is alphabetical so the
# generated TS file has a stable, diff-friendly layout.
EXPORTED_MODELS: tuple[type[BaseModel], ...] = (
    Announcement,
    Cable,
    CableLanding,
    Datacenter,
    Operator,
    PowerPlant,
)


def build_schema() -> dict[str, Any]:
    """Return a composite JSON Schema with every exported model under ``$defs``.

    The top-level schema's ``oneOf`` lists every model so generators that
    walk the root rather than ``$defs`` still produce a type per model.
    """
    defs: dict[str, Any] = {}
    one_of: list[dict[str, str]] = []
    for model in EXPORTED_MODELS:
        sub = model.model_json_schema(ref_template="#/$defs/{model}")
        # Pydantic emits the model itself plus any nested models under
        # its own "$defs"; flatten everything into one shared bucket so
        # references stay valid in the composite document.
        nested = sub.pop("$defs", {})
        defs.update(nested)
        defs[model.__name__] = sub
        one_of.append({"$ref": f"#/$defs/{model.__name__}"})
    return {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "GigawattMapSchemas",
        "description": (
            "Generated from data-pipeline/opendc/schemas.py. "
            "Do not edit by hand — run `make gen-types`."
        ),
        "$defs": defs,
        "oneOf": one_of,
    }
