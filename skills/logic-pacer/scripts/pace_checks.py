#!/usr/bin/env python3
"""pace_checks.py — logic-pacer's DETERMINISTIC objective gates.

This script MEASURES and reports FLAGS over a (source, rewrite) pair. It is NOT the
success oracle: step-followability and voice are judged by a fresh-subagent blind
cold-reader (references/step-followability-probe.md), and the highest-cost failure —
a silent stance/claim inversion that keeps the same entities and proposition count
(Foucault constitutive -> merely descriptive) — is UNSCRIPTABLE by design and stays a
model-level invariant. See the note in `generic_fidelity`.

Gates:
  1. length ratio     non-whitespace chars(rewrite)/chars(source); target <= ~1.3x (a FLAG)
  2. generic fidelity ALWAYS ON, corpus-independent: every Latin-script token (names) and
                      every digit-run (dates/numbers) in the SOURCE must appear in the
                      rewrite. Works on ANY input.
  3. register terms   OPTIONAL, only with --terms FILE (JSON {protected_terms, downgrade_pairs}).
                      protected-term drops + register-downgrade swaps. WITHOUT --terms this
                      check is reported as NOT CHECKED (never silently "none/clean") — arbitrary
                      prose register is owed to the blind probe + model-level judgment.
  (supplement)        A small CJK anchor list adds coined-term presence checks when those anchors
                      appear in the source; it never fires on inputs that don't contain them.

Modes:
  pace_checks.py --source S --rewrite R [--terms T.json]           # measure, print FLAGS, exit 0
  pace_checks.py --source S --rewrite R [--terms T.json] --gate     # CI: non-zero on any violation
  pace_checks.py --source S --rewrite R --json                      # machine-readable
  pace_checks.py --selftest                                         # plant traps, prove discrimination

stdlib only; read-only; never writes or rewrites anything.
"""
from __future__ import annotations

import argparse
import json
import re
import sys

# Optional CJK coined-term supplement. NOT the always-on fidelity check (that is generic,
# below). Only flags an anchor that is actually present in the source, so it is silent on
# any input that doesn't contain it — it can never manufacture a false "clean".
CJK_ANCHOR_SUPPLEMENT = ["平均人", "印刷数字的雪崩", "驯服偶然"]

RATIO_MAX = 1.3

# A Latin-script token = a run of >=2 letters (optionally with internal . or -); skips stray
# single letters. A number token = a run of >=2 digits (dates/counts; skips lone digits).
_LATIN_RE = re.compile(r"[A-Za-z][A-Za-z.\-]*[A-Za-z]")
_NUM_RE = re.compile(r"\d{2,}")


def _nonspace_len(text: str) -> int:
    return sum(1 for ch in text if not ch.isspace())


def length_ratio(source: str, rewrite: str) -> float:
    s = _nonspace_len(source)
    if s == 0:
        return 0.0
    return _nonspace_len(rewrite) / s


def generic_fidelity(source: str, rewrite: str):
    """ALWAYS-ON, corpus-independent presence proxy: every Latin-script name and every
    digit-run in the source must survive in the rewrite. Catches a dropped attribution
    (Hacking, Clausius, ...) or a dropped date/number (1820, 1865, ...) on ANY input.

    It CANNOT catch a silent stance/claim inversion that preserves the name and the
    proposition count (constitutive->descriptive, a softened claim). That failure is
    owned by the model-level fidelity invariant + the blind step-followability probe,
    never by this script."""
    src_names = set(m.group(0) for m in _LATIN_RE.finditer(source))
    src_nums = set(m.group(0) for m in _NUM_RE.finditer(source))
    src_anchors = set(a for a in CJK_ANCHOR_SUPPLEMENT if a in source)
    missing = []
    for tok in sorted(src_names) + sorted(src_nums) + sorted(src_anchors):
        if tok not in rewrite:
            missing.append(tok)
    return missing


def load_terms(path):
    if not path:
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {
        "protected_terms": list(data.get("protected_terms", [])),
        "downgrade_pairs": [tuple(p) for p in data.get("downgrade_pairs", [])],
    }


def register_check(source: str, rewrite: str, terms):
    """OPTIONAL register/downgrade check. Returns (checked, dropped, downgraded).
    When no term list is supplied, checked=False and the caller must report NOT CHECKED
    (never a bare 'none')."""
    if not terms:
        return False, [], []
    dropped = [t for t in terms["protected_terms"] if t in source and t not in rewrite]
    downgraded = []
    for hi, lo in terms["downgrade_pairs"]:
        # flag only a NEW substitution: hi in source, lo in rewrite, lo NOT already in source
        if hi in source and lo in rewrite and lo not in source:
            downgraded.append(f"{hi}->{lo}")
    return True, dropped, downgraded


def run_checks(source: str, rewrite: str, terms=None) -> dict:
    ratio = length_ratio(source, rewrite)
    missing_entities = generic_fidelity(source, rewrite)
    terms_checked, dropped, downgraded = register_check(source, rewrite, terms)

    violations = []
    if ratio > RATIO_MAX:
        violations.append(f"length ratio {ratio:.3f}x > {RATIO_MAX}x (padding-vs-real-step review)")
    for e in missing_entities:
        violations.append(f"source name/number/anchor missing: 「{e}」")
    if terms_checked:
        for t in dropped:
            violations.append(f"protected term dropped: 「{t}」")
        for d in downgraded:
            violations.append(f"register downgrade (对齐词汇): {d}")

    return {
        "ratio": round(ratio, 3),
        "ratio_flag": ratio > RATIO_MAX,
        "missing_entities": missing_entities,
        "terms_checked": terms_checked,
        "dropped_terms": dropped,
        "downgraded_terms": downgraded,
        "violations": violations,
        "clean": len(violations) == 0,
    }


def print_report(result: dict) -> None:
    print("== logic-pacer pace_checks (FLAGS, not a verdict) ==")
    flag = "FLAG" if result["ratio_flag"] else "ok"
    print(f"length ratio        : {result['ratio']}x   [{flag} vs {RATIO_MAX}x target]")
    print(f"missing names/nums  : {result['missing_entities'] or 'none'}")
    if result["terms_checked"]:
        print(f"dropped terms       : {result['dropped_terms'] or 'none'}")
        print(f"register downgrade  : {result['downgraded_terms'] or 'none'}")
    else:
        print("dropped terms       : not checked (no --terms)")
        print("register downgrade  : not checked (no --terms; subjective register is owed to the "
              "blind probe + model-level judgment)")
    if result["clean"]:
        checked = ("generic fidelity clean; register/downgrade clean" if result["terms_checked"]
                   else "generic fidelity clean; register/downgrade NOT CHECKED (supply --terms or rely on the blind probe)")
        print(f"objective gates     : {checked}")
    else:
        print("objective gates     : VIOLATIONS ->")
        for v in result["violations"]:
            print(f"   - {v}")
    print("NOTE: a silent stance/claim inversion is invisible here by design "
          "(same entities, same count). It is a model-level invariant + the blind probe.")


# --------------------------------------------------------------------------
# selftest: plant traps, prove each gate discriminates
# --------------------------------------------------------------------------

SELFTEST_SOURCE = (
    "这一步的分量在于一个悄悄的翻转：钟形曲线原本描述的是误差，是我们不想要的杂音；"
    "国家要治理人口，Foucault 讲过，先有了这些数字，一个可被治理的社会才被看见，"
    "这是一种权力动作。Hacking 在《驯服偶然》里讲的印刷数字的雪崩就是起点。"
)
SELFTEST_TERMS = {
    "protected_terms": ["分量", "翻转", "杂音", "误差", "权力动作", "治理", "印刷数字的雪崩", "驯服偶然"],
    "downgrade_pairs": [("杂音", "噪音"), ("分量", "重要性"), ("翻转", "变化")],
}

# a NON-Quetelet source proving the generic check is corpus-independent (the breach case)
SELFTEST_OFFCORPUS_SRC = "物理学家 Clausius 在 1865 年提出了熵增原理，孤立系统的熵不会自发减少。"


def run_selftest() -> int:
    ok = True
    total = 0
    caught = 0

    def check(name: str, condition: bool):
        nonlocal ok, total, caught
        total += 1
        if condition:
            caught += 1
        else:
            ok = False
            print(f"SELFTEST FAIL: {name}")

    # positive: identical text is clean (ratio 1.0, no drop/downgrade/missing) WITH terms
    clean = run_checks(SELFTEST_SOURCE, SELFTEST_SOURCE, SELFTEST_TERMS)
    check("clean positive (identical, with terms) has zero violations", clean["clean"])

    # trap A — padding balloon
    padded = SELFTEST_SOURCE + "如我们所知，让我们一步步来看，" * 12
    ra = run_checks(SELFTEST_SOURCE, padded, SELFTEST_TERMS)
    check("trap A padding: ratio flag fires", ra["ratio_flag"])

    # trap B — vocabulary downgrade (needs --terms)
    downgraded = (SELFTEST_SOURCE.replace("杂音", "噪音").replace("分量", "重要性").replace("翻转", "变化"))
    rb = run_checks(SELFTEST_SOURCE, downgraded, SELFTEST_TERMS)
    check("trap B downgrade: >=1 downgrade flag", len(rb["downgraded_terms"]) >= 1)
    check("trap B downgrade: dropped-term flag on swapped-out higher term", "杂音" in rb["dropped_terms"])

    # trap C — dropped fidelity anchors (CJK supplement, always-on)
    stripped = (SELFTEST_SOURCE.replace("印刷数字的雪崩", "那件事").replace("《驯服偶然》", "那本书"))
    rc = run_checks(SELFTEST_SOURCE, stripped, SELFTEST_TERMS)
    check("trap C: 印刷数字的雪崩 flagged missing", "印刷数字的雪崩" in rc["missing_entities"])
    check("trap C: 驯服偶然 flagged missing", "驯服偶然" in rc["missing_entities"])

    # trap D — dropped Latin name (generic, always-on)
    no_name = SELFTEST_SOURCE.replace("Foucault", "有个哲学家").replace("Hacking", "有个学者")
    rd = run_checks(SELFTEST_SOURCE, no_name, SELFTEST_TERMS)
    check("trap D: dropped Latin name Foucault flagged (generic)", "Foucault" in rd["missing_entities"])

    # BREACH regression — OFF-CORPUS, NO terms: generic still catches dropped name+date,
    # and register downgrade must report NOT CHECKED (never silently clean).
    off_rewrite = "有位物理学家很早就提出了熵变原理，说封闭系统的混乱程度不会自己减少。"  # drops Clausius + 1865
    ro = run_checks(SELFTEST_OFFCORPUS_SRC, off_rewrite, None)
    check("BREACH off-corpus: dropped name Clausius flagged generically (no terms)", "Clausius" in ro["missing_entities"])
    check("BREACH off-corpus: dropped date 1865 flagged generically (no terms)", "1865" in ro["missing_entities"])
    check("BREACH off-corpus: terms_checked is False (register NOT silently checked)", ro["terms_checked"] is False)
    check("BREACH off-corpus: not clean (does NOT print all-clean)", ro["clean"] is False)

    # HONESTY: name/date preserved but a register downgrade present -> generic clean, yet
    # terms_checked stays False so the report says register NOT CHECKED, never 'clean-green'.
    off_safe_names = "Clausius 在 1865 年说，熵变原理是封闭系统混乱程度不会自己减少。"
    rs = run_checks(SELFTEST_OFFCORPUS_SRC, off_safe_names, None)
    check("HONESTY: name/date preserved -> generic clean, but terms_checked False (register unproven)",
          rs["clean"] and rs["terms_checked"] is False)

    # boundary honesty: stance inversion is NOT claimed caught
    inverted = SELFTEST_SOURCE.replace("先有了这些数字，一个可被治理的社会才被看见", "这些数字帮助我们更好地理解社会")
    ri = run_checks(SELFTEST_SOURCE, inverted, SELFTEST_TERMS)
    check("boundary honesty: no gate claims to detect the stance inversion",
          all("stance" not in v.lower() for v in ri["violations"]))

    print(f"pace_checks selftest: {caught}/{total} discrimination checks passed")
    return 0 if ok else 1


def main() -> int:
    p = argparse.ArgumentParser(description="logic-pacer deterministic objective gates")
    p.add_argument("--source")
    p.add_argument("--rewrite")
    p.add_argument("--terms", help="optional JSON {protected_terms, downgrade_pairs} for register check")
    p.add_argument("--gate", action="store_true", help="exit non-zero on any hard violation (CI)")
    p.add_argument("--json", action="store_true")
    p.add_argument("--selftest", action="store_true")
    args = p.parse_args()

    if args.selftest:
        return run_selftest()

    if not (args.source and args.rewrite):
        p.error("need --source and --rewrite (or --selftest)")

    with open(args.source, encoding="utf-8") as f:
        source = f.read()
    with open(args.rewrite, encoding="utf-8") as f:
        rewrite = f.read()
    terms = load_terms(args.terms)

    result = run_checks(source, rewrite, terms)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print_report(result)

    if args.gate and not result["clean"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
