#!/usr/bin/env python3
"""
detect_ai_signals — a DETECTOR for AI-writing signals in serious nonfiction prose.

It DETECTS only. It returns a tiered, length-normalized signal map plus a
mode-calibrated verdict; it never rewrites text and must never be described as a
"humanizer". The rewrite is performed by the LLM following SKILL.md; this module
is a measurement instrument and a diagnostic dashboard — explicitly NOT the
pass/fail oracle for rewrite quality (that is the independent blind judge in
references/blind-judge-rubric.md).

WHY THIS REWRITE (v3): the previous detector over-fired on legitimate human
academic prose — it flagged every three-item list, every "significant", every
numbered subsection, every 对…进行…. That drove the rewrite to over-edit good
text (the "too many false positives" complaint). v3 fixes this with:

  1. TWO MODES — `academic` (严肃学术论文) and `popsci` (科普严肃). What is an AI
     tell differs by mode (a guiding rhetorical question is fine in popsci, a
     register slip in a paper; dense `2.1.3` nesting is normal in a thesis,
     AI-cosplay in a popsci piece).
  2. TIERING — families are `high_precision` (real AI slop in any human prose:
     chat residue, hype/uplift, empty outlook, listicle shell, stacked filler)
     vs `ambiguous` (connectives, mild inflation, triads — legitimate at low
     density, an AI tell only in bulk). Only high_precision hits count fully;
     ambiguous families contribute to the verdict via DENSITY, not raw count.
  3. CONTEXT GUARDS — `significant` next to statistics is not flagged; `powerful
     /enhanced/landscape/mechanism` next to domain terms are not flagged; a
     three-item list of numbers/data is not a "forced triad".
  4. LENGTH NORMALIZATION — everything is reported per-1000-tokens, so a long
     paper does not automatically out-score a short one.
  5. AN EXPLICIT VERDICT — `human_like` / `some_signals` / `ai_like`, calibrated
     per mode, with `abstain_recommended` so "this reads human; no rewrite
     needed" is a first-class output instead of an always-rewrite default.

`detect_signals(text, language="auto", mode="auto")` returns:
  - "language":  "en" | "zh"
  - "mode":      "academic" | "popsci"
  - "n_tokens":  int
  - "lexical":     {family: {"count", "hits", "tier"}}
  - "structural":  {family: {"count", "hits", "tier"}}
  - "statistical": {sentence_cv, paragraph_cv, n_sentences, n_paragraphs, means}
  - "density":     per-1000-token rates for each tier + structure
  - "verdict":     "human_like" | "some_signals" | "ai_like"
  - "abstain_recommended": bool   (True iff verdict == "human_like")

Tokenization (language-aware, deterministic):
  a token = one CJK char [一-鿿] OR one run of [A-Za-z0-9]+.

NOTE ON PROVENANCE: every pattern family below is an AUTHORED HEURISTIC, not a
sourced/learned classifier. The verdict thresholds are CALIBRATED against the
real human/AI corpus in evals/corpus/ (see evals/calibrate.py). Diagnostic only.

CLI:  python3 scripts/detect_ai_signals.py [FILE] [--mode academic|popsci|auto]
      [--language en|zh|auto] [--summary]
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
# A "number/data" token: digits with optional unit/percent/currency/year — used
# to exclude factual enumerations from the rule-of-three triad heuristic.
_DATA_ITEM_RE = re.compile(
    r"\d|[％%＄$€£¥]|\b(?:million|billion|trillion|thousand|percent|pp|bps)\b|[年月日%]",
    re.IGNORECASE,
)


def tokenize(text: str, language: str = "auto") -> list[str]:
    """One CJK char = one token; one [A-Za-z0-9]+ run = one token."""
    return _TOKEN_RE.findall(text or "")


def split_sentences(text: str) -> list[str]:
    """Split on terminal punctuation + newlines; drop empties/whitespace-only.

    A dot interior to a number (3.5) or part of a letter-dot abbreviation chain
    (U.S., e.g.) is NOT a boundary — masking it keeps statistics-heavy prose from
    being shattered. Single abbreviations (Fig., et al., cf., vs., Dr., pp., No.,
    Vol.) are also masked so they do not over-split.
    """
    if not text:
        return []
    masked = re.sub(r"(?<=\d)\.(?=\d)", "\x00", text)
    masked = re.sub(r"\b(?:[A-Za-z]\.){2,}",
                    lambda m: m.group(0).replace(".", "\x00"), masked)
    # single common abbreviations followed by more text on the same line
    masked = re.sub(
        r"\b(?:Fig|Figs|Eq|Ref|Refs|No|Vol|pp|Dr|Prof|vs|cf|al|Sec|Ch|Tab)\."
        r"(?=\s*[a-z0-9(])",
        lambda m: m.group(0).replace(".", "\x00"), masked)
    masked = re.sub(r"\bet al\.", "et al\x00", masked)
    parts = _SENT_SPLIT_RE.split(masked)
    return [s for s in (p.replace("\x00", ".").strip() for p in parts) if s]


def split_paragraphs(text: str) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in _PARA_SPLIT_RE.split(text.strip()) if p.strip()]


def _cv(lengths: list[int]) -> float:
    if len(lengths) < 2:
        return 0.0
    mean = statistics.fmean(lengths)
    if mean == 0:
        return 0.0
    return statistics.pstdev(lengths) / mean


def sentence_cv(text: str) -> float:
    return _cv([len(tokenize(s)) for s in split_sentences(text)])


def paragraph_cv(text: str) -> float:
    return _cv([len(tokenize(p)) for p in split_paragraphs(text)])


# --------------------------------------------------------------------------- #
# Language detection                                                          #
# --------------------------------------------------------------------------- #
def detect_language(text: str) -> str:
    zh = len(re.findall(rf"[{_CJK}]", text or ""))
    en = len(re.findall(r"[A-Za-z]+", text or ""))
    if zh == 0:
        return "en"
    if en == 0:
        return "zh"
    return "zh" if zh >= en else "en"


def detect_mode(text: str) -> str:
    """Heuristic academic-vs-popsci guess. CALIBRATED to lean academic when in
    doubt (the stricter floor is the safer default for serious prose).

    Academic markers: citations (Smith, 2020) / [12] / et al., an abstract or
    methods/results section, statistical notation (p < .05), a references list.
    Popsci markers: second-person address, rhetorical questions, an analogy/
    "imagine" framing — engagement devices a paper would not use.
    """
    t = text or ""
    acad = 0
    acad += len(re.findall(r"\([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}\)", t))
    acad += len(re.findall(r"\[\d+\]", t))
    acad += len(re.findall(r"\bet al\.", t))
    acad += len(re.findall(r"\bp\s*[<=>]\s*0?\.\d", t))
    acad += len(re.findall(r"(?im)^\s*(?:abstract|references|methodology|"
                           r"摘要|参考文献|研究方法)\b", t))
    acad += len(re.findall(r"(?:参考文献|本文|本研究|该研究|实证)", t))
    pop = 0
    pop += len(re.findall(r"(?i)\byou(?:'ll|'re|r)?\b", t))
    pop += len(re.findall(r"(?i)\b(?:imagine|picture this|think about it|"
                          r"here's the (?:thing|catch))\b", t))
    pop += len(re.findall(r"[?？]", t)) // 2  # questions, dampened
    pop += len(re.findall(r"(?:想象一下|你可能|你也许|其实|说白了|打个比方)", t))
    # default to academic (the safer, stricter floor) unless popsci clearly wins
    return "popsci" if pop > acad and pop >= 3 else "academic"


# --------------------------------------------------------------------------- #
# LEXICAL families. Each entry: (tier, [patterns]).                            #
#   tier "hp" = high_precision (counts fully toward the verdict)               #
#   tier "amb" = ambiguous (legitimate at low density; verdict via density)    #
# Context guards are applied in _scan_lexical (not expressible as one regex).  #
# --------------------------------------------------------------------------- #
EN_LEXICAL: dict[str, tuple[str, list[str]]] = {
    # --- high precision: AI slop with no legitimate scholarly use ----------
    "hype": ("hp", [
        r"\bvibrant\b", r"\brich tapestry\b", r"\bbreathtaking\b",
        r"\bgroundbreaking\b", r"\bgame[- ]chang(?:er|ing)\b",
        r"\bin the heart of\b", r"\ba testament to\b", r"\bunlock(?:s|ing)?\b",
        r"\bnavigat(?:e|ing) the (?:complex(?:ities)?|landscape|world)\b",
        r"\bever[- ]evolving\b", r"\bever[- ]changing\b",
    ]),
    "empty_outlook": ("hp", [
        r"\bdespite (?:these|the) challenges\b", r"\bfuture outlook\b",
        r"\bexciting times ahead\b", r"\bstep in the right direction\b",
        r"\bonly time will tell\b", r"\bbright future\b",
        r"\bone thing is (?:clear|certain)\b",
    ]),
    "chat_residue": ("hp", [
        r"\bof course[!.]", r"\bcertainly[!.]", r"\bgreat question\b",
        r"\bi hope this helps\b", r"\blet me know if\b",
        r"\bas (?:an ai|of my last (?:update|knowledge))\b",
        r"\bbased on (?:the )?available information\b",
        r"\bin today's (?:fast[- ]paced |digital )?world\b",
    ]),
    "stacked_filler": ("hp", [
        r"\bcould potentially possibly\b", r"\bmay potentially\b",
        r"\bdue to the fact that\b", r"\bat this point in time\b",
        r"\bin order to be able to\b",
    ]),
    # clickbait / hype-engagement slop — never used in serious prose (either mode)
    "clickbait_hype": ("hp", [
        r"(?i)\bmind[- ]?blow", r"(?i)\bblow your mind\b",
        r"(?i)\bbuckle up\b", r"(?i)\bmind ?= ?blown\b",
        r"(?i)\bjaw[- ]dropping\b", r"(?i)\byou won'?t believe\b",
        r"(?i)\bget ready\b", r"(?i)\bhere'?s the (?:kicker|catch)\b",
        r"(?i)\bhow (?:cool|crazy|wild) is that\b", r"(?i)\bthis is wild\b",
        r"(?i)\bwe'?re about to dive\b", r"(?i)\bthe (?:wild|crazy) world of\b",
    ]),
    # --- ambiguous: legitimate words; only a tell in bulk -------------------
    "inflation": ("amb", [
        r"\bpivotal\b", r"\bcrucial\b", r"\bsignificant\b", r"\benduring\b",
        r"\bserves as\b", r"\bstands as\b", r"\bsets the stage\b",
        r"\blasting impact\b",
    ]),
    "soft_promo": ("amb", [
        r"\bseamless(?:ly)?\b", r"\bintuitive\b", r"\bpowerful\b",
        r"\brenowned\b", r"\bshowcases?\b", r"\bcommitment to\b",
        r"\brobust\b", r"\bcomprehensive\b",
    ]),
    "analytic_padding": ("amb", [
        r"\bhighlighting\b", r"\bunderscoring\b", r"\bemphasizing\b",
        r"\breflecting\b", r"\bsymbolizing\b", r"\bcontributing to\b",
    ]),
    "vague_attribution": ("amb", [
        r"\bexperts (?:argue|say|believe)\b", r"\bobservers note\b",
        r"\bindustry reports? (?:suggest|indicate)\b",
        r"\bseveral sources indicate\b", r"\bsome (?:argue|believe|say)\b",
    ]),
    "connector_overload": ("amb", [
        r"\badditionally\b", r"\bmoreover\b", r"\bfurthermore\b",
        r"\bdelve\b", r"\bnotably\b", r"\bimportantly\b",
    ]),
    # emoji in serious prose (either mode) is a high-precision tell
    "emoji": ("hp", [
        r"[\U0001F000-\U0001FAFF☀-⛿✀-➿⬀-⯿]",
    ]),
}

# Context guards: family -> (guard regex, window). If the guard pattern appears
# within `window` chars (either side) of a hit, that hit is suppressed.
EN_GUARDS: dict[str, tuple[str, int]] = {
    # Suppress "significant"/"crucial" only in a genuine STATISTICAL context —
    # detect stats markers NEARBY (never the trigger word itself, which would
    # self-suppress). "statistically significant (p<.05)" → suppressed;
    # "a significant shift in policy" → counts.
    "inflation": (r"(?i)statistic|p\s*[<=>]\s*0?\.\d|p-?value|"
                  r"significance (?:level|test|threshold)|level of significance|"
                  r"confidence interval|\bci\b|hazard|odds ratio|effect size|"
                  r"α|alpha|standard error|regression|coefficient|correlat|"
                  r"\bn\s*=\s*\d", 40),
    # "powerful tool/predictor/method", "intuitive interface/notion",
    # "robust standard errors", "comprehensive review/dataset" → domain use
    "soft_promo": (r"(?i)tool|method|predictor|technique|test|model|estimat|"
                   r"microscope|telescope|computer|engine|framework|interface|"
                   r"notion|standard error|dataset|review|survey|coverage|"
                   r"check|sample|evidence", 28),
}

ZH_LEXICAL: dict[str, tuple[str, list[str]]] = {
    # --- high precision -----------------------------------------------------
    "uplift": ("hp", [
        r"意义重大", r"未来可期", r"值得期待", r"书写新篇章",
        r"注入新动能", r"彰显价值", r"展现魅力", r"添砖加瓦",
        r"谱写.{0,6}新篇章", r"迈上新台阶",
    ]),
    "officialese": ("hp", [
        r"具有重要意义", r"提供有力支撑", r"推动.{0,8}走深走实",
        r"保驾护航", r"赋能", r"抓手", r"顶层设计",
    ]),
    "empty_outlook": ("hp", [
        r"展望未来", r"在.{0,8}新征程", r"道阻且长",
    ]),
    "chat_residue": ("hp", [
        r"希望以上对你有帮助", r"希望.{0,8}对你有帮助", r"作为\s*AI",
        r"知识截止", r"以上内容仅供参考", r"如有(?:疑问|需要)",
    ]),
    "clickbait_hype": ("hp", [
        r"震惊", r"涨知识", r"超乎你的想象", r"颠覆.{0,4}认知",
        r"不看后悔", r"快收藏", r"必看", r"扒一扒", r"硬核科普",
    ]),
    "emoji": ("hp", [
        r"[\U0001F000-\U0001FAFF☀-⛿✀-➿⬀-⯿]",
    ]),
    # --- ambiguous ----------------------------------------------------------
    "officialese_soft": ("amb", [
        r"在.{0,15}背景下", r"起到重要作用", r"发挥重要作用",
        r"随着.{0,12}不断", r"围绕.{0,10}展开",
    ]),
    "nominalization": ("amb", [
        r"构建.{1,12}体系", r"形成.{1,10}机制", r"实现.{1,12}提升",
        r"开展.{1,10}建设",
    ]),
    "surface_analysis": ("amb", [
        r"这(?:充分)?说明", r"这(?:充分)?体现了", r"这反映出",
        r"这折射出", r"不难发现", r"可以说",
    ]),
    "vague_attribution": ("amb", [
        r"有观点认为", r"专家指出", r"业内普遍认为",
        r"多家媒体报道",
    ]),
    "scaffold_connectors": ("amb", [
        r"此外", r"与此同时", r"另一方面", r"总的来说", r"综上所述",
        r"换言之", r"值得注意的是", r"不可忽视的是",
    ]),
}

ZH_GUARDS: dict[str, tuple[str, int]] = {}


# --------------------------------------------------------------------------- #
# STRUCTURAL families. Each entry: (tier, [patterns]).                         #
# rule_of_three / negative_parallelism / signpost / section_scaffold are       #
# ambiguous (normal at low density). report_shell / bold_label_list / listicle #
# are high precision.                                                          #
# --------------------------------------------------------------------------- #
EN_STRUCTURAL: dict[str, tuple[str, list[str]]] = {
    "report_shell": ("hp", [
        r"\bin this (?:article|piece|post),? (?:we|i)('ll| will)?\b",
        r"\bthis (?:article|post|piece) (?:will )?(?:explores?|breaks? down|"
        r"dives? into|covers?)\b",
        r"\blet'?s (?:dive|explore|take a (?:closer )?look|break)\b",
        r"\bby the end of this (?:article|post|guide)\b",
    ]),
    "listicle": ("hp", [
        r"(?im)^\s*\d+[.)]\s+\S+.{0,40}(?:\n.*){0,2}\n\s*\d+[.)]\s",  # 1. .. 2.
        r"(?i)\b\d+\s+(?:mind[- ]?blowing\s+|surprising\s+|amazing\s+|"
        r"crazy\s+|shocking\s+)?(?:facts?|reasons?|ways?|things|tips|steps|"
        r"signs|secrets|myths|tricks|lessons)\b",
        r"(?m)^\s*\*\*\s*(?:\d+[.)]|step\s*\d+)",  # **1. .. / **Step 1
    ]),
    "bold_label_list": ("hp", [
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}\*\*\s*[:：]",
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}[:：]\s*\*\*",
    ]),
    "negative_parallelism": ("amb", [
        r"\bnot just\b[^.,;]{1,60}?,?\s*but\b",
        r"\bnot merely\b[^.,;]{1,60}?,?\s*but\b",
        r"\bnot only\b[^.,;]{1,60}?,?\s*but\b",
        r"\bit'?s not (?:about|that)\b[^.,;]{1,50}?,?\s*it'?s\b",
    ]),
    "signpost": ("amb", [
        r"(?i)\bfirst(?:ly)?,", r"(?i)\bsecond(?:ly)?,", r"(?i)\bthird(?:ly)?,",
        r"(?i)\bon the one hand\b", r"(?i)\bon the other hand\b",
        r"(?i)\bin conclusion\b", r"(?i)\bto sum up\b",
    ]),
    "rule_of_three": ("amb", [  # handled specially in _scan_triads
        r"\b[^,.;:!?\n]{1,30},\s*[^,.;:!?\n]{1,30},\s*(?:and|or)\s+[^,.;:!?\n]{1,30}",
    ]),
}

ZH_STRUCTURAL: dict[str, tuple[str, list[str]]] = {
    "report_shell": ("hp", [
        r"本(?:文|篇|期).{0,6}(?:就|将|带你|带大家|聊聊|说说)",
        r"今天.{0,6}(?:就|来|聊聊|说说|讲讲)",
        r"读完(?:本文|这篇)",
    ]),
    "listicle": ("hp", [
        r"\d+\s*(?:个|种|大|条)\s*(?:理由|方法|技巧|方式|原因|要点|步骤|秘诀|真相|误区)",
        r"(?m)^\s*\*\*\s*\d+[.)、]",
    ]),
    "bold_label_list": ("hp", [
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}\*\*\s*[:：]",
        r"(?m)^\s*[-*]?\s*\*\*[^*\n]{1,40}[:：]\s*\*\*",
    ]),
    "negative_parallelism": ("amb", [
        r"不是.{0,40}?而是", r"不仅.{0,30}?(?:还|更)", r"不只是.{0,30}?更是",
        r"与其说.{0,30}?不如说",
    ]),
    "signpost": ("amb", [
        r"首先[，,]", r"其次[，,]", r"再次[，,]", r"最后[，,]",
        r"一方面", r"另一方面", r"综上所述", r"由此可见",
    ]),
    "rule_of_three": ("amb", [
        r"[^，。；、\n]{1,12}、[^，。；、\n]{1,12}、[^，。；、\n]{1,12}",
    ]),
    "section_scaffold": ("amb", [
        r"第[一二三四五六七八九十]+(?:章|部分)",
    ]),
}

# Mode → families to DROP (not an AI tell in that mode). academic keeps the
# strict floor; popsci tolerates structure that is legitimate engagement craft.
MODE_DROP: dict[str, set[str]] = {
    # In popsci, signposts / a guiding triad / numbered lists are normal craft.
    "popsci": {"signpost", "rule_of_three", "section_scaffold",
               "negative_parallelism"},
    # In academic, the listicle / "this post explores" shells do not apply;
    # report_shell here is the popsci voice, so drop it (academic has its own
    # over-density signal handled by the verdict, not a hard family).
    "academic": {"listicle", "report_shell"},
}


# --------------------------------------------------------------------------- #
# Scanning with tiers + guards + specialised triad logic                      #
# --------------------------------------------------------------------------- #
def _scan_lexical(text: str, families: dict, guards: dict,
                  ignore_case: bool, drop: set[str]) -> dict:
    flags = re.IGNORECASE if ignore_case else 0
    out: dict[str, dict] = {}
    for family, (tier, patterns) in families.items():
        if family in drop:
            continue
        guard = guards.get(family)
        guard_re = re.compile(guard[0]) if guard else None
        guard_win = guard[1] if guard else 0
        hits: list[str] = []
        for pat in patterns:
            for m in re.finditer(pat, text, flags):
                frag = m.group(0).strip()
                if not frag:
                    continue
                if guard_re is not None:
                    lo = max(0, m.start() - guard_win)
                    hi = min(len(text), m.end() + guard_win)
                    if guard_re.search(text[lo:hi]):
                        continue  # suppressed: legitimate domain/statistical use
                hits.append(frag)
        out[family] = {"count": len(hits), "hits": hits, "tier": tier}
    return out


def _triad_is_forced(span: str, lang: str) -> bool:
    """A real forced rhetorical triad has three short, PARALLEL, NON-data items.
    A factual enumeration (numbers, years, %, named data) is not a tell."""
    sep = "、" if lang == "zh" else ","
    if lang == "zh":
        items = [p.strip() for p in span.split("、")]
    else:
        # split into the three items: "a, b, and c" / "a, b, or c"
        m = re.match(r"(.*?),\s*(.*?),\s*(?:and|or)\s+(.*)", span,
                     re.IGNORECASE | re.DOTALL)
        if not m:
            return False
        items = [m.group(1).strip(), m.group(2).strip(), m.group(3).strip()]
    if len(items) != 3 or any(not it for it in items):
        return False
    # exclude data/number enumerations
    if any(_DATA_ITEM_RE.search(it) for it in items):
        return False
    lens = [len(tokenize(it)) for it in items]
    if min(lens) == 0:
        return False
    # parallelism: items must be similar length (longest ≤ 3× shortest) and short
    if max(lens) > 3 * min(lens):
        return False
    if max(lens) > (6 if lang == "zh" else 6):
        return False
    return True


def _scan_structural(text: str, families: dict, ignore_case: bool,
                     lang: str, drop: set[str]) -> dict:
    flags = re.IGNORECASE if ignore_case else 0
    out: dict[str, dict] = {}
    for family, (tier, patterns) in families.items():
        if family in drop:
            continue
        hits: list[str] = []
        for pat in patterns:
            for m in re.finditer(pat, text, flags):
                frag = m.group(0).strip()
                if not frag:
                    continue
                if family == "rule_of_three" and not _triad_is_forced(frag, lang):
                    continue  # factual/non-parallel list, not a forced triad
                hits.append(frag)
        out[family] = {"count": len(hits), "hits": hits, "tier": tier}
    return out


def _dedupe_overlap(structural: dict, lexical: dict) -> None:
    """由此可见 is in both ZH signpost (structural) and the old surface_analysis;
    keep it once (structural). Remove from surface_analysis if present."""
    sp_hits = set(structural.get("signpost", {}).get("hits", []))
    sa = lexical.get("surface_analysis")
    if sa and sp_hits:
        kept = [h for h in sa["hits"] if h not in sp_hits]
        sa["hits"] = kept
        sa["count"] = len(kept)


# --------------------------------------------------------------------------- #
# Verdict (mode-calibrated). Thresholds live in one place for calibration.    #
# --------------------------------------------------------------------------- #
# per-1000-token rates. CALIBRATED in evals/calibrate.py against the real
# human/AI corpus. The detector is a SLOP-finder, not an AI classifier: modern
# serious AI prose and serious human prose overlap on every regex/statistical
# feature (verified empirically), so the strong "ai_like" trigger requires clear
# slop (high-precision hits) OR extreme ambiguous density across many families —
# tuned so the HUMAN corpus never reaches "ai_like" (zero strong false positive).
# The clean cases the detector cannot separate are resolved by the LLM blind
# judge (the real oracle), not by these counts.
VERDICT_THRESHOLDS = {
    "academic": {"hp_ai": 2.0, "hp_some": 0.5,
                 "amb_ai": 28.0, "amb_some": 9.0, "ai_families": 3},
    "popsci":   {"hp_ai": 2.0, "hp_some": 0.5,
                 "amb_ai": 24.0, "amb_some": 7.0, "ai_families": 3},
}


def _tier_counts(layer: dict) -> tuple[int, int]:
    hp = sum(v["count"] for v in layer.values() if v.get("tier") == "hp")
    amb = sum(v["count"] for v in layer.values() if v.get("tier") == "amb")
    return hp, amb


def _verdict(mode: str, n_tokens: int, hp: int, amb: int, amb_families: int) -> str:
    if n_tokens < 1:
        return "human_like"
    th = VERDICT_THRESHOLDS[mode]
    per1k = 1000.0 / n_tokens
    hp_rate = hp * per1k
    amb_rate = amb * per1k
    # STRONG trigger (drives a rewrite): clear slop, or extreme ambiguous
    # density spread across many families (templated AI). Human prose never
    # reaches here in the calibration corpus.
    if hp_rate >= th["hp_ai"]:
        return "ai_like"
    if amb_rate >= th["amb_ai"] and amb_families >= th["ai_families"]:
        return "ai_like"
    # MODERATE: some removable signals — look, but use judgment (often a light
    # touch or abstain). Legitimate human prose can land here; that is fine.
    # A SINGLE ambiguous hit is never a signal (one stray connector/word) — the
    # density path needs >=2 so short fragments don't over-trigger.
    if hp_rate >= th["hp_some"] or (amb_rate >= th["amb_some"] and amb >= 2):
        return "some_signals"
    return "human_like"


def detect_signals(text: str, language: str = "auto", mode: str = "auto") -> dict:
    """Return the tiered, length-normalized signal map. DETECTS only."""
    text = text or ""
    lang = detect_language(text) if language in (None, "auto") else language
    mode = detect_mode(text) if mode in (None, "auto") else mode
    if mode not in ("academic", "popsci"):
        mode = "academic"
    drop = MODE_DROP.get(mode, set())

    if lang == "zh":
        lexical = _scan_lexical(text, ZH_LEXICAL, ZH_GUARDS, False, drop)
        structural = _scan_structural(text, ZH_STRUCTURAL, False, "zh", drop)
    else:
        lexical = _scan_lexical(text, EN_LEXICAL, EN_GUARDS, True, drop)
        structural = _scan_structural(text, EN_STRUCTURAL, True, "en", drop)

    # Mixed text: only merge the OTHER language's families when that language is
    # SUBSTANTIALLY present (≥15% of tokens) — prevents an English paper's `2.1`
    # headings from tripping ZH section_scaffold, etc.
    toks = tokenize(text)
    n_tokens = len(toks)
    zh_tok = sum(1 for t in toks if re.match(rf"[{_CJK}]", t))
    en_tok = n_tokens - zh_tok
    frac_zh = zh_tok / n_tokens if n_tokens else 0
    frac_en = en_tok / n_tokens if n_tokens else 0
    if lang == "zh" and frac_en >= 0.15:
        lexical = _merge(lexical, _scan_lexical(text, EN_LEXICAL, EN_GUARDS, True, drop))
        structural = _merge(structural, _scan_structural(text, EN_STRUCTURAL, True, "en", drop))
    elif lang == "en" and frac_zh >= 0.15:
        lexical = _merge(lexical, _scan_lexical(text, ZH_LEXICAL, ZH_GUARDS, False, drop))
        structural = _merge(structural, _scan_structural(text, ZH_STRUCTURAL, False, "zh", drop))

    _dedupe_overlap(structural, lexical)

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

    lex_hp, lex_amb = _tier_counts(lexical)
    st_hp, st_amb = _tier_counts(structural)
    hp_total = lex_hp + st_hp
    amb_total = lex_amb + st_amb
    amb_families = sum(1 for layer in (lexical, structural)
                       for v in layer.values()
                       if v.get("tier") == "amb" and v["count"] > 0)
    per1k = (1000.0 / n_tokens) if n_tokens else 0.0
    density = {
        "high_precision_per_1k": round(hp_total * per1k, 3),
        "ambiguous_per_1k": round(amb_total * per1k, 3),
        "high_precision_total": hp_total,
        "ambiguous_total": amb_total,
        "ambiguous_families": amb_families,
    }
    verdict = _verdict(mode, n_tokens, hp_total, amb_total, amb_families)

    return {
        "language": lang,
        "mode": mode,
        "n_tokens": n_tokens,
        "lexical": lexical,
        "structural": structural,
        "statistical": statistical,
        "density": density,
        "verdict": verdict,
        "abstain_recommended": verdict == "human_like",
    }


def _merge(a: dict, b: dict) -> dict:
    out = {k: {"count": v["count"], "hits": list(v["hits"]),
               "tier": v.get("tier", "amb")} for k, v in a.items()}
    for k, v in b.items():
        if k in out:
            out[k]["count"] += v["count"]
            out[k]["hits"].extend(v["hits"])
        else:
            out[k] = {"count": v["count"], "hits": list(v["hits"]),
                      "tier": v.get("tier", "amb")}
    return out


def summarize(signal_map: dict) -> dict:
    """A compact diagnostic view — dashboard, not an oracle."""
    return {
        "language": signal_map.get("language"),
        "mode": signal_map.get("mode"),
        "n_tokens": signal_map.get("n_tokens"),
        "verdict": signal_map.get("verdict"),
        "abstain_recommended": signal_map.get("abstain_recommended"),
        "density": signal_map.get("density"),
        "sentence_cv": signal_map.get("statistical", {}).get("sentence_cv"),
        "paragraph_cv": signal_map.get("statistical", {}).get("paragraph_cv"),
    }


def _read_input(path: str | None) -> str:
    if path:
        return Path(path).read_text(encoding="utf-8")
    return sys.stdin.read()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Detect AI-writing signals (tiered, mode-aware, "
                    "length-normalized). DETECTS only — never rewrites.",
    )
    parser.add_argument("path", nargs="?", help="input file; omit to read stdin")
    parser.add_argument("--language", choices=["en", "zh", "auto"], default="auto")
    parser.add_argument("--mode", choices=["academic", "popsci", "auto"],
                        default="auto")
    parser.add_argument("--summary", action="store_true",
                        help="print compact totals + verdict instead of full map")
    args = parser.parse_args(argv)

    text = _read_input(args.path)
    signal_map = detect_signals(text, language=args.language, mode=args.mode)
    out = summarize(signal_map) if args.summary else signal_map
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
