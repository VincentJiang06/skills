#!/usr/bin/env python3
"""pace_checks.py — logic-pacer's deterministic EVIDENCE producer (FLAGS, never a verdict).

This script MEASURES and reports FLAGS over a (source, rewrite) pair for the model to
adjudicate. It never decides pass/fail and always exits 0 on a readable pair. It is NOT the
success oracle: step-followability and voice are judged by a fresh-subagent blind
cold-reader (references/step-followability-probe.md), and the highest-cost failure —
a silent stance/claim inversion that keeps the same entities and proposition count
(Foucault constitutive -> merely descriptive) — is UNSCRIPTABLE by design and stays a
model-level invariant. See the note in `generic_fidelity`.

Measurements:
  1. length ratio     non-whitespace chars(rewrite)/chars(source); target <= ~1.3x (a FLAG)
  2. token presence   ALWAYS ON, corpus-independent. Candidates are chosen by orthographic
                      structure only (no word lists, no NER):
                        - every digit-run (>=2 digits) — dates/numbers;
                        - CJK-dominant source (CJK chars >= Latin letters): every Latin token
                          (in Chinese prose a Latin token is almost always a name/term);
                        - Latin-dominant source: only tokens with an uppercase letter that are
                          NOT sentence-initial, plus tokens with internal caps (AI, GPQA, GitHub).
                          Sentence-initial names are NOT checked — the report says so.
                      A candidate absent (verbatim substring) from the rewrite is a FLAG.
  3. register terms   OPTIONAL, only with --terms FILE (JSON {protected_terms, downgrade_pairs}).
                      protected-term drops + register-downgrade swaps. WITHOUT --terms this
                      check is reported as NOT CHECKED (never silently "none/clean") — arbitrary
                      prose register is owed to the blind probe + model-level judgment.
  (supplement)        A small CJK anchor list adds coined-term presence checks when those anchors
                      appear in the source; it never fires on inputs that don't contain them.

Modes:
  pace_checks.py --source S --rewrite R [--terms T.json]           # measure, print FLAGS, exit 0
  pace_checks.py --source S --rewrite R --json                      # machine-readable, exit 0
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
_CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
_LETTER_RE = re.compile(r"[A-Za-z]")
# Orthographic definition of a sentence start: text start, a line break, or terminal
# punctuation before the token, after peeling opening quotes/brackets/list markers.
_TERMINALS = ".!?。！？…"
_OPENERS = "\"'([{“‘「『《〈*_#-"
RULE_CJK = "CJK-dominant source: every Latin token + every digit-run"
RULE_LATIN = ("Latin-dominant source: capitalised non-sentence-initial tokens + internal-caps "
              "tokens + every digit-run; sentence-initial names are NOT script-checked")


def _nonspace_len(text: str) -> int:
    return sum(1 for ch in text if not ch.isspace())


def length_ratio(source: str, rewrite: str) -> float:
    s = _nonspace_len(source)
    if s == 0:
        return 0.0
    return _nonspace_len(rewrite) / s


def cjk_dominant(text: str) -> bool:
    return len(_CJK_RE.findall(text)) >= len(_LETTER_RE.findall(text))


def _sentence_initial(text: str, start: int) -> bool:
    before = text[:start]
    head = before.rstrip()
    while head and head[-1] in _OPENERS:
        head = head[:-1].rstrip()
    return not head or head[-1] in _TERMINALS or "\n" in before[len(head):]


def candidates(source: str) -> dict:
    """Which source tokens the presence check covers — orthographic structure only."""
    if cjk_dominant(source):
        latin, rule = [m.group(0) for m in _LATIN_RE.finditer(source)], RULE_CJK
    else:
        latin, rule = [], RULE_LATIN
        for m in _LATIN_RE.finditer(source):
            t = m.group(0)
            if any(c.isupper() for c in t[1:]) or (t[0].isupper() and not _sentence_initial(source, m.start())):
                latin.append(t)
    return {"latin": sorted(set(latin)), "nums": sorted(set(_NUM_RE.findall(source))),
            "anchors": sorted(a for a in CJK_ANCHOR_SUPPLEMENT if a in source), "rule": rule}


def generic_fidelity(source: str, rewrite: str):
    """ALWAYS-ON, corpus-independent presence proxy over the candidates() above. Catches a
    dropped attribution (Hacking, Clausius, ...) or a dropped date/number (1820, 1865, ...);
    each absent token is EVIDENCE for the model to adjudicate (dropped name vs legitimate
    trim), never a verdict. On a Latin-dominant source a sentence-initial name is not a
    candidate, so zero hits there is NOT a fidelity certificate.

    It CANNOT catch a silent stance/claim inversion that preserves the name and the
    proposition count (constitutive->descriptive, a softened claim). That failure is
    owned by the model-level fidelity invariant + the blind step-followability probe,
    never by this script."""
    c = candidates(source)
    return [tok for tok in c["latin"] + c["nums"] + c["anchors"] if tok not in rewrite]


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

    flags = []
    if ratio > RATIO_MAX:
        flags.append(f"length ratio {ratio:.3f}x > {RATIO_MAX}x (padding-vs-real-step review)")
    for e in missing_entities:
        flags.append(f"absent from rewrite: 「{e}」 (adjudicate: dropped name/number/attribution, or legitimate trim)")
    if terms_checked:
        for t in dropped:
            flags.append(f"protected term dropped: 「{t}」")
        for d in downgraded:
            flags.append(f"register downgrade (对齐词汇): {d}")

    return {
        "ratio": round(ratio, 3),
        "ratio_flag": ratio > RATIO_MAX,
        "candidate_rule": candidates(source)["rule"],
        "missing_entities": missing_entities,
        "terms_checked": terms_checked,
        "dropped_terms": dropped,
        "downgraded_terms": downgraded,
        "flags": flags,
        "no_flags": len(flags) == 0,
    }


def print_report(result: dict) -> None:
    print("== logic-pacer pace_checks (FLAGS = evidence to adjudicate, not a verdict) ==")
    flag = "FLAG" if result["ratio_flag"] else "ok"
    print(f"length ratio        : {result['ratio']}x   [{flag} vs {RATIO_MAX}x target]")
    print(f"candidates          : {result['candidate_rule']}")
    print(f"absent from rewrite : {result['missing_entities'] or 'none of the candidates'}")
    if result["terms_checked"]:
        print(f"dropped terms       : {result['dropped_terms'] or 'none'}")
        print(f"register downgrade  : {result['downgraded_terms'] or 'none'}")
    else:
        print("dropped terms       : not checked (no --terms)")
        print("register downgrade  : not checked (no --terms; subjective register is owed to the "
              "blind probe + model-level judgment)")
    if result["no_flags"]:
        print("flags               : none raised (NOT a fidelity certificate: see NOTE)")
    else:
        print(f"flags               : {len(result['flags'])} ->")
        for v in result["flags"]:
            print(f"   - {v}")
    print("NOTE: a silent stance/claim inversion is invisible here by design (same entities, same "
          "count), and uncovered tokens are unchecked. Fidelity is a model-level re-read + the blind probe.")


# --------------------------------------------------------------------------
# selftest: plant traps, prove each check discriminates
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
    check("clean positive (identical, with terms) has zero flags", clean["no_flags"])

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
    check("BREACH off-corpus: not clean (does NOT print all-clean)", ro["no_flags"] is False)

    # HONESTY: name/date preserved but a register downgrade present -> generic clean, yet
    # terms_checked stays False so the report says register NOT CHECKED, never 'clean-green'.
    off_safe_names = "Clausius 在 1865 年说，熵变原理是封闭系统混乱程度不会自己减少。"
    rs = run_checks(SELFTEST_OFFCORPUS_SRC, off_safe_names, None)
    check("HONESTY: name/date preserved -> generic clean, but terms_checked False (register unproven)",
          rs["no_flags"] and rs["terms_checked"] is False)

    # boundary honesty: stance inversion is NOT claimed caught
    inverted = SELFTEST_SOURCE.replace("先有了这些数字，一个可被治理的社会才被看见", "这些数字帮助我们更好地理解社会")
    ri = run_checks(SELFTEST_SOURCE, inverted, SELFTEST_TERMS)
    check("boundary honesty: no check claims to detect the stance inversion",
          all("stance" not in v.lower() for v in ri["flags"]))

    # ENGLISH traps (1.1.0) — the Latin-dominant candidate rule
    e_src = "It is widely argued that we should, in fact, have quite a lot of trust in averages. Therefore Quetelet's average man became an ideal by 1840."
    e_trim = "Many trust averages. An average describes the center of the errors; Quetelet then read that center as a type, so by 1840 his average man was an ideal."
    r1 = run_checks(e_src, e_trim, None)
    check("e1 English ordinary-word trim: zero token hits, rule says sentence-initial NOT checked",
          r1["missing_entities"] == [] and "NOT script-checked" in r1["candidate_rule"])
    check("e2 English mid-sentence name drop flagged",
          "Quetelet" in run_checks(e_src, e_src.replace("Quetelet's", "the"), None)["missing_entities"])
    check("e3 English digit-run drop flagged",
          "1840" in run_checks(e_src, e_src.replace(" by 1840", ""), None)["missing_entities"])

    print(f"pace_checks selftest: {caught}/{total} discrimination checks passed")
    return 0 if ok else 1


def main() -> int:
    p = argparse.ArgumentParser(description="logic-pacer evidence producer (FLAGS, never a verdict)")
    p.add_argument("--source")
    p.add_argument("--rewrite")
    p.add_argument("--terms", help="optional JSON {protected_terms, downgrade_pairs} for register check")
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
    return 0


if __name__ == "__main__":
    sys.exit(main())
