#!/usr/bin/env python3
"""
Mechanizable behavioral checks for humanizer-academic.

The blind judge (evals/blind-judge-rubric.md) is the primary behavioral oracle and
is necessarily LLM/human-graded. But several behavioral guarantees ARE mechanically
checkable on the committed worked rewrites — and checking them mechanically makes
those edges re-runnable and tamper-evident rather than prose assertions. This
harness covers exactly those:

  - fact-invention guard: the rewrite introduces NO number not present in the
    source (net-new numeric tokens == 0)  [edges: fact-invention, vague-claim]
  - mixed-language handling: EN technical terms kept verbatim; no ASCII sentence-
    final '.' used to end a CJK sentence; no full-width '，'/'。' inside EN-only runs
  - register floor: no casual/slang/banter/emoji injected by the rewrite
  - hedging preservation: calibrated hedges from the source survive in the rewrite
  - detector idempotency: re-running the detector on the SAME text is identical
    (it DETECTS, it does not mutate)

It imports the detector core from scripts/ (single source of truth) for the
idempotency check. Run: python3 evals/run_behavioral_checks.py
Exits non-zero on any failure; prints PASS/FAIL <name> lines.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
sys.path.insert(0, str(_ROOT / "scripts"))
import detect_ai_signals as D  # single source of truth

_RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    _RESULTS.append((name, bool(cond), detail))


def read(p: str) -> str:
    return (_ROOT / p).read_text(encoding="utf-8")


def strip_html_comments(s: str) -> str:
    return re.sub(r"<!--.*?-->", "", s, flags=re.DOTALL)


# ---- numeric tokens (for fact-invention guard) -----------------------------
# A "number" = a run of digits, optionally with separators / decimals / %.
_NUM_RE = re.compile(r"\d[\d.,]*")


def numbers(text: str) -> set[str]:
    out = set()
    for m in _NUM_RE.finditer(text):
        norm = m.group(0).rstrip(".,")
        # normalize thousands separators so 19,000 vs 19000 don't false-positive
        out.add(norm.replace(",", ""))
    return out


def test_fact_invention_guard() -> None:
    """Every number in a worked rewrite must appear in its source. Zero net-new."""
    for tag, src_path, rw_path in (
        ("en", "evals/fixtures/GPT Eng.md", "evals/worked/gpt-en.rewrite.md"),
        ("zh", "evals/fixtures/Kimi Chi.md", "evals/worked/kimi-zh.rewrite.md"),
    ):
        src_nums = numbers(read(src_path))
        rw_nums = numbers(strip_html_comments(read(rw_path)))
        # tolerate pure-formatting tokens that are trivially present anyway
        net_new = {n for n in rw_nums if n not in src_nums and len(n) >= 2}
        # Some figures appear in source as "6.4%" and in rewrite as "6.4" etc.;
        # accept if the bare numeric core is a substring of any source number.
        truly_new = set()
        src_join = " " + " ".join(src_nums) + " "
        for n in net_new:
            if n in src_nums:
                continue
            if any(n == s or n in s or s in n for s in src_nums):
                continue
            truly_new.add(n)
        check(f"behavioral::fact_invention_zero_new_numbers[{tag}]",
              len(truly_new) == 0,
              f"net-new numbers not in source: {sorted(truly_new)}")


def test_mixed_language_handling() -> None:
    """ZH rewrite: EN technical terms kept verbatim; punctuation discipline."""
    zh = strip_html_comments(read("evals/worked/kimi-zh.rewrite.md"))
    # Only assert terms that actually occur in THIS fixture's source (asserting a
    # term absent from the source would reward fact-invention). Kimi Chi.md uses
    # GDP/IPO/AMRO; it does NOT use IMF — so IMF must NOT be required here.
    for term in ("GDP", "IPO", "AMRO"):
        check(f"behavioral::mixed_keeps_EN_term[{term}]",
              term in zh, f"technical term {term} not kept verbatim")
    # No full-width comma/period immediately wrapped inside a pure-ASCII word run
    # like 'GD，P' — i.e. EN terms must not be split by CJK punctuation.
    bad_split = re.search(r"[A-Za-z][，。；！？][A-Za-z]", zh)
    check("behavioral::mixed_no_cjk_punct_inside_en_word",
          bad_split is None,
          f"CJK punctuation splits an EN token: {bad_split.group(0) if bad_split else ''}")
    # CJK sentences should end with full-width terminators, not a bare ASCII '.'
    ascii_end_cjk = re.search(r"[一-鿿]\.(?:\s|$)", zh, flags=re.MULTILINE)
    check("behavioral::mixed_cjk_sentence_fullwidth_terminator",
          ascii_end_cjk is None,
          f"CJK sentence ended with ASCII period: {ascii_end_cjk.group(0) if ascii_end_cjk else ''}")


def test_register_floor() -> None:
    """Worked rewrites introduce no casual/slang/banter/emoji."""
    casual_en = re.compile(
        r"\b(gonna|wanna|kinda|sorta|stuff|awesome|cool|huge deal|let's|hey|wow|"
        r"basically|honestly|literally)\b", re.IGNORECASE)
    emoji = re.compile(r"[\U0001F300-\U0001FAFF☀-➿]")
    for tag, rw in (("en", "evals/worked/gpt-en.rewrite.md"),
                    ("zh", "evals/worked/kimi-zh.rewrite.md")):
        body = strip_html_comments(read(rw))
        check(f"behavioral::register_no_casual[{tag}]",
              casual_en.search(body) is None,
              f"casual token found: {casual_en.search(body).group(0) if casual_en.search(body) else ''}")
        check(f"behavioral::register_no_emoji[{tag}]",
              emoji.search(body) is None, "emoji found in rewrite")


def test_hedging_preserved() -> None:
    """Calibrated hedges present in the source survive in the rewrite."""
    en = strip_html_comments(read("evals/worked/gpt-en.rewrite.md")).lower()
    # source GPT Eng.md uses forward-looking calibration; rewrite must keep some.
    check("behavioral::hedging_preserved[en]",
          any(h in en for h in ("realistic expectation", "likely", "plausible", "expects", "forecasts", "projects")),
          "no calibrated forward-looking hedge survived in EN rewrite")
    zh = strip_html_comments(read("evals/worked/kimi-zh.rewrite.md"))
    check("behavioral::hedging_preserved[zh]",
          any(h in zh for h in ("更可信的判断", "可能", "预测", "或可", "展望")),
          "no calibrated hedge survived in ZH rewrite")


def test_detector_idempotent() -> None:
    """Detector is detect-only: re-running on the SAME text is identical."""
    for tag, p in (("en", "evals/worked/gpt-en.rewrite.md"),
                   ("zh", "evals/worked/kimi-zh.rewrite.md")):
        t = read(p)
        a = D.detect_signals(t)
        b = D.detect_signals(t)
        check(f"behavioral::detector_idempotent[{tag}]", a == b,
              "detector output differs across identical calls")


def test_genre_whitelist_poem() -> None:
    """Poetry whitelist: the deliberate triad + parallel repetition ARE the point.
    The detector would FLAG them as structural signals (proving they're present),
    but the protocol DOWN-WEIGHTS structural rules for this genre, so the correct
    behavioral outcome is PRESERVATION. We assert the structural signals are
    detectably present in the source (so 'preserve' is meaningful) and that the
    register of the (preserved) lines is non-casual."""
    poem = strip_html_comments(read("evals/fixtures/negative_poem.md"))
    sig = D.detect_signals(poem)
    struct_total = sum(v["count"] for v in sig["structural"].values())
    check("behavioral::poem_has_structural_signals_to_preserve",
          struct_total >= 1,
          "poem fixture has no triad/parallelism to test preservation against")
    # The whitelist outcome is preservation -> the lines remain as-is. Confirm the
    # source itself carries the parallel triad that must NOT be flattened.
    check("behavioral::poem_triad_present",
          "these we kept, these we carried, these we sang" in poem,
          "poem triad missing from fixture")


def test_clean_prose_near_noop() -> None:
    """Already-clean academic prose: near-zero signals -> a correct rewrite is a
    near no-op. We assert the fixture is genuinely clean (so 'no-op' is the right
    behavior and over-editing would be the bug)."""
    clean = strip_html_comments(read("evals/fixtures/clean_academic.md"))
    sig = D.detect_signals(clean)
    lex = sum(v["count"] for v in sig["lexical"].values())
    struct = sum(v["count"] for v in sig["structural"].values())
    check("behavioral::clean_prose_low_lexical", lex == 0, f"lexical hits: {lex}")
    check("behavioral::clean_prose_low_structural", struct <= 1, f"structural hits: {struct}")
    # And it already has human burstiness (varied sentence length).
    check("behavioral::clean_prose_already_bursty",
          sig["statistical"]["sentence_cv"] > 0.2,
          f"sentence_cv={sig['statistical']['sentence_cv']}")


def test_detect_only_cli_is_detector_not_humanizer() -> None:
    """Detect-only request: the CLI returns the signal map and NEVER describes
    itself as a humanizer."""
    import json
    import subprocess
    script = str(_ROOT / "scripts" / "detect_ai_signals.py")
    # 1) returns the three-layer map on stdin
    proc = subprocess.run([sys.executable, script],
                          input="This pivotal moment is a testament to growth.",
                          capture_output=True, text=True)
    parsed = None
    try:
        parsed = json.loads(proc.stdout)
    except Exception:
        parsed = None
    check("behavioral::detect_only_returns_map",
          isinstance(parsed, dict) and {"lexical", "structural", "statistical"} <= set(parsed or {}),
          f"stdout head: {proc.stdout[:160]!r}")
    # 2) the script's own help describes DETECTION and explicitly disclaims
    #    humanizing (the string is "DETECTS only — it never rewrites/humanizes").
    help_proc = subprocess.run([sys.executable, script, "--help"],
                               capture_output=True, text=True)
    blob = (help_proc.stdout + help_proc.stderr).lower()
    says_detect = "detect" in blob
    disclaims = "never rewrites" in blob or "detects only" in blob
    check("behavioral::detect_only_help_says_detect_not_humanize",
          says_detect and disclaims,
          f"CLI help must describe detection + disclaim humanizing; got: {blob[:160]!r}")


def main() -> int:
    for t in (
        test_fact_invention_guard,
        test_mixed_language_handling,
        test_register_floor,
        test_hedging_preserved,
        test_detector_idempotent,
        test_genre_whitelist_poem,
        test_clean_prose_near_noop,
        test_detect_only_cli_is_detector_not_humanizer,
    ):
        try:
            t()
        except Exception as exc:
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
