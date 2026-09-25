#!/usr/bin/env python3
"""Schema + source_id reference-integrity gate for an album-review backing JSON.
Exit 1 on any violation. Read-only: reads the backing + schema, prints a verdict.

Checks: the backing is schema-valid; every kind=="fact" claim carries >=1 source_id;
every cited source_id exists in evidence[]. Interpretation claims need no source.
Does NOT check (judge reads, rules/judge-must-flag.md): that an evidence entry is real
or supports the claim, that the fact/interpretation label is honest, or that the prose
matches the backing. Exit 0 = references resolve, never "no fabricated facts"."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)  # schema_check.py ships next to this file (fail-closed: no fallback)
from schema_check import validate  # noqa: E402


def check(doc, schema):
    errs = validate(doc, schema)
    ev_ids = {e["source_id"] for e in doc.get("evidence", []) if isinstance(e, dict) and "source_id" in e}
    for i, c in enumerate(doc.get("claims", [])):
        kind = c.get("kind")
        sids = c.get("source_ids", []) or []
        if kind == "fact":
            if not sids:
                errs.append(f"claims[{i}]: fact-class claim has no source_id (untraceable)")
            for sid in sids:
                if sid not in ev_ids:
                    errs.append(f"claims[{i}]: source_id '{sid}' not in evidence (dangling reference)")
        else:
            # interpretation: still reject a dangling source reference if present.
            for sid in sids:
                if sid not in ev_ids:
                    errs.append(f"claims[{i}]: source_id '{sid}' not in evidence")
    return errs


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: validate_backing.py <backing.json>")
    with open(os.path.join(ROOT, "schemas", "backing.schema.json"), encoding="utf-8") as f:
        schema = json.load(f)
    # Operational error paths (missing or malformed backing file) fail gracefully:
    # a single `ERROR:` line to stderr + nonzero exit — never a raw traceback. The
    # nonzero exit keeps the ship-blocking contract intact.
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            doc = json.load(f)
    except FileNotFoundError as e:
        print(f"ERROR: file not found: {e.filename}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: malformed JSON in {sys.argv[1]}: {e}", file=sys.stderr)
        sys.exit(1)
    errs = check(doc, schema)
    for e in errs:
        print("VIOLATION:", e)
    print("OK" if not errs else "FAIL (%d)" % len(errs))
    sys.exit(0 if not errs else 1)


if __name__ == "__main__":
    main()
