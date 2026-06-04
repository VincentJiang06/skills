#!/usr/bin/env python3
"""
detect_ai_signals — a DETECTOR for AI-writing signals in academic prose.

It DETECTS only. It returns a three-layer signal map; it never rewrites text and
must never be described as a "humanizer". The rewrite is performed by the LLM
following SKILL.md; this module is a measurement instrument and a diagnostic
dashboard — explicitly NOT the pass/fail oracle for rewrite quality (that is the
independent blind judge in evals/blind-judge-rubric.md).

Three layers returned by `detect_signals(text, language="auto")`:
  - "lexical":     {family: {"count": int, "hits": [str, ...]}}   regex word/phrase families
  - "structural":  {family: {"count": int, "hits": [str, ...]}}   pattern families (rule_of_three triads, signposts, negative_parallelism, bold_label_list, report_shell, ...)
  - "statistical": {"sentence_cv": float, "paragraph_cv": float,
                    "n_sentences": int, "n_paragraphs": int,
                    "mean_sentence_len": float, "mean_paragraph_len": float}

Tokenization (language-aware, deterministic):
  a token = one CJK char [一-鿿] OR one run of [A-Za-z0-9]+.
Sentence split: on terminal punctuation [.!?;。！？；…] and newlines; empties dropped.
Burstiness statistic = coefficient of variation (CV) = population_stdev / mean of
sentence token-lengths. If <2 sentences, CV = 0.0. Higher CV = burstier = more
human. Paragraph CV is the same statistic over paragraph token-lengths.

NOTE ON PROVENANCE: every pattern family below is an AUTHORED HEURISTIC, not a
sourced/learned classifier. See references/*.md (all marked authored heuristics).

CLI:  python3 scripts/detect_ai_signals.py [FILE]   # or stdin
      prints the JSON signal map.
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

# --------------------------------------------------------------------------- #
# Tokenization + segmentation (the deterministic spine)                       #
# --------------------------------------------------------------------------- #
_CJK = r"一-鿿"
_TOKEN_RE = re.compile(rf"[{_CJK}]|[A-Za-z0-9]+")
_SENT_SPLIT_RE = re.compile(rf"[.!?;。！？；…\n]+")
_PARA_SPLIT_RE = re.compile(r"\n[ \t]*\n+")


def tokenize(text: str, language: str = "auto") -> list[str]:
    """One CJK char = one token; one [A-Za-z0-9]+ run = one token."""
    return _TOKEN_RE.findall(text or "")


def split_sentences(text: str) -> list[str]:
    """Split on terminal punctuation + newlines; drop empties/whitespace-only.

    A dot that is INTERIOR to a number (``3.5``, ``0.75``, ``$1.2``) or part of a
    letter-dot abbreviation chain (``U.S.``, ``e.g.``, ``i.e.``) is NOT a sentence
    boundary — masking it before the split keeps statistics-heavy academic prose
    from being shattered (which would inflate n_sentences and sentence_cv). A
    sentence-final ``.`` after a number (``…in 2021.``) still splits.
    """
    if not text:
        return []
    # protect decimal interiors: a dot BETWEEN two digits is not a boundary.
    masked = re.sub(r"(?<=\d)\.(?=\d)", "\x00", text)
    # protect abbreviation chains like U.S. / U.S.A. / e.g. / i.e. : mask every
    # dot in a run of (letter dot){2,}.
    masked = re.sub(r"\b(?:[A-Za-z]\.){2,}",
                    lambda m: m.group(0).replace(".", "\x00"), masked)
    parts = _SENT_SPLIT_RE.split(masked)
    return [s for s in (p.replace("\x00", ".").strip() for p in parts) if s]


def split_paragraphs(text: str) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in _PARA_SPLIT_RE.split(text.strip()) if p.strip()]


def _cv(lengths: list[int]) -> float:
    """Coefficient of variation = population_stdev / mean. <2 items -> 0.0."""
    if len(lengths) < 2:
        return 0.0
    mean = statistics.fmean(lengths)
    if mean == 0:
        return 0.0
    return statistics.pstdev(lengths) / mean


def sentence_cv(text: str) -> float:
    sents = split_sentences(text)
    return _cv([len(tokenize(s)) for s in sents])


def paragraph_cv(text: str) -> float:
    paras = split_paragraphs(text)
    return _cv([len(tokenize(p)) for p in paras])


# --------------------------------------------------------------------------- #
# Language detection                                                          #
# --------------------------------------------------------------------------- #
def detect_language(text: str) -> str:
    zh = len(re.findall(rf"[{_CJK}]", text or ""))
    en = len(re.findall(r"[A-Za-z]+", text or ""))
    if zh == 0 and en == 0:
        return "en"
    if zh == 0:
        return "en"
    if en == 0:
        return "zh"
    # Mixed: classify by dominant script; the families below are applied for the
    # dominant language but we always run shared families too.
    return "zh" if zh >= en else "en"


# --------------------------------------------------------------------------- #
# LEXICAL families (authored heuristics). Patterns are case-insensitive for EN.#
# --------------------------------------------------------------------------- #
EN_LEXICAL: dict[str, list[str]] = {
    "inflation": [
        r"\bpivotal\b", r"\bcrucial\b", r"\bsignificant\b", r"\benduring\b",
        r"\btestament\b", r"\bserves as\b", r"\bstands as\b",
        r"\bmarks a (?:shift|turning point|new)\b", r"\bsets the stage\b",
        r"\blasting impact\b", r"\bbroader movement\b",
    ],
    "promotional": [
        r"\bvibrant\b", r"\brich tapestry\b", r"\bbreathtaking\b",
        r"\bgroundbreaking\b", r"\brenowned\b", r"\bseamless(?:ly)?\b",
        r"\bintuitive\b", r"\bpowerful\b", r"\bshowcases?\b",
        r"\bcommitment to\b", r"\bin the heart of\b",
    ],
    "analytic_padding": [
        r"\bhighlighting\b", r"\bunderscoring\b", r"\bemphasizing\b",
        r"\breflecting\b", r"\bsymbolizing\b", r"\bensuring\b",
        r"\bcontributing to\b",
    ],
    "vague_attribution": [
        r"\bexperts argue\b", r"\bobservers note\b",
        r"\bindustry reports? (?:suggest|indicate)\b",
        r"\bseveral sources indicate\b", r"\bstudies (?:show|suggest)\b",
    ],
    "ai_vocab": [
        r"\badditionally\b", r"\balign(?:s|ing)? with\b", r"\bdelve\b",
        r"\benhanc(?:e|es|ing)\b", r"\bfoster(?:s|ing)?\b", r"\bhighlight\b",
        r"\bintricate\b", r"\blandscape\b", r"\bunderscore\b",
        r"\bmoreover\b", r"\bfurthermore\b",
    ],
    "filler_hedging": [
        r"\bin order to\b", r"\bdue to the fact that\b",
        r"\bat this point in time\b", r"\bit is worth noting that\b",
        r"\bit is important to note\b",
        r"\bcould potentially possibly\b",
        r"\bmay potentially\b",
    ],
    "empty_outlook": [
        r"\bdespite these challenges\b", r"\bfuture outlook\b",
        r"\bexciting times ahead\b",
        r"\bstep in the right direction\b",
    ],
    "chat_residue": [
        r"\bof course[!.]", r"\bcertainly[!.]", r"\bgreat question\b",
        r"\bi hope this helps\b", r"\blet me know if\b",
        r"\bas of my last (?:update|knowledge)\b",
        r"\bbased on available information\b",
    ],
}

ZH_LEXICAL: dict[str, list[str]] = {
    "officialese": [
        r"在.{0,15}背景下", r"具有重要意义", r"起到重要作用", r"发挥重要作用",
        r"提供有力支撑", r"推动.{0,8}走深走实", r"围绕.{0,10}展开",
        r"随着.{0,12}不断",
    ],
    "nominalization": [
        r"对.{1,20}进行.{1,12}", r"实现.{1,12}提升", r"构建.{1,12}体系",
        r"开展.{1,10}建设", r"形成.{1,10}机制", r"发挥.{1,8}作用",
    ],
    "uplift": [
        r"意义重大", r"未来可期", r"值得期待", r"书写新篇章",
        r"注入新动能", r"彰显价值", r"展现魅力",
    ],
    "surface_analysis": [
        r"这说明", r"这体现了", r"这反映出", r"这折射出",
        r"由此可见", r"可以说",
    ],
    "vague_attribution": [
        r"有观点认为", r"专家指出", r"业内普遍认为", r"资料显示",
        r"多家媒体报道",
    ],
    "scaffold_connectors": [
        r"此外", r"与此同时", r"另一方面", r"总的来说", r"综上所述",
        r"换言之", r"值得注意的是", r"不可忽视的是",
    ],
    "chat_residue": [
        r"希望以上对你有帮助", r"作为\s*AI", r"知识截止",
        r"以上内容仅供参考",
    ],
}

# --------------------------------------------------------------------------- #
# STRUCTURAL families (authored heuristics).                                  #
# --------------------------------------------------------------------------- #
EN_STRUCTURAL: dict[str, list[str]] = {
    # "not just X, but Y" / "not merely X, but Y" / "not only X, but (also) Y"
    "negative_parallelism": [
        r"\bnot just\b[^.,;]{1,60}?,?\s*but\b",
        r"\bnot merely\b[^.,;]{1,60}?,?\s*but\b",
        r"\bnot only\b[^.,;]{1,60}?,?\s*but\b",
        r"\bnot simply\b[^.,;]{1,60}?,?\s*but\b",
    ],
    # Bare balanced "Not X, but Y" (a comma-separated antithesis) — a heightened-
    # rhetoric tell distinct from the "not just/only" intensifier form above.
    "balanced_parallelism": [
        r"\bnot\b[^.,;]{1,40},\s*but\b",
    ],
    "signpost": [
        r"\bfirst(?:ly)?,", r"\bsecond(?:ly)?,", r"\bthird(?:ly)?,",
        r"\bfinally,", r"\bon the one hand\b", r"\bon the other hand\b",
        r"\bin conclusion\b", r"\bto sum up\b",
    ],
    "report_shell": [
        r"\bthis (?:paper|report|study|article|essay) (?:examines|analyzes|explores|investigates|discusses|provides|presents|offers|aims to provide)\b",
        r"\bthe following section (?:discusses|examines|presents)\b",
        r"\bresearch background and significance\b",
        r"\bmain findings\b", r"\bpolicy implications\b",
    ],
    # Rule-of-three / forced triad: three comma-separated items closed with
    # "and"/"or" (e.g. "speed, accuracy, and clarity"). AUTHORED HEURISTIC —
    # conservative on two-item lists (0), but it MAY over-match a 4+ item list
    # by matching its trailing three items. Density is the real signal; one hit
    # is fine. See references/structural-statistical-signals.md §A1.
    "rule_of_three": [
        r"\b[^,.;:!?\n]{1,30},\s*[^,.;:!?\n]{1,30},\s*(?:and|or)\s+[^,.;:!?\n]{1,30}",
    ],
    "false_range": [
        r"\bfrom\b[^.,;]{1,40}?\bto\b[^.,;]{1,40}?,",
    ],
    # Bold-label list: BOTH the colon-OUTSIDE form (`**Label**:`) and the
    # dominant LLM colon-INSIDE form (`**Label:**`), optionally bullet-led. The
    # two patterns are mutually exclusive per label, so a single label counts once.
    "bold_label_list": [
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}\*\*\s*[:：]",
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}[:：]\s*\*\*",
    ],
}

ZH_STRUCTURAL: dict[str, list[str]] = {
    "negative_parallelism": [
        r"不是.{0,40}?而是", r"不仅.{0,30}?(?:还|更)", r"不只是.{0,30}?更是",
        r"与其说.{0,30}?不如说",
    ],
    "signpost": [
        r"首先", r"其次", r"再次", r"最后(?:[，,])", r"一方面", r"另一方面",
        r"综上所述", r"由此可见",
    ],
    "report_shell": [
        r"本(?:文|论文|报告|研究)(?:拟|将|系统|旨在)",
        r"下文将从", r"研究背景与意义", r"研究框架与方法",
        r"增长动力分析", r"主要研究发现",
    ],
    # Rule-of-three / forced triad: three 顿号-separated items (速度、准确、清晰).
    # AUTHORED HEURISTIC — does not fire on a two-item list; MAY over-match a 4+
    # item 顿号 run via its trailing three items. See structural-statistical-signals.md §A1.
    "rule_of_three": [
        r"[^，。；、\n]{1,12}、[^，。；、\n]{1,12}、[^，。；、\n]{1,12}",
    ],
    "bold_label_list": [
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}\*\*\s*[:：]",
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}[:：]\s*\*\*",
        r"\*\*\d{4}年[：:]\*\*",
    ],
    "section_scaffold": [
        r"第[一二三四五六七八九十]+章",
        r"(?m)^\s*\d+\.\d+\s",
    ],
}


def _scan(text: str, families: dict[str, list[str]], ignore_case: bool) -> dict:
    flags = re.IGNORECASE if ignore_case else 0
    out: dict[str, dict] = {}
    for family, patterns in families.items():
        hits: list[str] = []
        for pat in patterns:
            for m in re.finditer(pat, text, flags):
                frag = m.group(0).strip()
                if frag:
                    hits.append(frag)
        out[family] = {"count": len(hits), "hits": hits}
    return out


def _merge(a: dict, b: dict) -> dict:
    out = {k: {"count": v["count"], "hits": list(v["hits"])} for k, v in a.items()}
    for k, v in b.items():
        if k in out:
            out[k]["count"] += v["count"]
            out[k]["hits"].extend(v["hits"])
        else:
            out[k] = {"count": v["count"], "hits": list(v["hits"])}
    return out


def detect_signals(text: str, language: str = "auto") -> dict:
    """Return the three-layer signal map. DETECTS only; never rewrites."""
    text = text or ""
    lang = detect_language(text) if language in (None, "auto") else language

    if lang == "zh":
        lexical = _scan(text, ZH_LEXICAL, ignore_case=False)
        structural = _scan(text, ZH_STRUCTURAL, ignore_case=False)
    else:
        lexical = _scan(text, EN_LEXICAL, ignore_case=True)
        structural = _scan(text, EN_STRUCTURAL, ignore_case=True)

    # Mixed text: also run the *other* language's families so EN-in-ZH (and vice
    # versa) signals are not missed. Shared markdown families merge cleanly.
    has_zh = bool(re.search(rf"[{_CJK}]", text))
    has_en = bool(re.search(r"[A-Za-z]{3,}", text))
    if lang == "zh" and has_en:
        lexical = _merge(lexical, _scan(text, EN_LEXICAL, ignore_case=True))
        structural = _merge(structural, _scan(text, EN_STRUCTURAL, ignore_case=True))
    elif lang == "en" and has_zh:
        lexical = _merge(lexical, _scan(text, ZH_LEXICAL, ignore_case=False))
        structural = _merge(structural, _scan(text, ZH_STRUCTURAL, ignore_case=False))

    sents = split_sentences(text)
    paras = split_paragraphs(text)
    sent_lens = [len(tokenize(s)) for s in sents]
    para_lens = [len(tokenize(p)) for p in paras]

    statistical = {
        "sentence_cv": round(_cv(sent_lens), 6),
        "paragraph_cv": round(_cv(para_lens), 6),
        "n_sentences": len(sents),
        "n_paragraphs": len(paras),
        "mean_sentence_len": round(statistics.fmean(sent_lens), 4) if sent_lens else 0.0,
        "mean_paragraph_len": round(statistics.fmean(para_lens), 4) if para_lens else 0.0,
    }

    return {
        "language": lang,
        "lexical": lexical,
        "structural": structural,
        "statistical": statistical,
    }


def summarize(signal_map: dict) -> dict:
    """A compact diagnostic view (totals per layer) — dashboard, not an oracle."""
    lex = sum(v["count"] for v in signal_map.get("lexical", {}).values())
    st = sum(v["count"] for v in signal_map.get("structural", {}).values())
    return {
        "language": signal_map.get("language"),
        "lexical_total": lex,
        "structural_total": st,
        "sentence_cv": signal_map.get("statistical", {}).get("sentence_cv"),
        "paragraph_cv": signal_map.get("statistical", {}).get("paragraph_cv"),
    }


def _read_input(path: str | None) -> str:
    if path:
        return Path(path).read_text(encoding="utf-8")
    return sys.stdin.read()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Detect AI-writing signals (lexical/structural/statistical). "
                    "DETECTS only — it never rewrites/humanizes.",
    )
    parser.add_argument("path", nargs="?", help="input file; omit to read stdin")
    parser.add_argument("--language", choices=["en", "zh", "auto"], default="auto")
    parser.add_argument("--summary", action="store_true",
                        help="print compact per-layer totals instead of the full map")
    args = parser.parse_args(argv)

    text = _read_input(args.path)
    signal_map = detect_signals(text, language=args.language)
    out = summarize(signal_map) if args.summary else signal_map
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
