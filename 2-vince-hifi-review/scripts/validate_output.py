#!/usr/bin/env python3
"""Traceability + schema gate for an evaluation JSON. Exit 1 on any violation."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "evals"))
from schema_check import validate  # noqa: E402

TECHNICALITIES = {"soundstage", "imaging", "resolution", "dynamics", "transient", "timbre"}


def check(doc, schema):
    errs = validate(doc, schema)
    ev_ids = {e["source_id"] for e in doc.get("evidence", [])}
    for i, c in enumerate(doc.get("claims", [])):
        if not c.get("source_ids"):
            errs.append(f"claims[{i}]: no source_ids (untraceable)")
        for sid in c.get("source_ids", []):
            if sid not in ev_ids:
                errs.append(f"claims[{i}]: source_id '{sid}' not in evidence")
        if doc.get("device_class") == "transducer" and c.get("attribute") in TECHNICALITIES \
                and c.get("provenance") != "consensus":
            errs.append(f"claims[{i}]: technicality '{c.get('attribute')}' provenance '{c.get('provenance')}' (must be consensus)")
        # "audibl" but NOT "inaudible": a source audible-difference claim needs a measurement.
        if doc.get("device_class") == "source" and re.search(r"(?<!in)audibl", c.get("text", "").lower()) \
                and c.get("provenance") != "measured":
            errs.append(f"claims[{i}]: audible-difference claim not backed by measurement")
    return errs


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: validate_output.py <evaluation.json>")
    with open(os.path.join(HERE, "..", "schemas", "evaluation.schema.json"), encoding="utf-8") as f:
        schema = json.load(f)
    with open(sys.argv[1], encoding="utf-8") as f:
        doc = json.load(f)
    errs = check(doc, schema)
    for e in errs:
        print("VIOLATION:", e)
    print("OK" if not errs else "FAIL (%d)" % len(errs))
    sys.exit(0 if not errs else 1)


if __name__ == "__main__":
    main()
