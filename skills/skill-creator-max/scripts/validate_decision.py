#!/usr/bin/env python3
"""validate_decision.py — L0 structural gate for DecisionRecord.

STRUCTURE-ONLY: checks load-bearing invariants of the conductor's own
gate-crossing ledger (schema: ../schemas/decision-record.json). Does NOT
judge whether the gate calls themselves were the RIGHT calls — that is the
battery's job. Python 3 stdlib only.

Invariants enforced (see --selftest for the exhaustive, self-proving list):
  1. gates[]: any entry with verdict=="pass" must have non-empty
     options_rejected (O2: a pass with no rejected options is un-thought).
  2. capability_level=="O-L0" => every gate's adjudicator must be "human".
  3. acceptance: the min-fold cap.
     - battery_verdict in {breaches_found, not_run} => effective_verdict must
       NOT be "industrial" (capped at "candidate" or lower).
     - "industrial" is allowed only when battery_verdict=="clean".
     - effective_verdict must equal min(re_audit_verdict, battery_cap) under
       the ordering draft < candidate < industrial.
     - battery_independence_tier=="none" is valid ONLY paired with
       battery_verdict=="not_run" (no battery ran, so no tier applies). If
       "none" appears alongside a battery that actually ran (clean or
       breaches_found), that is a fail.
  4. final_verdict in {done, stopped_unmet}; stopped_unmet => blocking_gaps
     non-empty.
  5. learning_record.destinations.{checklist_entry, gotcha_backfill,
     kb_revision} all non-empty.

Usage:
  validate_decision.py <record.json>
  validate_decision.py --selftest
"""
from __future__ import annotations

import json
import sys

VERDICT_ORDER = {"draft": 0, "candidate": 1, "industrial": 2}


def is_blank(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def battery_cap(battery_verdict: str) -> str:
    """The highest effective_verdict the battery result permits."""
    if battery_verdict == "clean":
        return "industrial"
    # breaches_found or not_run: capped at candidate (never industrial)
    return "candidate"


def validate(data: dict) -> list:
    v = []

    capability_level = data.get("capability_level")
    gates = data.get("gates") or []

    for i, g in enumerate(gates):
        if not isinstance(g, dict):
            continue
        stage = g.get("stage", "?")
        if g.get("verdict") == "pass" and is_blank(g.get("options_rejected")):
            v.append(f"gates[{i}] (stage={stage}) verdict==pass but options_rejected is empty (un-thought signal)")
        if capability_level == "O-L0" and g.get("adjudicator") != "human":
            v.append(f"gates[{i}] (stage={stage}) capability_level==O-L0 requires adjudicator=='human', got {g.get('adjudicator')!r}")

    acceptance = data.get("acceptance") or {}
    battery_verdict = acceptance.get("battery_verdict")
    re_audit_verdict = acceptance.get("re_audit_verdict")
    effective_verdict = acceptance.get("effective_verdict")
    battery_independence_tier = acceptance.get("battery_independence_tier")

    if battery_independence_tier == "none" and battery_verdict != "not_run":
        v.append(
            f"acceptance.battery_independence_tier=='none' is only valid when "
            f"battery_verdict=='not_run', got battery_verdict={battery_verdict!r}"
        )

    if battery_verdict in ("breaches_found", "not_run") and effective_verdict == "industrial":
        v.append(
            f"acceptance.effective_verdict=='industrial' is not allowed when battery_verdict=={battery_verdict!r} "
            f"(min-fold cap: industrial requires battery_verdict==clean)"
        )

    if re_audit_verdict in VERDICT_ORDER and battery_verdict in ("clean", "breaches_found", "not_run"):
        cap = battery_cap(battery_verdict)
        expected = min(re_audit_verdict, cap, key=lambda x: VERDICT_ORDER[x])
        if effective_verdict != expected:
            v.append(
                f"acceptance.effective_verdict={effective_verdict!r} but expected min(re_audit_verdict="
                f"{re_audit_verdict!r}, battery_cap={cap!r}) == {expected!r}"
            )
    elif effective_verdict not in VERDICT_ORDER:
        v.append(f"acceptance.effective_verdict must be one of draft/candidate/industrial, got {effective_verdict!r}")

    final_verdict = data.get("final_verdict")
    if final_verdict not in ("done", "stopped_unmet"):
        v.append(f"final_verdict must be 'done' or 'stopped_unmet', got {final_verdict!r}")
    if final_verdict == "stopped_unmet" and is_blank(data.get("blocking_gaps")):
        v.append("blocking_gaps must be non-empty when final_verdict==stopped_unmet")

    learning_record = data.get("learning_record") or {}
    destinations = learning_record.get("destinations") or {}
    for f in ("checklist_entry", "gotcha_backfill", "kb_revision"):
        if is_blank(destinations.get(f)):
            v.append(f"learning_record.destinations.{f} must be non-empty")

    return v


# --------------------------------------------------------------------------
# --selftest fixtures
# --------------------------------------------------------------------------

def _gate(stage="engineer", verdict="pass", adjudicator="human", options_rejected=None):
    return {
        "stage": stage, "iteration": 1, "artifact_ref": f"{stage}.json#entry1",
        "leverage": "routine", "question": "does this pass?",
        "evidence": ["entry1"], "options_considered": ["A", "B"],
        "options_rejected": options_rejected if options_rejected is not None else [{"option": "B", "why": "weaker evidence"}],
        "uncertainty": "low", "adjudicator": adjudicator, "verdict": verdict,
        "routing_hypothesis": "n/a", "remediation_path": "n/a",
    }


def _green_fixture() -> dict:
    return {
        "schema_version": "1.0",
        "artifact_type": "decision_record",
        "target": "example-skill",
        "produced_by_role": "conductor",
        "capability_level": "O-L0",
        "gates": [_gate()],
        "acceptance": {
            "re_audit_verdict": "industrial",
            "battery_verdict": "clean",
            "battery_independence_tier": "model",
            "battery_stop_reason": "2 consecutive rounds no new P1/P2 (E9 pre-registered)",
            "effective_verdict": "industrial",
        },
        "final_verdict": "done",
        "blocking_gaps": [],
        "learning_record": {
            "results": "shipped industrial", "failures": "none blocking",
            "root_cause_routing_verified": "yes, min() held",
            "evaluator_audit_findings": "none",
            "battery_breaches": "none",
            "destinations": {
                "checklist_entry": "added to O4 checklist", "gotcha_backfill": "added S6 entry",
                "kb_revision": "no KB change needed this cycle",
            },
        },
    }


def _traps() -> list:
    traps = []

    d = _green_fixture()
    d["gates"][0]["options_rejected"] = []
    traps.append(("gate verdict==pass with empty options_rejected", d))

    d = _green_fixture()
    d["gates"][0]["adjudicator"] = "machine"
    traps.append(("O-L0 capability_level with non-human adjudicator", d))

    d = _green_fixture()
    d["acceptance"]["battery_verdict"] = "breaches_found"
    d["acceptance"]["effective_verdict"] = "industrial"
    traps.append(("industrial effective_verdict despite battery_verdict==breaches_found", d))

    d = _green_fixture()
    d["acceptance"]["battery_verdict"] = "not_run"
    d["acceptance"]["effective_verdict"] = "industrial"
    traps.append(("industrial effective_verdict despite battery_verdict==not_run", d))

    d = _green_fixture()
    d["acceptance"]["re_audit_verdict"] = "candidate"
    d["acceptance"]["battery_verdict"] = "clean"
    d["acceptance"]["effective_verdict"] = "industrial"
    traps.append(("effective_verdict higher than min(re_audit, battery_cap)", d))

    d = _green_fixture()
    d["final_verdict"] = "maybe"
    traps.append(("final_verdict not in done/stopped_unmet", d))

    d = _green_fixture()
    d["final_verdict"] = "stopped_unmet"
    d["blocking_gaps"] = []
    traps.append(("stopped_unmet with empty blocking_gaps", d))

    d = _green_fixture()
    d["learning_record"]["destinations"]["kb_revision"] = ""
    traps.append(("learning_record.destinations.kb_revision blank", d))

    d = _green_fixture()
    d["acceptance"]["battery_independence_tier"] = "none"
    # battery_verdict stays "clean" (a battery that actually ran) => "none" tier is a lie
    traps.append(("battery_independence_tier=='none' with a battery that ran (clean)", d))

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

    # sanity-pass: battery_independence_tier=='none' is legal with not_run
    d = _green_fixture()
    d["acceptance"]["battery_verdict"] = "not_run"
    d["acceptance"]["battery_independence_tier"] = "none"
    d["acceptance"]["effective_verdict"] = "candidate"  # not_run caps at candidate
    sane = validate(d)
    if sane:
        ok = False
        print(f"SELFTEST FAIL: 'none' tier with battery not_run expected to PASS but got: {sane}")
    else:
        print("selftest: sanity-pass 'battery_independence_tier==none with not_run' ok")

    caught = 0
    traps = _traps()
    total = len(traps)
    for name, fixture in traps:
        violations = validate(fixture)
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
        print("usage: validate_decision.py <record.json> | --selftest", file=sys.stderr)
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
