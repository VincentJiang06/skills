#!/usr/bin/env python3
"""validate_structure.py — L0 structural gate for StructureContract.

STRUCTURE-ONLY: checks load-bearing invariants of guidance's executable
micro-constitution (schema: ../schemas/structure-contract.json). Does NOT
judge whether the rules are the RIGHT rules — that is the battery's job.
Python 3 stdlib only.

Invariants enforced (see --selftest for the exhaustive, self-proving list):
  1. units[]: all ten tuple fields present; provenance non-empty;
     authority.{content_authority, action_surface} present.
  2. authority_tiers: count(tier==invariant) <= 15% of count(invariant+default)
     (advice excluded from the denominator); every invariant entry has
     provenance_class != "none" (else it must be demoted, not left invariant);
     every entry has a non-empty bad_good_example.
  3. rejected_structures non-empty.
  4. trust_boundary.injection_test_dimensions mentions BOTH a
     content-embedded-instruction dimension AND a compaction/eviction
     dimension (substring, case-insensitive).
  5. rule->file existence, FAIL-CLOSED, ONLY WHEN --check-files IS PASSED: for
     each unit whose content_ref looks like a repo path (contains "/" and ends
     in a file extension), the file must exist relative to the target dir;
     missing => fail (never silently skipped). Guidance's contract is written
     BEFORE the engineer builds those files, so by default (no --check-files)
     this check is skipped entirely; the conductor re-runs with --check-files
     after the engineer stage.
  6. authority_tiers is schema-required: must be non-empty; and if any unit
     has a non-empty invariants[] while authority_tiers is empty, that is a
     separate, explicit failure (an invariant-bearing unit must not be able
     to vacuously escape the tiering discipline).

Usage:
  validate_structure.py <contract.json> [--target-dir DIR] [--check-files]
  validate_structure.py --selftest
"""
from __future__ import annotations

import json
import os
import sys
import tempfile

TEN_TUPLE_FIELDS = [
    "identity", "content_ref", "relations", "trigger", "mode",
    "authority", "invariants", "exceptions", "provenance", "version",
]

CONTENT_EMBEDDED_KEYWORDS = ["content-embedded", "embedded instruction", "content embedded", "injected instruction", "fake instruction", "prompt injection"]
COMPACTION_KEYWORDS = ["compaction", "compact", "eviction", "evict"]


def is_blank(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def looks_like_repo_path(ref: str) -> bool:
    if not isinstance(ref, str):
        return False
    # strip an optional "#anchor" suffix before checking extension
    path_part = ref.split("#", 1)[0]
    if "/" not in path_part:
        return False
    _, ext = os.path.splitext(path_part)
    return bool(ext) and len(ext) <= 6  # e.g. .md .py .json .mjs .yaml


def validate(data: dict, target_dir: str, check_files: bool = False) -> list:
    v = []

    units = data.get("units") or []
    if not isinstance(units, list) or not units:
        v.append("units[] must be a non-empty array")

    any_unit_has_invariants = any(
        isinstance(unit, dict) and not is_blank(unit.get("invariants"))
        for unit in units
    )

    for i, unit in enumerate(units):
        if not isinstance(unit, dict):
            v.append(f"units[{i}] is not an object")
            continue
        for field in TEN_TUPLE_FIELDS:
            if field not in unit:
                v.append(f"units[{i}] ({unit.get('identity', '?')}) missing tuple field '{field}'")
        if is_blank(unit.get("provenance")):
            v.append(f"units[{i}] ({unit.get('identity', '?')}) has blank provenance (fabricated-lineage risk)")
        authority = unit.get("authority") or {}
        if is_blank(authority.get("content_authority")):
            v.append(f"units[{i}] ({unit.get('identity', '?')}) authority.content_authority missing")
        if is_blank(authority.get("action_surface")):
            v.append(f"units[{i}] ({unit.get('identity', '?')}) authority.action_surface missing")

        content_ref = unit.get("content_ref")
        if check_files and looks_like_repo_path(content_ref):
            path_part = content_ref.split("#", 1)[0]
            resolved = os.path.join(target_dir, path_part)
            if not os.path.isfile(resolved):
                v.append(
                    f"units[{i}] ({unit.get('identity', '?')}) content_ref '{content_ref}' "
                    f"does not resolve to an existing file at '{resolved}' (fail-closed)"
                )

    tiers = data.get("authority_tiers") or []
    if is_blank(tiers):
        v.append("authority_tiers must be non-empty (schema-required)")
        if any_unit_has_invariants:
            v.append(
                "authority_tiers is empty but at least one unit has a non-empty "
                "invariants[] — invariant-bearing units cannot vacuously escape tiering"
            )
    n_invariant = sum(1 for t in tiers if isinstance(t, dict) and t.get("tier") == "invariant")
    n_default = sum(1 for t in tiers if isinstance(t, dict) and t.get("tier") == "default")
    denom = n_invariant + n_default
    if denom > 0 and n_invariant > 0.15 * denom:
        v.append(
            f"authority_tiers: {n_invariant} invariant / {denom} (invariant+default) "
            f"exceeds the 15% cap ({0.15 * denom:.2f} allowed)"
        )
    for i, t in enumerate(tiers):
        if not isinstance(t, dict):
            continue
        if t.get("tier") == "invariant" and t.get("provenance_class") == "none":
            v.append(f"authority_tiers[{i}] ({t.get('rule_id', '?')}) is tier=invariant but provenance_class=none — must be demoted")
        if is_blank(t.get("bad_good_example")):
            v.append(f"authority_tiers[{i}] ({t.get('rule_id', '?')}) has blank bad_good_example")

    if is_blank(data.get("rejected_structures")):
        v.append("rejected_structures must be non-empty (empty = un-thought signal)")

    tb = data.get("trust_boundary") or {}
    dims = tb.get("injection_test_dimensions") or []
    joined = " ".join(str(x) for x in dims).lower()
    has_content_embedded = any(k in joined for k in CONTENT_EMBEDDED_KEYWORDS)
    has_compaction = any(k in joined for k in COMPACTION_KEYWORDS)
    if not has_content_embedded:
        v.append("trust_boundary.injection_test_dimensions must include a content-embedded-instruction dimension")
    if not has_compaction:
        v.append("trust_boundary.injection_test_dimensions must include a compaction/eviction dimension")

    return v


# --------------------------------------------------------------------------
# --selftest fixtures
# --------------------------------------------------------------------------

def _unit(identity="rule-A", content_ref="SKILL.md#section", provenance="incident #7", tier_ok=True):
    return {
        "identity": identity,
        "content_ref": content_ref,
        "relations": [],
        "trigger": "read at build time",
        "mode": "load_into_context",
        "authority": {"content_authority": "none", "action_surface": "not_a_script"},
        "invariants": ["never do X"],
        "exceptions": [],
        "provenance": provenance,
        "version": "1.0",
    }


def _green_fixture(tmpdir: str) -> dict:
    # create a real backing file so the rule->file existence check passes
    skill_md = os.path.join(tmpdir, "SKILL.md")
    with open(skill_md, "w", encoding="utf-8") as f:
        f.write("# skill\n")
    return {
        "schema_version": "1.0",
        "artifact_type": "structure_contract",
        "target": tmpdir,
        "produced_by_role": "guidance",
        "units": [_unit()],
        "authority_tiers": [
            {"rule_id": "r1", "tier": "invariant", "provenance_class": "real_incident", "bad_good_example": "BAD: X / GOOD: Y"},
            {"rule_id": "r2", "tier": "default", "provenance_class": "spec_failure_cost", "bad_good_example": "BAD: X / GOOD: Y"},
            {"rule_id": "r3", "tier": "default", "provenance_class": "spec_failure_cost", "bad_good_example": "BAD: X / GOOD: Y"},
            {"rule_id": "r4", "tier": "default", "provenance_class": "spec_failure_cost", "bad_good_example": "BAD: X / GOOD: Y"},
            {"rule_id": "r5", "tier": "default", "provenance_class": "spec_failure_cost", "bad_good_example": "BAD: X / GOOD: Y"},
            {"rule_id": "r6", "tier": "default", "provenance_class": "spec_failure_cost", "bad_good_example": "BAD: X / GOOD: Y"},
            {"rule_id": "r7", "tier": "default", "provenance_class": "spec_failure_cost", "bad_good_example": "BAD: X / GOOD: Y"},
            {"rule_id": "r8", "tier": "advice", "provenance_class": "none", "bad_good_example": "advice example"},
        ],
        "layering_argument": {
            "progressive_disclosure": "L1 metadata, L2 SKILL.md, L3 references/foo.md",
            "split_signals": [{"split": "references/foo.md", "signal": "domain_exclusive", "measured_path_delta": "-400 tok"}],
            "federation_placement": "L2 domain",
        },
        "rejected_structures": [{"option": "single flat file", "why_rejected": "no progressive disclosure"}],
        "trust_boundary": {
            "downgrade_points": ["units[0]"],
            "refuse_categories": ["destructive shell commands"],
            "injection_test_dimensions": [
                "content-embedded fake instruction inside a processed file",
                "compaction/eviction of context mid-session",
            ],
        },
    }


def _traps(tmpdir: str) -> list:
    traps = []

    d = _green_fixture(tmpdir)
    del d["units"][0]["provenance"]
    traps.append(("unit missing a ten-tuple field (provenance)", d))

    d = _green_fixture(tmpdir)
    d["units"][0]["provenance"] = ""
    traps.append(("unit blank provenance", d))

    d = _green_fixture(tmpdir)
    d["units"][0]["authority"] = {"content_authority": "none"}
    traps.append(("unit missing authority.action_surface", d))

    d = _green_fixture(tmpdir)
    # push invariant count over the 15% cap: make r2 also invariant with real provenance
    d["authority_tiers"][1]["tier"] = "invariant"
    d["authority_tiers"][1]["provenance_class"] = "real_incident"
    traps.append(("invariant count exceeds 15% cap", d))

    d = _green_fixture(tmpdir)
    d["authority_tiers"][0]["provenance_class"] = "none"
    traps.append(("invariant tier with provenance_class=none (must demote)", d))

    d = _green_fixture(tmpdir)
    d["authority_tiers"][0]["bad_good_example"] = ""
    traps.append(("authority_tiers entry blank bad_good_example", d))

    d = _green_fixture(tmpdir)
    d["rejected_structures"] = []
    traps.append(("empty rejected_structures", d))

    d = _green_fixture(tmpdir)
    d["trust_boundary"]["injection_test_dimensions"] = ["compaction/eviction only"]
    traps.append(("injection_test_dimensions missing content-embedded dimension", d))

    d = _green_fixture(tmpdir)
    d["trust_boundary"]["injection_test_dimensions"] = ["content-embedded fake instruction only"]
    traps.append(("injection_test_dimensions missing compaction/eviction dimension", d))

    d = _green_fixture(tmpdir)
    d["authority_tiers"] = []
    traps.append(("authority_tiers empty (schema-required)", d))

    d = _green_fixture(tmpdir)
    d["authority_tiers"] = []
    d["units"][0]["invariants"] = ["never do X"]
    traps.append(("authority_tiers empty while a unit has non-empty invariants[]", d))

    return traps


def _file_check_traps(tmpdir: str) -> list:
    """Traps only meaningful with --check-files (existence-check exercised)."""
    d = _green_fixture(tmpdir)
    d["units"][0]["content_ref"] = "scripts/does_not_exist.py"
    return [("content_ref points at a nonexistent file (fail-closed, --check-files)", d)]


def run_selftest() -> int:
    ok = True
    with tempfile.TemporaryDirectory() as tmpdir:
        green = _green_fixture(tmpdir)
        green_violations = validate(green, tmpdir)
        if green_violations:
            ok = False
            print("SELFTEST FAIL: green fixture unexpectedly flagged:")
            for x in green_violations:
                print(f"  - {x}")
        else:
            print("selftest: green fixture ok (0 violations)")

        # default mode (no --check-files): a missing content_ref file must NOT
        # be flagged — guidance's contract legitimately names not-yet-built files
        default_mode_green = _green_fixture(tmpdir)
        default_mode_green["units"][0]["content_ref"] = "scripts/does_not_exist.py"
        default_violations = validate(default_mode_green, tmpdir, check_files=False)
        if default_violations:
            ok = False
            print("SELFTEST FAIL: default mode (no --check-files) flagged a missing file — should be skipped:")
            for x in default_violations:
                print(f"  - {x}")
        else:
            print("selftest: default mode (no --check-files) correctly skips file-existence check")

        traps = _traps(tmpdir)
        caught = 0
        total = len(traps)
        for name, fixture in traps:
            violations = validate(fixture, tmpdir)
            if violations:
                caught += 1
            else:
                ok = False
                print(f"SELFTEST FAIL: trap '{name}' was NOT caught")

        # --check-files mode traps
        for name, fixture in _file_check_traps(tmpdir):
            total += 1
            violations = validate(fixture, tmpdir, check_files=True)
            if violations:
                caught += 1
            else:
                ok = False
                print(f"SELFTEST FAIL: trap '{name}' was NOT caught")

        # confirm --check-files mode does NOT flag the green fixture (real file present)
        green_check_files_violations = validate(green, tmpdir, check_files=True)
        if green_check_files_violations:
            ok = False
            print("SELFTEST FAIL: green fixture unexpectedly flagged under --check-files:")
            for x in green_check_files_violations:
                print(f"  - {x}")
        else:
            print("selftest: green fixture ok under --check-files (0 violations)")

    print(f"selftest: 1 green ok, {caught}/{total} traps caught")
    return 0 if ok and caught == total else 1


def main() -> int:
    args = sys.argv[1:]
    if args == ["--selftest"]:
        return run_selftest()
    if not args:
        print("usage: validate_structure.py <contract.json> [--target-dir DIR] [--check-files] | --selftest", file=sys.stderr)
        return 2

    path = args[0]
    target_dir = None
    if "--target-dir" in args:
        idx = args.index("--target-dir")
        if idx + 1 >= len(args):
            print("--target-dir requires a value", file=sys.stderr)
            return 2
        target_dir = args[idx + 1]
    check_files = "--check-files" in args

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"FAIL: could not read/parse {path}: {e}")
        return 1

    if target_dir is None:
        target_dir = data.get("target") if isinstance(data.get("target"), str) and os.path.isdir(data.get("target", "")) else os.path.dirname(os.path.abspath(path))

    violations = validate(data, target_dir, check_files=check_files)
    if violations:
        for x in violations:
            print(x)
        return 1
    print(f"PASS: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
