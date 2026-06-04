#!/usr/bin/env python3
"""
Deterministic unit-test harness for the humanizer-academic AI-signal DETECTOR.

This harness is the skill's NON-LLM acceptance signal (harness_path). It does NOT
judge rewrite quality — that is the separate, behavioral blind judge
(evals/blind-judge-rubric.md). Here we only pin the detector's three-layer math
on crafted inputs.

CONTRACT (asserted by test_import_contract):
  The signal math lives ONLY in scripts/detect_ai_signals.py. This harness
  IMPORTS detect_signals / sentence_cv / etc. from there and never reimplements
  them. A harness that tests its own copy of the math proves nothing.

Run:  python3 evals/run_detector_tests.py
Exits non-zero if any case fails. Prints one `PASS <name>` / `FAIL <name>` line
per case.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make `scripts/` importable regardless of CWD.
_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
sys.path.insert(0, str(_ROOT / "scripts"))

import detect_ai_signals as D  # the single source of truth

# ----- tiny assertion runner ------------------------------------------------
_RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    _RESULTS.append((name, bool(cond), detail))


def approx(a: float, b: float, eps: float = 1e-9) -> bool:
    return abs(a - b) <= eps


# ===========================================================================
# 1. IMPORT CONTRACT — the harness must not reimplement the signal math.
# ===========================================================================
def test_import_contract() -> None:
    for fn in ("detect_signals", "sentence_cv", "tokenize", "split_sentences"):
        check(
            f"import_contract::{fn}_is_imported_from_scripts",
            hasattr(D, fn) and getattr(D, fn).__module__ == "detect_ai_signals",
            f"{fn} must be defined in scripts/detect_ai_signals.py",
        )
    # This file must not DEFINE its own signal math (top-level `def sentence_cv`
    # / `def tokenize`). Check for definitions at column 0 only, so this very
    # comment / assertion string does not trip the check.
    src_lines = Path(__file__).read_text(encoding="utf-8").splitlines()
    defines_math = any(
        ln.startswith("def sentence_cv") or ln.startswith("def tokenize")
        for ln in src_lines
    )
    check(
        "import_contract::harness_does_not_reimplement_cv",
        not defines_math,
        "harness reimplements detector math — single-source-of-truth violated",
    )


# ===========================================================================
# 2. STATISTICAL LAYER — burstiness CV (coefficient of variation).
#    CV = population_stdev / mean of sentence token-lengths. Higher = burstier.
# ===========================================================================
def test_statistical_cv() -> None:
    # 3 equal-length sentences -> zero variance -> CV == 0.0 exactly.
    eq = "alpha beta gamma. delta epsilon zeta. eta theta iota."
    check("cv::three_equal_sentences_is_zero",
          approx(D.sentence_cv(eq), 0.0), f"got {D.sentence_cv(eq)!r}")

    # Two sentences with token-lengths [2, 18]:
    #   mean = 10 ; population stdev = 8 ; CV = 8/10 = 0.8 exactly.
    two = "aa bb. " + " ".join(["w"] * 18) + "."
    check("cv::lengths_2_and_18_is_0_8",
          approx(D.sentence_cv(two), 0.8), f"got {D.sentence_cv(two)!r}")

    # Fewer than 2 sentences -> CV defined as 0.0.
    check("cv::single_sentence_is_zero",
          approx(D.sentence_cv("just one sentence here"), 0.0),
          f"got {D.sentence_cv('just one sentence here')!r}")

    # Ordering: a bursty (alternating long/short) text must have a STRICTLY
    # higher sentence_cv than a uniform text of the same sentence count.
    uniform = ". ".join([" ".join(["x"] * 10) for _ in range(6)]) + "."
    bursty_parts = []
    for i in range(6):
        bursty_parts.append(" ".join(["x"] * (2 if i % 2 == 0 else 20)))
    bursty = ". ".join(bursty_parts) + "."
    check("cv::bursty_gt_uniform",
          D.sentence_cv(bursty) > D.sentence_cv(uniform),
          f"bursty={D.sentence_cv(bursty)!r} uniform={D.sentence_cv(uniform)!r}")

    # Uniform text has CV exactly 0.0 (all sentences length 10).
    check("cv::uniform_is_zero",
          approx(D.sentence_cv(uniform), 0.0), f"got {D.sentence_cv(uniform)!r}")


# ===========================================================================
# 3. TOKENIZER — language-aware: 1 CJK char = 1 token; [A-Za-z0-9]+ = 1 token.
# ===========================================================================
def test_tokenizer() -> None:
    # 4 CJK chars + 1 latin run + 1 number run = 6 tokens.
    check("tok::mixed_cjk_latin_count",
          len(D.tokenize("香港经济 GDP 2025")) == 6,
          f"got {D.tokenize('香港经济 GDP 2025')!r}")
    # Pure latin: 3 word tokens.
    check("tok::three_english_words",
          len(D.tokenize("the quick fox")) == 3,
          f"got {D.tokenize('the quick fox')!r}")
    # Each CJK char is its own token (no whitespace needed).
    check("tok::cjk_chars_split",
          len(D.tokenize("发展态势")) == 4,
          f"got {D.tokenize('发展态势')!r}")


# ===========================================================================
# 4. SENTENCE SPLITTER — terminal punctuation [.!?;。！？；…] + newlines.
# ===========================================================================
def test_sentence_split() -> None:
    check("split::mixed_terminators",
          len(D.split_sentences("One. Two! Three? Four; done")) == 5,
          f"got {D.split_sentences('One. Two! Three? Four; done')!r}")
    check("split::cjw_terminators",
          len(D.split_sentences("第一句。第二句！第三句？")) == 3,
          f"got {D.split_sentences('第一句。第二句！第三句？')!r}")
    check("split::empties_dropped",
          len(D.split_sentences("a...\n\n  \nb.")) == 2,
          f"got {D.split_sentences('a...\\n\\nb.')!r}")


# ===========================================================================
# 5. LEXICAL LAYER — clean academic sentence has ~zero lexical hits;
#    a denylist-laden sentence has a pinned count by family.
# ===========================================================================
def test_lexical() -> None:
    clean = ("Real GDP grew by 6.4% in 2021 and contracted by 3.5% in 2022, "
             "while the unemployment rate fell from its pandemic peak.")
    lex = D.detect_signals(clean)["lexical"]
    total_clean = sum(v["count"] for v in lex.values())
    check("lex::clean_academic_zero_hits",
          total_clean == 0, f"got {total_clean} hits: {lex!r}")
    # BUG 2 (LOOP 1): this clean-academic fixture is ONE sentence. The decimal
    # interiors (6.4% / 3.5%) must NOT be split into sentence boundaries, so
    # n_sentences == 1 (was 3 before the splitter fix — inflating sentence_cv on
    # exactly the statistics-heavy academic domain). Tied to BUG 1's splitter fix.
    n_clean = D.detect_signals(clean)["statistical"]["n_sentences"]
    check("lex::clean_academic_is_one_sentence",
          n_clean == 1, f"got n_sentences={n_clean} for the clean-academic fixture")

    # 'pivotal', 'crucial', 'testament' -> 3 inflation hits.
    infl = "This was a pivotal and crucial moment, a testament to resilience."
    lex2 = D.detect_signals(infl)["lexical"]
    check("lex::three_inflation_hits",
          lex2["inflation"]["count"] == 3,
          f"got {lex2['inflation']!r}")

    # Vague attribution family: 'experts argue' + 'observers note' -> 2.
    vague = "Experts argue this matters; observers note the same trend."
    lex3 = D.detect_signals(vague)["lexical"]
    check("lex::two_vague_attribution_hits",
          lex3["vague_attribution"]["count"] == 2,
          f"got {lex3['vague_attribution']!r}")

    # Chinese officialese: '具有重要意义' + '起到重要作用' -> 2.
    zh = "本项目具有重要意义，并对发展起到重要作用。"
    lexzh = D.detect_signals(zh, language="zh")["lexical"]
    check("lex::two_zh_officialese_hits",
          lexzh["officialese"]["count"] == 2,
          f"got {lexzh['officialese']!r}")


# ===========================================================================
# 6. STRUCTURAL LAYER — rule-of-three triads counted exactly.
# ===========================================================================
def test_structural() -> None:
    # Exactly 2 EN negative-parallelism triads ("not just X, but Y").
    s = ("This is not just a recovery, but a reconfiguration. "
         "It was not merely growth, but transformation.")
    st = D.detect_signals(s)["structural"]
    check("struct::two_negative_parallelism",
          st["negative_parallelism"]["count"] == 2,
          f"got {st['negative_parallelism']!r}")

    # Exactly 1 Chinese 不是……而是…… construction.
    zh = "香港不是简单复苏，而是结构重构。"
    stzh = D.detect_signals(zh, language="zh")["structural"]
    check("struct::one_zh_negative_parallelism",
          stzh["negative_parallelism"]["count"] == 1,
          f"got {stzh['negative_parallelism']!r}")

    # Signpost scaffolding: 首先/其次/最后 -> 3 hits.
    zh2 = "首先，经济反弹。其次，疫情反复。最后，全面复苏。"
    stzh2 = D.detect_signals(zh2, language="zh")["structural"]
    check("struct::three_zh_signposts",
          stzh2["signpost"]["count"] == 3,
          f"got {stzh2['signpost']!r}")

    # Clean prose -> zero structural hits.
    clean = "The services surplus reached HK$168.9 billion in 2025."
    stc = D.detect_signals(clean)["structural"]
    total_struct = sum(v["count"] for v in stc.values())
    check("struct::clean_zero_structural",
          total_struct == 0, f"got {total_struct}: {stc!r}")


# ===========================================================================
# 6b. LOOP-1 BATTERY FIXES — bugs found by an independent battery in the
#     detector. Each block is RED before its fix, GREEN after.
# ===========================================================================
def test_battery_fixes() -> None:
    def n_sent(t, lang="auto"):
        return D.detect_signals(t, language=lang)["statistical"]["n_sentences"]

    # --- BUG 1: split_sentences must not shatter decimals / percentages /
    #     letter-dot abbreviation chains. A sentence-final '.' after a number
    #     STILL splits; an interior decimal dot does NOT.
    check("split::decimal_percent_one_sentence",
          n_sent("GDP grew 3.5% in 2021.") == 1,
          f"got n={n_sent('GDP grew 3.5% in 2021.')}")
    check("split::us_abbreviation_one_sentence",
          n_sent("The U.S. economy grew steadily last year.") == 1,
          f"got n={n_sent('The U.S. economy grew steadily last year.')}")
    check("split::zh_decimal_percent_one_sentence",
          n_sent("2021年GDP增长3.5%。", "zh") == 1,
          f"got n={n_sent('2021年GDP增长3.5%。', 'zh')}")
    # Realistic 3-sentence statistics paragraph (6.4% / 3.5% / 0.75 / U.S.):
    # exactly 3 sentences, and a sentence_cv pinned to the post-fix value.
    para3 = ("Real GDP grew 6.4% last year. It then fell 3.5% the next year, "
             "a 0.75 ratio. The U.S. recovery held.")
    check("split::three_sentence_stat_paragraph_n",
          n_sent(para3) == 3, f"got n={n_sent(para3)}")
    check("split::three_sentence_stat_paragraph_cv",
          approx(D.sentence_cv(para3), 0.36799, eps=5e-6),
          f"got sentence_cv={D.sentence_cv(para3)!r}")
    # A sentence-final period AFTER a number must STILL split (surgical fix).
    check("split::number_final_period_still_splits",
          len(D.split_sentences("Output rose in 2021. Then it fell.")) == 2,
          f"got {D.split_sentences('Output rose in 2021. Then it fell.')!r}")

    # --- BUG 3: bold-label list must catch the dominant `**Label:**` form
    #     (colon INSIDE the bold), incl. a leading list bullet, without
    #     double-counting the colon-outside `**Label**:` form.
    def bold(t):
        return D.detect_signals(t)["structural"]["bold_label_list"]["count"]
    check("struct::bold_label_colon_inside",
          bold("**Growth:** strong") == 1, f"got {bold('**Growth:** strong')}")
    check("struct::bold_label_colon_inside_bulleted",
          bold("- **Growth:** strong") == 1, f"got {bold('- **Growth:** strong')}")
    check("struct::bold_label_colon_outside_still_one",
          bold("**Growth**: strong") == 1, f"got {bold('**Growth**: strong')}")

    # --- BUG 4: a `rule_of_three` structural family must exist and fire on a
    #     three-item "X, Y, and/or Z" list (EN) / "甲、乙、丙" (ZH); a two-item
    #     list does NOT fire.
    def rot(t, lang="auto"):
        st = D.detect_signals(t, language=lang)["structural"]
        return st.get("rule_of_three", {}).get("count", -1)
    check("struct::rule_of_three_en_triad",
          rot("We need speed, accuracy, and clarity.") >= 1,
          f"got {rot('We need speed, accuracy, and clarity.')}")
    check("struct::rule_of_three_zh_triad",
          rot("速度、准确、清晰", "zh") >= 1,
          f"got {rot('速度、准确、清晰', 'zh')}")
    check("struct::rule_of_three_two_items_zero",
          rot("speed and clarity") == 0,
          f"got {rot('speed and clarity')}")

    # --- BUG 5: report_shell must catch common shell verbs beyond examines/
    #     analyzes/explores/investigates/discusses.
    def shell(t):
        return D.detect_signals(t)["structural"]["report_shell"]["count"]
    check("struct::report_shell_provides",
          shell("This paper provides a comprehensive analysis of the economy.") >= 1,
          f"got {shell('This paper provides a comprehensive analysis of the economy.')}")


# ===========================================================================
# 7. SHAPE / TOP-LEVEL CONTRACT — detect_signals returns the 3-layer map,
#    and is a pure DETECTOR (deterministic: same input -> same output).
# ===========================================================================
def test_shape_and_idempotency() -> None:
    text = ("This pivotal report examines growth. It is not just data, but a story. "
            "首先，增长强劲。具有重要意义。")
    out1 = D.detect_signals(text)
    out2 = D.detect_signals(text)
    for layer in ("lexical", "structural", "statistical"):
        check(f"shape::has_{layer}_layer", layer in out1, f"missing {layer}: {list(out1)}")
    check("shape::statistical_has_sentence_cv",
          "sentence_cv" in out1["statistical"], f"got {out1['statistical']!r}")
    check("shape::statistical_has_paragraph_cv",
          "paragraph_cv" in out1["statistical"], f"got {out1['statistical']!r}")
    # Detector is deterministic: re-running yields an identical map (it DETECTS,
    # it does not mutate / "humanize").
    check("shape::detector_is_idempotent_deterministic",
          out1 == out2, "detector output changed across identical calls")


# ===========================================================================
# 8. CLI CONTRACT — `python3 scripts/detect_ai_signals.py <file>` prints JSON.
# ===========================================================================
def test_cli() -> None:
    import json
    import subprocess
    import tempfile

    sample = "This pivotal moment is a testament to growth. 具有重要意义。"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False,
                                     encoding="utf-8") as fh:
        fh.write(sample)
        tmp = fh.name
    proc = subprocess.run(
        [sys.executable, str(_ROOT / "scripts" / "detect_ai_signals.py"), tmp],
        capture_output=True, text=True,
    )
    ok_exit = proc.returncode == 0
    parsed = None
    try:
        parsed = json.loads(proc.stdout)
    except Exception:
        parsed = None
    check("cli::exits_zero", ok_exit, f"exit={proc.returncode} stderr={proc.stderr[:200]}")
    check("cli::prints_three_layer_json",
          isinstance(parsed, dict) and {"lexical", "structural", "statistical"} <= set(parsed or {}),
          f"stdout head: {proc.stdout[:200]!r}")


def main() -> int:
    for t in (
        test_import_contract,
        test_statistical_cv,
        test_tokenizer,
        test_sentence_split,
        test_lexical,
        test_structural,
        test_battery_fixes,
        test_shape_and_idempotency,
        test_cli,
    ):
        try:
            t()
        except Exception as exc:  # a crash in one group still reports as FAILs
            check(f"{t.__name__}::raised", False, f"{type(exc).__name__}: {exc}")

    passed = 0
    for name, ok, detail in _RESULTS:
        if ok:
            print(f"PASS {name}")
            passed += 1
        else:
            print(f"FAIL {name} :: {detail}")
    total = len(_RESULTS)
    print(f"\n{passed}/{total} passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
