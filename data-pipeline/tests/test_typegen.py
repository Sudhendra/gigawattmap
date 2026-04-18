"""Tests for the JSON Schema generator that feeds TypeScript codegen."""

from __future__ import annotations

from opendc.typegen import EXPORTED_MODELS, build_schema


def test_build_schema_lists_every_exported_model_under_defs() -> None:
    schema = build_schema()
    defs = schema["$defs"]
    for model in EXPORTED_MODELS:
        assert model.__name__ in defs, f"missing {model.__name__} in $defs"


def test_build_schema_oneof_references_each_model() -> None:
    schema = build_schema()
    refs = {entry["$ref"] for entry in schema["oneOf"]}
    expected = {f"#/$defs/{m.__name__}" for m in EXPORTED_MODELS}
    assert refs == expected


def test_build_schema_inlines_literal_enums() -> None:
    """Literal types must serialise as ``enum`` so TS codegen produces unions.

    This is the subtle bit of pydantic v2 → JSON Schema → TS: if Literals
    do not become ``enum`` arrays the TS output collapses to ``string``.
    """
    schema = build_schema()
    datacenter = schema["$defs"]["Datacenter"]
    tier = datacenter["properties"]["tier"]
    assert tier.get("enum") == [
        "hyperscale",
        "colo",
        "neocloud",
        "enterprise",
    ]


def test_build_schema_is_self_contained() -> None:
    """No ``$ref`` may point outside the composite ``$defs`` block."""
    schema = build_schema()
    defs = set(schema["$defs"].keys())

    def walk(node: object) -> None:
        if isinstance(node, dict):
            ref = node.get("$ref")
            if isinstance(ref, str):
                assert ref.startswith("#/$defs/"), f"external ref: {ref}"
                target = ref.removeprefix("#/$defs/")
                assert target in defs, f"dangling ref: {ref}"
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(schema)
