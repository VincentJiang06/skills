#!/usr/bin/env python3
"""Minimal JSON-Schema validator (stdlib only) for the subset this skill uses.

Supports: type, required, properties, additionalProperties (bool or schema),
items, enum, minimum/maximum/exclusiveMinimum/exclusiveMaximum, minItems, and
local $ref (#/$defs/...). Unknown keywords are ignored. Returns a list of error
strings (empty == valid).
"""
import json


def _type_ok(inst, t):
    return {
        "object": isinstance(inst, dict),
        "array": isinstance(inst, list),
        "string": isinstance(inst, str),
        "integer": isinstance(inst, int) and not isinstance(inst, bool),
        "number": isinstance(inst, (int, float)) and not isinstance(inst, bool),
        "boolean": isinstance(inst, bool),
        "null": inst is None,
    }.get(t, True)


def _resolve_ref(ref, root):
    if not ref.startswith("#/"):
        return {}
    node = root
    for part in ref[2:].split("/"):
        node = node.get(part, {})
    return node


def validate(inst, schema, root=None, path="$"):
    root = root if root is not None else schema
    errs = []
    if "$ref" in schema:
        schema = _resolve_ref(schema["$ref"], root)

    t = schema.get("type")
    if t:
        types = t if isinstance(t, list) else [t]
        if not any(_type_ok(inst, x) for x in types):
            return [f"{path}: expected type {t}, got {type(inst).__name__}"]

    if "enum" in schema and inst not in schema["enum"]:
        errs.append(f"{path}: {inst!r} not in enum {schema['enum']}")

    if isinstance(inst, dict):
        for req in schema.get("required", []):
            if req not in inst:
                errs.append(f"{path}: missing required '{req}'")
        props = schema.get("properties", {})
        addl = schema.get("additionalProperties", True)
        for k, v in inst.items():
            if k in props:
                errs += validate(v, props[k], root, f"{path}.{k}")
            elif addl is False:
                errs.append(f"{path}: unexpected property '{k}'")
            elif isinstance(addl, dict):
                errs += validate(v, addl, root, f"{path}.{k}")

    if isinstance(inst, list):
        if "minItems" in schema and len(inst) < schema["minItems"]:
            errs.append(f"{path}: needs >= {schema['minItems']} items, got {len(inst)}")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for i, el in enumerate(inst):
                errs += validate(el, item_schema, root, f"{path}[{i}]")

    if isinstance(inst, (int, float)) and not isinstance(inst, bool):
        for kw, ok in (
            ("minimum", inst >= schema.get("minimum", inst)),
            ("maximum", inst <= schema.get("maximum", inst)),
            ("exclusiveMinimum", inst > schema.get("exclusiveMinimum", inst - 1)),
            ("exclusiveMaximum", inst < schema.get("exclusiveMaximum", inst + 1)),
        ):
            if kw in schema and not ok:
                errs.append(f"{path}: {inst} violates {kw} {schema[kw]}")

    return errs


def validate_file(inst_path, schema_path):
    with open(inst_path, encoding="utf-8") as f:
        inst = json.load(f)
    with open(schema_path, encoding="utf-8") as f:
        schema = json.load(f)
    return validate(inst, schema)
