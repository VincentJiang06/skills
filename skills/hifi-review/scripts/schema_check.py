#!/usr/bin/env python3
"""Minimal stdlib JSON-Schema (draft-07 subset) validator. No external deps."""
import json


def validate(inst, schema, path="$"):
    errs = []
    t = schema.get("type")
    if "enum" in schema and inst not in schema["enum"]:
        errs.append(f"{path}: {inst!r} not in enum {schema['enum']}")
    if "const" in schema and inst != schema["const"]:
        errs.append(f"{path}: {inst!r} != const {schema['const']!r}")
    if t == "object" or (t is None and isinstance(inst, dict) and "properties" in schema):
        if not isinstance(inst, dict):
            return errs + [f"{path}: expected object, got {type(inst).__name__}"]
        for r in schema.get("required", []):
            if r not in inst:
                errs.append(f"{path}: missing required '{r}'")
        props = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for k in inst:
                if k not in props:
                    errs.append(f"{path}: unexpected property '{k}'")
        for k, v in inst.items():
            if k in props:
                errs += validate(v, props[k], f"{path}.{k}")
    elif t == "array":
        if not isinstance(inst, list):
            return errs + [f"{path}: expected array"]
        if "items" in schema:
            for i, it in enumerate(inst):
                errs += validate(it, schema["items"], f"{path}[{i}]")
    elif t in ("number", "integer"):
        if isinstance(inst, bool) or not isinstance(inst, (int, float)):
            errs.append(f"{path}: expected {t}")
        else:
            if t == "integer" and not float(inst).is_integer():
                errs.append(f"{path}: expected integer")
            if "minimum" in schema and inst < schema["minimum"]:
                errs.append(f"{path}: {inst} < minimum {schema['minimum']}")
            if "maximum" in schema and inst > schema["maximum"]:
                errs.append(f"{path}: {inst} > maximum {schema['maximum']}")
    elif t == "string":
        if not isinstance(inst, str):
            errs.append(f"{path}: expected string")
    elif t == "boolean":
        if not isinstance(inst, bool):
            errs.append(f"{path}: expected boolean")
    return errs


def validate_file(inst_path, schema_path):
    with open(inst_path, encoding="utf-8") as f:
        inst = json.load(f)
    with open(schema_path, encoding="utf-8") as f:
        schema = json.load(f)
    return validate(inst, schema)
