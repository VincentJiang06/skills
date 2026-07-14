#!/usr/bin/env python3
"""validate_report.py — L0 structural gate for EvidenceDossier.

STRUCTURE-ONLY: checks load-bearing invariants of the engineer's layered
evidence object (schema: ../schemas/evidence-dossier.json), PLUS an
anti-stale-output check that actually RE-RUNS the harness rather than
trusting the recorded command_output. Does NOT judge whether the eval cases
themselves are well-designed — that is the battery's job. Python 3 stdlib
only.

Invariants enforced (see --selftest for the exhaustive, self-proving list):
  1. layers[] covers at least E-L0..E-L4, each present with a verdict.
  2. evaluator_calibration[] each: golden_sample_count>0. If evaluator_kind==
     "deterministic" (a byte/numeric comparator), the four judge-bias checks
     below are EXEMPT — those fields are vacuous for a deterministic
     evaluator and may hold honest neutral values. Otherwise (evaluator_kind
     =="llm_judge", or the field is absent/unknown — default to strict):
     has_unknown_exit==true; different_source_from_builder==true;
     model_baseline non-empty; audit_dimensions contains a style/verbosity
     entry (substring).
  3. red_light_history.red_before_green==true; red_artifact_path exists on
     disk AND is non-empty (a touched/empty red log is treated as missing).
  4. stop_conditions: all fields non-empty.
  5. verification: RE-RUN verification.harness_path (cwd=target dir); FAIL if
     the rerun exit code differs from the recorded verification.exit_code, or
     if all_required_passed==true but the rerun exits non-zero (the
     anti-stale-output check). Missing/non-executable harness_path => fail.

Usage:
  validate_report.py <dossier.json> [--target-dir DIR]
  validate_report.py --selftest
"""
from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
import tempfile

REQUIRED_LAYERS = ["E-L0", "E-L1", "E-L2", "E-L3", "E-L4"]
STYLE_KEYWORDS = ["style", "verbosity", "length bias", "verbose"]


def is_blank(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def rerun_harness(harness_path: str, target_dir: str):
    """Returns (ok_to_run: bool, exit_code_or_none, message)."""
    resolved = harness_path
    if not os.path.isabs(resolved):
        resolved = os.path.join(target_dir, harness_path)
    if not os.path.isfile(resolved):
        return False, None, f"harness_path '{harness_path}' does not exist at '{resolved}'"
    if not os.access(resolved, os.X_OK):
        # allow python/node scripts run via interpreter even if not chmod +x,
        # but still require it to at least be readable and dispatchable.
        ext = os.path.splitext(resolved)[1]
        interpreter = {".py": ["python3"], ".js": ["node"], ".mjs": ["node"], ".sh": ["bash"]}.get(ext)
        if not interpreter:
            return False, None, f"harness_path '{harness_path}' is not executable and has no known interpreter"
        cmd = interpreter + [resolved]
    else:
        cmd = [resolved]
    try:
        proc = subprocess.run(cmd, cwd=target_dir, capture_output=True, timeout=120)
        return True, proc.returncode, "ran"
    except Exception as e:
        return False, None, f"error running harness: {e}"


def validate(data: dict, target_dir: str) -> list:
    v = []

    layers = data.get("layers") or []
    seen = {}
    for layer in layers:
        if not isinstance(layer, dict):
            continue
        seen[layer.get("layer")] = layer
    for required in REQUIRED_LAYERS:
        layer = seen.get(required)
        if layer is None:
            v.append(f"layers[] missing required layer {required}")
        elif is_blank(layer.get("verdict")):
            v.append(f"layers[] entry {required} has no verdict")

    calibrations = data.get("evaluator_calibration") or []
    if not calibrations:
        v.append("evaluator_calibration must be non-empty")
    for i, c in enumerate(calibrations):
        if not isinstance(c, dict):
            v.append(f"evaluator_calibration[{i}] is not an object")
            continue
        name = c.get("evaluator", "?")
        if not (isinstance(c.get("golden_sample_count"), int) and c.get("golden_sample_count") > 0):
            v.append(f"evaluator_calibration[{i}] ({name}) golden_sample_count must be > 0")

        # deterministic byte/numeric comparators are exempt from the
        # judge-bias checks below — those fields are vacuous for them and
        # may honestly hold neutral values (false / "" / empty). Anything
        # else (llm_judge, or evaluator_kind absent/unknown) defaults to the
        # strict path for safety.
        if c.get("evaluator_kind") != "deterministic":
            if c.get("has_unknown_exit") is not True:
                v.append(f"evaluator_calibration[{i}] ({name}) has_unknown_exit must be true")
            if c.get("different_source_from_builder") is not True:
                v.append(f"evaluator_calibration[{i}] ({name}) different_source_from_builder must be true")
            if is_blank(c.get("model_baseline")):
                v.append(f"evaluator_calibration[{i}] ({name}) model_baseline must be non-empty")
            dims = " ".join(str(x) for x in (c.get("audit_dimensions") or [])).lower()
            if not any(k in dims for k in STYLE_KEYWORDS):
                v.append(f"evaluator_calibration[{i}] ({name}) audit_dimensions must include a style/verbosity entry")

    rlh = data.get("red_light_history") or {}
    if rlh.get("red_before_green") is not True:
        v.append("red_light_history.red_before_green must be true")
    red_path = rlh.get("red_artifact_path")
    if is_blank(red_path):
        v.append("red_light_history.red_artifact_path must be non-empty")
    else:
        resolved_red = red_path if os.path.isabs(red_path) else os.path.join(target_dir, red_path)
        if not os.path.exists(resolved_red):
            v.append(f"red_light_history.red_artifact_path '{red_path}' does not exist at '{resolved_red}'")
        elif os.path.isfile(resolved_red) and os.path.getsize(resolved_red) == 0:
            v.append(f"red_light_history.red_artifact_path '{red_path}' exists but is empty (0 bytes) — a touched log proves nothing")

    stop_conditions = data.get("stop_conditions") or {}
    for f in ("hypothesis", "pass_when", "abandon_when", "budget", "marginal_threshold"):
        if is_blank(stop_conditions.get(f)):
            v.append(f"stop_conditions.{f} must be non-empty")

    verification = data.get("verification") or {}
    harness_path = verification.get("harness_path")
    if is_blank(harness_path):
        v.append("verification.harness_path must be non-empty")
    else:
        ok, exit_code, msg = rerun_harness(harness_path, target_dir)
        if not ok:
            v.append(f"verification: could not re-run harness — {msg}")
        else:
            recorded = verification.get("exit_code")
            if exit_code != recorded:
                v.append(
                    f"verification: re-run exit code {exit_code} != recorded exit_code {recorded} "
                    f"(anti-stale-output check failed)"
                )
            if verification.get("all_required_passed") is True and exit_code != 0:
                v.append(
                    f"verification: all_required_passed==true but harness re-run exited {exit_code} "
                    f"(stale/false-green output)"
                )

    return v


# --------------------------------------------------------------------------
# --selftest fixtures
# --------------------------------------------------------------------------

def _write_harness(tmpdir: str, exit_code: int) -> str:
    path = os.path.join(tmpdir, "harness.sh")
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"#!/bin/sh\nexit {exit_code}\n")
    st = os.stat(path)
    os.chmod(path, st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return path


def _green_fixture(tmpdir: str) -> dict:
    harness = _write_harness(tmpdir, 0)
    red_path = os.path.join(tmpdir, "red.log")
    with open(red_path, "w", encoding="utf-8") as f:
        f.write("2 failing before fix\n")
    return {
        "schema_version": "1.0",
        "artifact_type": "evidence_dossier",
        "target": tmpdir,
        "produced_by_role": "engineer",
        "layers": [
            {"layer": "E-L0", "eval_kind": "capability", "cases_total": 5, "cases_passed": 5, "verdict": "green", "notes": ""},
            {"layer": "E-L1", "eval_kind": "capability", "cases_total": 5, "cases_passed": 5, "verdict": "green", "notes": ""},
            {"layer": "E-L2", "eval_kind": "capability", "cases_total": 5, "cases_passed": 5, "verdict": "green", "notes": ""},
            {"layer": "E-L3", "eval_kind": "capability", "cases_total": 5, "cases_passed": 5, "verdict": "green", "notes": ""},
            {"layer": "E-L4", "eval_kind": "regression", "cases_total": 5, "cases_passed": 5, "verdict": "green", "notes": ""},
        ],
        "evaluator_calibration": [
            {
                "evaluator": "judge-A", "evaluator_kind": "llm_judge",
                "golden_sample_count": 20, "alignment_rate": 0.9,
                "model_baseline": "claude-opus-4.8", "unknown_rate": 0.05,
                "has_unknown_exit": True, "different_source_from_builder": True,
                "audit_dimensions": ["position bias", "style/verbosity bias"],
            }
        ],
        "red_light_history": {"red_artifact_path": red_path, "red_before_green": True, "kind": "failing_test_log"},
        "pressure_sentinels": [],
        "stop_conditions": {
            "hypothesis": "harness is sufficient", "pass_when": "3 clean rounds",
            "abandon_when": "budget exhausted", "budget": "5 rounds", "marginal_threshold": "2 rounds no new P1/P2",
        },
        "verification": {
            "harness_ran": True, "harness_path": harness, "all_required_passed": True,
            "command_output": "all green", "exit_code": 0,
        },
    }


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

        # each trap gets its own fresh tmpdir subfolder to avoid harness-file cross-talk
        caught = 0
        total = 0

        def run_trap(name, mutate_fn, harness_exit=0):
            nonlocal caught, total
            total += 1
            sub = tempfile.mkdtemp(dir=tmpdir)
            fixture = _green_fixture(sub)
            mutate_fn(fixture, sub)
            violations = validate(fixture, sub)
            if violations:
                caught += 1
            else:
                nonlocal_ok(name)

        def nonlocal_ok(name):
            nonlocal ok
            ok = False
            print(f"SELFTEST FAIL: trap '{name}' was NOT caught")

        run_trap("missing required layer E-L3", lambda f, s: f.update(layers=[l for l in f["layers"] if l["layer"] != "E-L3"]))
        run_trap("layer with blank verdict", lambda f, s: f["layers"][0].__setitem__("verdict", ""))
        run_trap("golden_sample_count == 0", lambda f, s: f["evaluator_calibration"][0].__setitem__("golden_sample_count", 0))
        run_trap("has_unknown_exit == false", lambda f, s: f["evaluator_calibration"][0].__setitem__("has_unknown_exit", False))
        run_trap("different_source_from_builder == false", lambda f, s: f["evaluator_calibration"][0].__setitem__("different_source_from_builder", False))
        run_trap("audit_dimensions missing style/verbosity", lambda f, s: f["evaluator_calibration"][0].__setitem__("audit_dimensions", ["position bias only"]))
        run_trap("red_before_green == false", lambda f, s: f["red_light_history"].__setitem__("red_before_green", False))
        run_trap("red_artifact_path missing on disk", lambda f, s: f["red_light_history"].__setitem__("red_artifact_path", os.path.join(s, "nope.log")))

        def empty_red_file(f, s):
            empty_path = os.path.join(s, "empty_red.log")
            open(empty_path, "w").close()  # touch: exists, 0 bytes
            f["red_light_history"]["red_artifact_path"] = empty_path
        run_trap("red_artifact_path exists but is empty (touched, 0 bytes)", empty_red_file)
        run_trap("stop_conditions.budget blank", lambda f, s: f["stop_conditions"].__setitem__("budget", ""))
        run_trap("harness_path does not exist", lambda f, s: f["verification"].__setitem__("harness_path", "nope.sh"))

        def stale_output(f, s):
            _write_harness(s, 1)  # harness now genuinely fails
            # record still claims success (as an engineer might paste stale output)
        run_trap("stale command_output (harness now fails, record claims pass)", stale_output)

        def wrong_recorded_exit(f, s):
            f["verification"]["exit_code"] = 1  # harness still exits 0 for real
        run_trap("recorded exit_code disagrees with genuine rerun", wrong_recorded_exit)

        # --- deterministic-evaluator exemption traps ---

        def deterministic_honest_neutral(f, s):
            f["evaluator_calibration"][0] = {
                "evaluator": "byte-diff", "evaluator_kind": "deterministic",
                "golden_sample_count": 20, "alignment_rate": 1.0,
                "different_source_from_builder": False, "has_unknown_exit": False,
                "model_baseline": "n/a", "audit_dimensions": [],
            }
        sub = tempfile.mkdtemp(dir=tmpdir)
        fixture = _green_fixture(sub)
        deterministic_honest_neutral(fixture, sub)
        violations = validate(fixture, sub)
        if violations:
            ok = False
            print("SELFTEST FAIL: deterministic evaluator with honest neutral fields was unexpectedly flagged:")
            for x in violations:
                print(f"  - {x}")
        else:
            print("selftest: sanity-pass 'deterministic evaluator, honest neutral judge-bias fields' ok")

        run_trap(
            "llm_judge evaluator with different_source_from_builder==false must still be caught",
            lambda f, s: f["evaluator_calibration"][0].__setitem__("different_source_from_builder", False),
        )

        run_trap(
            "deterministic evaluator with golden_sample_count==0 must be caught",
            lambda f, s: f["evaluator_calibration"][0].update(
                {"evaluator_kind": "deterministic", "golden_sample_count": 0}
            ),
        )

    print(f"selftest: 1 green ok, {caught}/{total} traps caught")
    return 0 if ok and caught == total else 1


def main() -> int:
    args = sys.argv[1:]
    if args == ["--selftest"]:
        return run_selftest()
    if not args:
        print("usage: validate_report.py <dossier.json> [--target-dir DIR] | --selftest", file=sys.stderr)
        return 2

    path = args[0]
    target_dir = None
    if "--target-dir" in args:
        idx = args.index("--target-dir")
        if idx + 1 >= len(args):
            print("--target-dir requires a value", file=sys.stderr)
            return 2
        target_dir = args[idx + 1]

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"FAIL: could not read/parse {path}: {e}")
        return 1

    if target_dir is None:
        target_dir = data.get("target") if isinstance(data.get("target"), str) and os.path.isdir(data.get("target", "")) else os.path.dirname(os.path.abspath(path))

    violations = validate(data, target_dir)
    if violations:
        for x in violations:
            print(x)
        return 1
    print(f"PASS: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
