#!/usr/bin/env python3
"""validate_spec.py — L0 structural gate for SkillSpec (skill-spec.json).

STRUCTURE-ONLY: checks load-bearing invariants of the composer's decision
object (schema: ../schemas/skill-spec.json). Does NOT judge substance/quality
— that is the battery's job. Python 3 stdlib only.

Invariants enforced (see --selftest for the exhaustive, self-proving list):
  1. artifact_type == "skill_spec"
  2. verdict in {build, reject}
  3. verdict==reject  => rejection.{reason,alternative,alternative_evidence} all non-empty
  4. verdict==build   => build_spec present; the 15 C2 fields are present AND
     non-empty UNLESS the dimension is explicitly carried in unknowns[] or
     disputes[] (tri-state: no implicit void). The four fields that carry an
     always-on structural minimum (narratives, faq, trigger_tests, stop) are
     NOT tri-state-escapable — they are load-bearing regardless.
       - narratives: >=2 items AND >=1 with adversarial==true
       - faq: >=6 items
       - trigger_tests.near_miss_negatives: non-empty
       - stop.done_when AND stop.abandon_when: both non-empty
     success.dimensions: each dimension's kind in {objective, subjective}
  5. No TODO/TBD/FIXME/placeholder token anywhere in the document.

Usage:
  validate_spec.py <spec.json>
  validate_spec.py --selftest
"""
from __future__ import annotations

import json
import re
import sys

# Fields whose absence MAY be legally carried by an unknowns[]/disputes[] entry.
TRISTATE_FIELDS = [
    "task", "trigger", "users", "baseline", "success",
    "failure_cost", "materials", "dependencies", "rejected",
]
# Fields that always carry a hard structural minimum — never tri-state-escapable.
ABSOLUTE_FIELDS = ["narratives", "faq", "trigger_tests", "stop"]

ALL_15_FIELDS = [
    "task", "trigger", "users", "baseline", "success", "failure_cost",
    "materials", "dependencies", "rejected", "unknowns", "disputes",
    "stop", "narratives", "faq", "trigger_tests",
]

PLACEHOLDER_TOKENS = ["todo", "tbd", "fixme", "placeholder"]
# Word-boundary match so legit words ("fixture", a skill about TODO-linting)
# don't collide with a bare placeholder token used as a stand-in.
PLACEHOLDER_RE = re.compile(r"\b(" + "|".join(PLACEHOLDER_TOKENS) + r")\b", re.IGNORECASE)


def is_blank(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def field_is_empty(field: str, value) -> bool:
    if field == "success":
        if not isinstance(value, dict):
            return True
        return is_blank(value.get("dimensions"))
    if field == "stop":
        if not isinstance(value, dict):
            return True
        return is_blank(value.get("done_when")) or is_blank(value.get("abandon_when"))
    if field == "trigger_tests":
        if not isinstance(value, dict):
            return True
        return (
            is_blank(value.get("positives"))
            and is_blank(value.get("near_miss_negatives"))
            and is_blank(value.get("nearest_neighbors"))
        )
    return is_blank(value)


def covered_by_tristate(field: str, unknowns: list, disputes: list) -> bool:
    """A blank field is legal only if some unknowns/disputes entry names it."""
    needle = field.lower()
    for u in unknowns or []:
        if not isinstance(u, dict):
            continue
        haystack = " ".join(str(u.get(k, "")) for k in ("id", "unknown", "discovery_plan")).lower()
        if needle in haystack:
            return True
    for d in disputes or []:
        if not isinstance(d, dict):
            continue
        haystack = " ".join(str(d.get(k, "")) for k in ("id", "dispute")).lower()
        haystack += " " + " ".join(str(c) for c in d.get("candidates", []) or []).lower()
        if needle in haystack:
            return True
    return False


def scan_placeholders(obj, path="$") -> list:
    violations = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            violations.extend(scan_placeholders(v, f"{path}.{k}"))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            violations.extend(scan_placeholders(v, f"{path}[{i}]"))
    elif isinstance(obj, str):
        for m in PLACEHOLDER_RE.finditer(obj):
            tok = m.group(1).lower()
            violations.append(f"placeholder token '{tok}' found at {path}: {obj[:80]!r}")
    return violations


def validate(data: dict) -> list:
    v = []

    if data.get("artifact_type") != "skill_spec":
        v.append(f"artifact_type must be 'skill_spec', got {data.get('artifact_type')!r}")

    verdict = data.get("verdict")
    if verdict not in ("build", "reject"):
        v.append(f"verdict must be 'build' or 'reject', got {verdict!r}")

    if verdict == "reject":
        rejection = data.get("rejection") or {}
        for f in ("reason", "alternative", "alternative_evidence"):
            if is_blank(rejection.get(f)):
                v.append(f"rejection.{f} must be non-empty when verdict=reject")

    if verdict == "build":
        build_spec = data.get("build_spec")
        if not isinstance(build_spec, dict) or not build_spec:
            v.append("build_spec must be present (non-empty object) when verdict=build")
            build_spec = {}

        unknowns = build_spec.get("unknowns") or []
        disputes = build_spec.get("disputes") or []

        for field in TRISTATE_FIELDS:
            value = build_spec.get(field)
            if field_is_empty(field, value):
                if not covered_by_tristate(field, unknowns, disputes):
                    v.append(
                        f"build_spec.{field} is empty and not carried in unknowns[]/disputes[] "
                        f"(tri-state violation: implicit void)"
                    )

        # --- absolute (non-escapable) minimums ---
        narratives = build_spec.get("narratives") or []
        if not isinstance(narratives, list) or len(narratives) < 2:
            v.append("build_spec.narratives must have >=2 items")
        elif not any(isinstance(n, dict) and n.get("adversarial") is True for n in narratives):
            v.append("build_spec.narratives must include >=1 item with adversarial==true")

        faq = build_spec.get("faq") or []
        if not isinstance(faq, list) or len(faq) < 6:
            v.append("build_spec.faq must have >=6 items")

        trigger_tests = build_spec.get("trigger_tests") or {}
        if is_blank(trigger_tests.get("near_miss_negatives")):
            v.append("build_spec.trigger_tests.near_miss_negatives must be non-empty")

        stop = build_spec.get("stop") or {}
        if is_blank(stop.get("done_when")):
            v.append("build_spec.stop.done_when must be non-empty")
        if is_blank(stop.get("abandon_when")):
            v.append("build_spec.stop.abandon_when must be non-empty")

        success = build_spec.get("success") or {}
        for i, dim in enumerate(success.get("dimensions") or []):
            kind = dim.get("kind") if isinstance(dim, dict) else None
            if kind not in ("objective", "subjective"):
                v.append(f"build_spec.success.dimensions[{i}].kind must be objective|subjective, got {kind!r}")

    v.extend(scan_placeholders(data))
    return v


# --------------------------------------------------------------------------
# --selftest fixtures
# --------------------------------------------------------------------------

def _base_build_spec() -> dict:
    return {
        "task": "A user hitting X needs Y, blocked by Z, costing 30min/incident.",
        "trigger": "trigger: 'do X'; anti-trigger: 'do W' (handled elsewhere).",
        "users": "engineers, medium expertise, low failure tolerance.",
        "baseline": "manually copy-pastes today, costs 10min each time.",
        "success": {"dimensions": [
            {"name": "correctness", "kind": "objective", "criterion": "exit code 0 on harness"},
            {"name": "clarity", "kind": "subjective", "criterion": "rubric + 3 calibration samples"},
        ]},
        "failure_cost": "silent wrong output costs a bad release; unacceptable.",
        "materials": "references/foo.md (provenance: incident #12)",
        "dependencies": "python3 stdlib only, no network",
        "rejected": [{"option": "bare prompt", "why_rejected": "loses repeatable structure"}],
        "unknowns": [],
        "disputes": [],
        "stop": {"done_when": "harness green x3", "abandon_when": "budget of 5 rounds exhausted"},
        "narratives": [
            {"scenario": "engineer runs it on file foo.py at 3pm", "adversarial": False, "author": "composer"},
            {"scenario": "user feeds it a malicious path traversal string", "adversarial": True, "author": "reviewer"},
        ],
        "faq": [{"question": f"q{i}", "answer": f"a{i}"} for i in range(6)],
        "trigger_tests": {
            "positives": [{"query": "do X", "expected_frequency": "high"}],
            "near_miss_negatives": [{"query": "do W", "why_not": "shares keyword X but wrong intent"}],
            "nearest_neighbors": [{"neighbor_skill": "sibling", "boundary_sentence": "sibling handles W not X"}],
        },
    }


def _green_fixture() -> dict:
    return {
        "schema_version": "1.0",
        "artifact_type": "skill_spec",
        "target": "example-skill",
        "produced_by_role": "composer",
        "verdict": "build",
        "rejection": {"reason": "", "alternative": "", "alternative_evidence": ""},
        "build_spec": _base_build_spec(),
    }


def _traps() -> list:
    traps = []

    d = _green_fixture()
    d["artifact_type"] = "not_skill_spec"
    traps.append(("bad artifact_type", d))

    d = _green_fixture()
    d["verdict"] = "maybe"
    traps.append(("bad verdict", d))

    d = _green_fixture()
    d["verdict"] = "reject"
    d["rejection"] = {"reason": "not needed", "alternative": "", "alternative_evidence": "ran it once"}
    traps.append(("reject with blank alternative", d))

    d = _green_fixture()
    d["build_spec"]["task"] = ""
    traps.append(("blank task, no tri-state cover", d))

    d = _green_fixture()
    d["build_spec"]["task"] = ""
    d["build_spec"]["unknowns"] = [{"id": "u1", "unknown": "task scenario not yet confirmed", "discovery_plan": "ask user"}]
    traps.append(("blank task WITH tri-state cover — must PASS (not a trap, sanity check)", d, True))

    d = _green_fixture()
    d["build_spec"]["success"] = {"dimensions": []}
    traps.append(("empty success.dimensions, no tri-state cover", d))

    d = _green_fixture()
    d["build_spec"]["narratives"] = [d["build_spec"]["narratives"][0]]
    traps.append(("narratives count < 2", d))

    d = _green_fixture()
    for n in d["build_spec"]["narratives"]:
        n["adversarial"] = False
    traps.append(("narratives with no adversarial item", d))

    d = _green_fixture()
    d["build_spec"]["faq"] = d["build_spec"]["faq"][:3]
    traps.append(("faq < 6 items", d))

    d = _green_fixture()
    d["build_spec"]["trigger_tests"]["near_miss_negatives"] = []
    traps.append(("empty trigger_tests.near_miss_negatives", d))

    d = _green_fixture()
    d["build_spec"]["stop"] = {"done_when": "", "abandon_when": "budget exhausted"}
    traps.append(("blank stop.done_when", d))

    d = _green_fixture()
    d["build_spec"]["success"]["dimensions"][0]["kind"] = "vibes"
    traps.append(("success.dimensions kind not in objective/subjective", d))

    d = _green_fixture()
    d["build_spec"]["materials"] = "TODO: fill this in later"
    traps.append(("placeholder token TODO present", d))

    d = _green_fixture()
    d["build_spec"]["materials"] = "references/fixture_corpus.md — golden fixtures for the tbdriver module"
    traps.append(("benign words 'fixture'/'tbdriver' must NOT trip the placeholder scan", d, True))

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

    traps = _traps()
    caught = 0
    total = 0
    for entry in traps:
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
        print("usage: validate_spec.py <spec.json> | --selftest", file=sys.stderr)
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
