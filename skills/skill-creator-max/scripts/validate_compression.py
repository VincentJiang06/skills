#!/usr/bin/env python3
"""validate_compression.py — L0 structural gate for CompressionReport.

STRUCTURE-ONLY: checks load-bearing invariants of the zipper's optional
compression object (schema: ../schemas/compression-report.json). Does NOT
judge whether the compression itself is a GOOD idea — that is the battery's
job. Python 3 stdlib only.

Invariants enforced (see --selftest for the exhaustive, self-proving list):
  1. skipped==true => pass unconditionally (Z is the one optional stage).
  2. else:
     - per_path_token_delta non-empty
     - behavioral_equivalence_gate.passed must be true whenever
       lexicographic_verdict=="pass"; if the gate did not pass, verdict must
       be "roll_back" (the veto: degraded behavior can never be a "pass")
     - probe_scores: every item with applicable==true must have score != "n/a"
       and non-empty
     - incompressible_check: all three fields true
     - cache_prefix_check: both fields true

Usage:
  validate_compression.py <report.json>
  validate_compression.py --selftest
"""
from __future__ import annotations

import json
import sys


def is_blank(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def validate(data: dict) -> list:
    v = []

    if data.get("skipped") is True:
        return v  # Z is optional; a declared skip passes unconditionally

    if is_blank(data.get("per_path_token_delta")):
        v.append("per_path_token_delta must be non-empty when not skipped")

    gate = data.get("behavioral_equivalence_gate") or {}
    gate_passed = gate.get("passed")
    verdict = data.get("lexicographic_verdict")

    if verdict == "pass" and gate_passed is not True:
        v.append("lexicographic_verdict=='pass' requires behavioral_equivalence_gate.passed==true")
    if gate_passed is not True and verdict != "roll_back":
        v.append("behavioral_equivalence_gate.passed is not true, so lexicographic_verdict must be 'roll_back'")

    probes = data.get("probe_scores") or []
    for i, p in enumerate(probes):
        if not isinstance(p, dict):
            continue
        if p.get("applicable") is True:
            score = p.get("score")
            if score == "n/a" or is_blank(score):
                v.append(f"probe_scores[{i}] ({p.get('probe_type', '?')}) is applicable but has no real score")

    incompressible = data.get("incompressible_check") or {}
    for f in ("blacklist_checked", "invariants_pinned", "reasoning_preserved"):
        if incompressible.get(f) is not True:
            v.append(f"incompressible_check.{f} must be true")

    cache_prefix = data.get("cache_prefix_check") or {}
    for f in ("head_zero_dynamic", "static_first"):
        if cache_prefix.get(f) is not True:
            v.append(f"cache_prefix_check.{f} must be true")

    return v


# --------------------------------------------------------------------------
# --selftest fixtures
# --------------------------------------------------------------------------

def _green_fixture() -> dict:
    return {
        "schema_version": "1.0",
        "artifact_type": "compression_report",
        "target": "example-skill",
        "produced_by_role": "zipper",
        "skipped": False,
        "per_path_token_delta": [{"path": "positive query 1", "tokens_before": 4000, "tokens_after": 2500}],
        "behavioral_equivalence_gate": {"regression_not_down": True, "probes_not_down": True, "passed": True},
        "three_ledgers": {"token_gain": "1500 tok/typical-path", "omission_loss": "0 (E7 probes flat)", "exception_cost": "0 new exceptions"},
        "probe_scores": [
            {"probe_type": "recall", "applicable": True, "score": "4.8/5"},
            {"probe_type": "decision", "applicable": True, "score": "4.5/5"},
            {"probe_type": "artifact", "applicable": False, "score": "n/a"},
            {"probe_type": "continuation", "applicable": False, "score": "n/a"},
        ],
        "incompressible_check": {"blacklist_checked": True, "invariants_pinned": True, "reasoning_preserved": True},
        "cache_prefix_check": {"head_zero_dynamic": True, "static_first": True},
        "importance_ranking": "invariants > gotchas > body prose; moved references/legacy.md out (rare, non-fatal)",
        "lexicographic_verdict": "pass",
    }


def _traps() -> list:
    traps = []

    d = _green_fixture()
    d["per_path_token_delta"] = []
    traps.append(("empty per_path_token_delta when not skipped", d))

    d = _green_fixture()
    d["behavioral_equivalence_gate"]["passed"] = False
    d["lexicographic_verdict"] = "pass"
    traps.append(("verdict==pass but behavioral_equivalence_gate.passed==false", d))

    d = _green_fixture()
    d["behavioral_equivalence_gate"] = {"regression_not_down": False, "probes_not_down": True, "passed": False}
    d["lexicographic_verdict"] = "pass"
    traps.append(("gate failed but verdict is pass instead of roll_back", d))

    d = _green_fixture()
    d["probe_scores"][0]["score"] = "n/a"
    traps.append(("applicable probe with score=='n/a'", d))

    d = _green_fixture()
    d["probe_scores"][1]["score"] = ""
    traps.append(("applicable probe with blank score", d))

    d = _green_fixture()
    d["incompressible_check"]["invariants_pinned"] = False
    traps.append(("incompressible_check.invariants_pinned==false", d))

    d = _green_fixture()
    d["cache_prefix_check"]["head_zero_dynamic"] = False
    traps.append(("cache_prefix_check.head_zero_dynamic==false", d))

    d = _green_fixture()
    d["skipped"] = True
    # deliberately leave everything else broken to prove skip short-circuits
    d["per_path_token_delta"] = []
    d["behavioral_equivalence_gate"] = {}
    traps.append(("skipped==true with otherwise-broken fields — must PASS (sanity check)", d, True))

    return traps


def run_selftest() -> int:
    ok = True
    green = _green_fixture()
    green_violations = validate(green)
    if green_violations:
        ok = False
        print("SELFTEST FAIL: green fixture unexpectedly flagged:")
        for x in green_violations:
            print(f"  - {x}")
    else:
        print("selftest: green fixture ok (0 violations)")

    caught = 0
    total = 0
    for entry in _traps():
        name, fixture = entry[0], entry[1]
        expect_pass = len(entry) > 2 and entry[2] is True
        violations = validate(fixture)
        if expect_pass:
            if violations:
                ok = False
                print(f"SELFTEST FAIL: '{name}' expected to PASS but got violations: {violations}")
            else:
                print(f"selftest: sanity-pass '{name}' ok")
            continue
        total += 1
        if violations:
            caught += 1
        else:
            ok = False
            print(f"SELFTEST FAIL: trap '{name}' was NOT caught")

    print(f"selftest: 1 green ok, {caught}/{total} traps caught")
    return 0 if ok and caught == total else 1


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "--selftest":
        return run_selftest()
    if len(sys.argv) != 2:
        print("usage: validate_compression.py <report.json> | --selftest", file=sys.stderr)
        return 2
    path = sys.argv[1]
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"FAIL: could not read/parse {path}: {e}")
        return 1
    violations = validate(data)
    if violations:
        for x in violations:
            print(x)
        return 1
    print(f"PASS: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
