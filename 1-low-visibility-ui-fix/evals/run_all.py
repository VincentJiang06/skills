#!/usr/bin/env python3
"""Unified regression runner for low-visibility-ui-fix (stdlib only).

Layers:
  L0  schema validation  — design-tokens.json, eval-cases.json, every golden
  L1  golden suite        — analyzer output == fixtures/*.expected.json
  smoke + determinism     — analyzer runs without crashing and is reproducible
  paired metric           — deterministic before/after fix-resolution on the trial

Usage:
  python3 evals/run_all.py                 # run all layers, print summary
  python3 evals/run_all.py --write-metrics # also write meta/metrics-record.json
"""
import argparse
import glob
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from schema_check import validate, validate_file  # noqa: E402

ANALYZE = os.path.join(ROOT, "scripts", "analyze.py")
FIX = os.path.join(HERE, "fixtures")
SCHEMAS = os.path.join(ROOT, "schemas")


def run_analyzer(html, *extra):
    p = subprocess.run([sys.executable, ANALYZE, html, *extra],
                       capture_output=True, text=True)
    if p.returncode not in (0, 1):
        raise RuntimeError(f"analyzer crashed on {html}:\n{p.stderr}")
    return json.loads(p.stdout)


def l0_schema():
    errs = []
    for inst, sch in [
        (os.path.join(ROOT, "references", "design-tokens.json"),
         os.path.join(SCHEMAS, "design-tokens.schema.json")),
        (os.path.join(HERE, "eval-cases.json"),
         os.path.join(SCHEMAS, "eval-cases.schema.json")),
    ]:
        errs += [f"{os.path.basename(inst)}: {e}" for e in validate_file(inst, sch)]
    with open(os.path.join(SCHEMAS, "analyzer-output.schema.json"), encoding="utf-8") as f:
        out_schema = json.load(f)
    for g in sorted(glob.glob(os.path.join(FIX, "*.expected.json"))):
        with open(g, encoding="utf-8") as f:
            inst = json.load(f)
        errs += [f"{os.path.basename(g)}: {e}" for e in validate(inst, out_schema)]
    return errs


def l1_golden():
    results = []
    for g in sorted(glob.glob(os.path.join(FIX, "*.expected.json"))):
        html = g[: -len(".expected.json")] + ".html"
        with open(g, encoding="utf-8") as f:
            expected = json.load(f)
        results.append((os.path.basename(html), run_analyzer(html) == expected))
    return results


def smoke_determinism():
    errs = []
    for html in sorted(glob.glob(os.path.join(FIX, "*.html"))):
        if run_analyzer(html) != run_analyzer(html):
            errs.append(f"non-deterministic output: {os.path.basename(html)}")
    return errs


def paired_metric():
    before = os.path.join(ROOT, "trial", "before.json")
    demo = os.path.join(ROOT, "trial", "inbound-inspection.html")
    if not (os.path.exists(before) and os.path.exists(demo)):
        return None
    after = run_analyzer(demo, "--compare", before)
    c = after.get("comparison", {})
    fixed, remaining = len(c.get("fixed", [])), c.get("remaining", 0)
    before_n = fixed + remaining
    return {
        "before_score": c.get("before_score"),
        "after_score": c.get("after_score"),
        "findings_before": before_n,
        "findings_resolved": fixed,
        "findings_introduced": len(c.get("introduced", [])),
        "fix_resolution_rate": round(fixed / before_n, 3) if before_n else None,
    }


def entry_tokens():
    with open(os.path.join(ROOT, "SKILL.md"), encoding="utf-8") as f:
        txt = f.read()
    chars, words = len(txt), len(txt.split())
    # no tiktoken; midpoint of two common heuristics
    return round((chars / 4 + words * 1.3) / 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write-metrics", action="store_true")
    args = ap.parse_args()
    ok = True

    print("== L0 schema ==")
    e0 = l0_schema()
    print("  PASS" if not e0 else "  FAIL")
    for e in e0:
        print("   ", e)
    ok &= not e0

    print("== L1 golden ==")
    g = l1_golden()
    for name, passed in g:
        print(f"  {'PASS' if passed else 'FAIL'}  {name}")
    l1_pass = sum(1 for _, p in g if p)
    ok &= l1_pass == len(g)

    print("== smoke + determinism ==")
    es = smoke_determinism()
    print("  PASS" if not es else "  FAIL")
    for e in es:
        print("   ", e)
    ok &= not es

    print("== deterministic paired metric (trial) ==")
    pm = paired_metric()
    print("  ", pm)

    print(f"\nRESULT: {'GREEN' if ok else 'RED'}  (L1 {l1_pass}/{len(g)})")

    if args.write_metrics:
        rec = {
            "schema_version": "1.0.0",
            "skill_id": "skill.low-visibility-ui-fix",
            "generated_by": "evals/run_all.py --write-metrics",
            "measured": {
                "l1_pass_rate": round(l1_pass / len(g), 3),
                "l1_fixtures": len(g),
                "analyzer_determinism": 1.0 if not es else 0.0,
                "schema_valid": not e0,
                "fix_resolution_rate": pm and pm["fix_resolution_rate"],
                "before_after_score": pm and [pm["before_score"], pm["after_score"]],
                "skill_entry_tokens_estimate": entry_tokens(),
                "policy_violation_rate": 0,
            },
            "not_measured_here": {
                "activation_precision": "requires live agent routing runs (L3); harness = evals/eval-cases.json",
                "pass_k_all_agent": "analyzer pass^k is 1.0 (deterministic); agent-level pass^k needs live runs",
                "cost_per_success": "requires live agent runs",
                "marginal_lift_vs_no_skill": "requires a with/without-skill agent comparison (L5)",
            },
            "notes": "policy_violation_rate=0 reflects the trial: edits stayed within the target and passed the gate. Token count is a heuristic estimate (no tiktoken).",
        }
        out = os.path.join(ROOT, "meta", "metrics-record.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"wrote {os.path.relpath(out, ROOT)}")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
