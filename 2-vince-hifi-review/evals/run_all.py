#!/usr/bin/env python3
"""Regression runner for 2-vince-hifi-review (stdlib only).
L0 schema (references + eval-cases + every golden) | L1 golden (engines == *.expected.json)
| determinism | output-gate (good passes, bad fails) | SKILL.md token budget.

Usage: python3 evals/run_all.py
"""
import glob, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from schema_check import validate, validate_file  # noqa: E402

SCH = os.path.join(ROOT, "schemas")
FIX = os.path.join(HERE, "fixtures")


def run(*a):
    p = subprocess.run([sys.executable, *a], capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def l0():
    errs = []
    pairs = [("references/band-taxonomy.json", "schemas/band-taxonomy.schema.json"),
             ("references/targets.json", "schemas/targets.schema.json"),
             ("references/source-gear-thresholds.json", "schemas/source-gear-thresholds.schema.json"),
             ("references/source-registry.json", "schemas/source-registry.schema.json"),
             ("evals/eval-cases.json", "schemas/eval-cases.schema.json")]
    for inst, sch in pairs:
        errs += [f"{inst}: {e}" for e in validate_file(os.path.join(ROOT, inst), os.path.join(ROOT, sch))]
    fr_s = json.load(open(os.path.join(SCH, "fr-analysis.schema.json")))
    for g in glob.glob(os.path.join(FIX, "*_*.expected.json")):
        if any(x in g for x in ("dac", "amp", "eval_", "compare", "infer")):
            continue
        errs += [f"{os.path.basename(g)}: {e}" for e in validate(json.load(open(g)), fr_s)]
    cmp_s = json.load(open(os.path.join(SCH, "compare-analysis.schema.json")))
    cg = os.path.join(FIX, "compare_warm_vs_vshape.expected.json")
    errs += [f"compare: {e}" for e in validate(json.load(open(cg)), cmp_s)]
    inf_s = json.load(open(os.path.join(SCH, "infer-analysis.schema.json")))
    ig = os.path.join(FIX, "infer_jm1_5128.expected.json")
    errs += [f"infer: {e}" for e in validate(json.load(open(ig)), inf_s)]
    src_s = json.load(open(os.path.join(SCH, "source-analysis.schema.json")))
    for g in ("transparent_dac.expected.json", "weak_amp_300ohm.expected.json"):
        errs += [f"{g}: {e}" for e in validate(json.load(open(os.path.join(FIX, g))), src_s)]
    return errs


def l1():
    res = []
    for g in sorted(glob.glob(os.path.join(FIX, "*.expected.json"))):
        base = os.path.basename(g)
        if base in ("eval_good.json", "eval_bad_untraced.json") or base.startswith(("compare", "infer")):
            continue
        if base.endswith("_dac.expected.json") or base.endswith("amp_300ohm.expected.json"):
            inp = json.load(open(g[:-len(".expected.json")] + ".json"))
            args = [os.path.join(ROOT, "scripts", "source_analyze.py"),
                    "--device", inp["device"], "--class", inp["class"],
                    "--sinad", str(inp["sinad"]), "--thdn", str(inp["thdn"]), "--snr", str(inp["snr"]),
                    "--zout", str(inp["zout"]), "--power", inp["power"],
                    "--target-z", str(inp["target_z"]), "--target-sens", str(inp["target_sens"])]
        else:
            csvf = g[:-len(".expected.json")] + ".csv"
            exp = json.load(open(g))
            args = [os.path.join(ROOT, "scripts", "fr_analyze.py"), csvf,
                    "--target", exp["target"], "--rig", exp["rig"],
                    "--device", exp["device"], "--category", exp["category"]]
        rc, out, err = run(*args)
        ok = rc == 0 and json.loads(out) == json.load(open(g))
        res.append((base, ok))
    return res


def gate():
    vo = os.path.join(ROOT, "scripts", "validate_output.py")
    rc_good, _, _ = run(vo, os.path.join(FIX, "eval_good.json"))
    rc_bad, _, _ = run(vo, os.path.join(FIX, "eval_bad_untraced.json"))
    rc_inaud, _, _ = run(vo, os.path.join(FIX, "eval_inaudible_ok.json"))  # "inaudible" must NOT fail
    return rc_good == 0 and rc_bad == 1 and rc_inaud == 0


def longform():
    rc, _, _ = run(os.path.join(ROOT, "scripts", "check_longform.py"),
                   os.path.join(FIX, "longform_warm_iem.md"), "--class", "transducer",
                   "--backing", os.path.join(FIX, "longform_warm_iem.evaluation.json"))
    return rc == 0


def compare_layer():
    rc, out, _ = run(os.path.join(ROOT, "scripts", "compare.py"),
                     os.path.join(FIX, "warm_iem.csv"), os.path.join(FIX, "vshape_tws.csv"),
                     "--target", "harman_ie_2019", "--device-a", "WarmIEM", "--device-b", "VShapeTWS",
                     "--rig-a", "iec711", "--rig-b", "iec711", "--category-a", "iem", "--category-b", "tws")
    if rc != 0:
        return False
    golden = json.load(open(os.path.join(FIX, "compare_warm_vs_vshape.expected.json")))
    return json.loads(out) == golden


def infer_layer():
    rc, out, _ = run(os.path.join(ROOT, "scripts", "infer_target.py"),
                     os.path.join(FIX, "infer_jm1_5128.csv"), "--rig", "bk5128",
                     "--device", "Example 5128 IEM", "--category", "iem")
    if rc != 0:
        return False
    golden = json.load(open(os.path.join(FIX, "infer_jm1_5128.expected.json")))
    return json.loads(out) == golden


def entry_tokens():
    txt = open(os.path.join(ROOT, "SKILL.md"), encoding="utf-8").read()
    return round((len(txt) / 4 + len(txt.split()) * 1.3) / 2)


def main():
    ok = True
    print("== L0 schema ==")
    e0 = l0()
    print("  PASS" if not e0 else "  FAIL")
    for e in e0:
        print("   ", e)
    ok &= not e0

    print("== L1 golden ==")
    g = l1()
    for n, p in g:
        print(f"  {'PASS' if p else 'FAIL'}  {n}")
    ok &= all(p for _, p in g)

    print("== output gate ==")
    gg = gate()
    print("  PASS" if gg else "  FAIL")
    ok &= gg

    print("== long-form 评测长文 ==")
    lf = longform()
    print("  PASS" if lf else "  FAIL")
    ok &= lf

    print("== compare engine ==")
    cmp_ok = compare_layer()
    print("  PASS" if cmp_ok else "  FAIL")
    ok &= cmp_ok

    print("== target inference ==")
    inf_ok = infer_layer()
    print("  PASS" if inf_ok else "  FAIL")
    ok &= inf_ok

    print("== SKILL.md tokens ==")
    if os.path.exists(os.path.join(ROOT, "SKILL.md")):
        t = entry_tokens()
        # Budget 1000: bilingual (中/EN) trigger surface + two device-class
        # protocol. Everything heavy is on-demand in rules/references.
        print(f"  {t} (budget 1000)")
        ok &= t < 1000
    else:
        print("  (SKILL.md not present yet)")
        ok = False

    print(f"\nRESULT: {'GREEN' if ok else 'RED'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
