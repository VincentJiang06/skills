#!/usr/bin/env python3
"""
Run a heuristic baseline evaluation over the source AI-generated papers.

The goal is not to prove authorship. The goal is to quantify how much obvious
template residue is present before any rewriting, using the same families of
signals the skill is designed to reduce.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ZH_RULES: dict[str, list[str]] = {
    "dash_drama": [r"——", r"(?<!\d)—(?!\d)"],
    "negative_parallelism": [
        r"不是.{0,30}而是",
        r"不仅.{0,20}(还|更)",
        r"不只是.{0,20}更是",
        r"与其说.{0,20}不如说",
    ],
    "scaffolding": [
        r"首先",
        r"其次",
        r"最后",
        r"此外",
        r"同时",
        r"另一方面",
        r"总的来说",
        r"综上所述",
        r"由此可见",
        r"换言之",
        r"值得注意的是",
        r"不可忽视的是",
    ],
    "officialese": [
        r"在.{0,15}背景下",
        r"随着.{0,20}不断",
        r"围绕.{0,20}展开",
        r"对于.{0,20}而言",
        r"从.{0,15}层面看",
        r"具有重要意义",
        r"起到重要作用",
        r"提供有力支撑",
        r"推动.{0,20}走深走实",
    ],
    "nominalization": [
        r"对.{0,20}进行.{1,12}",
        r"开展.{0,20}建设",
        r"实现.{0,20}提升",
        r"发挥.{0,20}作用",
        r"形成.{0,20}机制",
        r"构建.{0,20}体系",
    ],
    "uplift": [
        r"意义重大",
        r"未来可期",
        r"值得期待",
        r"书写新篇章",
        r"注入新动能",
        r"彰显价值",
        r"展现魅力",
    ],
    "surface_analysis": [
        r"这说明",
        r"这体现了",
        r"这反映出",
        r"这折射出",
        r"可以说",
        r"可见",
    ],
    "vague_attribution": [
        r"有观点认为",
        r"专家指出",
        r"业内普遍认为",
        r"资料显示",
        r"多家媒体报道",
    ],
    "style_residue": [
        r"希望以上",
        r"作为AI",
        r"知识截止",
        r"💡|✅|🚀|📌|✨",
        r"\*\*(?!(?:关键词|关键字)[:：]\*\*)[^*\n]{1,40}[:：]\*\*",
    ],
}


EN_RULES: dict[str, list[str]] = {
    "inflation": [
        r"\bpivotal\b",
        r"\bcrucial\b",
        r"\bsignificant\b",
        r"\benduring\b",
        r"\bevolving landscape\b",
        r"\bserves as\b",
        r"\bstands as\b",
        r"\btestament\b",
        r"\bbroader movement\b",
        r"\blasting impact\b",
    ],
    "promotional": [
        r"\bvibrant\b",
        r"\brich\b",
        r"\bbreathtaking\b",
        r"\bgroundbreaking\b",
        r"\brenowned\b",
        r"\bseamless\b",
        r"\bintuitive\b",
        r"\bpowerful\b",
        r"\bcommitment to\b",
        r"\bshowcases?\b",
        r"\benhances?\b",
    ],
    "superficial_analysis": [
        r"\bhighlighting\b",
        r"\bunderscoring\b",
        r"\bemphasizing\b",
        r"\breflecting\b",
        r"\bsymbolizing\b",
        r"\bensuring\b",
        r"\bcontributing to\b",
    ],
    "vague_attribution": [
        r"\bexperts argue\b",
        r"\bobservers note\b",
        r"\bindustry reports suggest\b",
        r"\bseveral sources indicate\b",
        r"\bsome critics argue\b",
    ],
    "template_outlook": [
        r"\bdespite these challenges\b",
        r"\bfuture outlook\b",
        r"\bexciting times ahead\b",
        r"\bmajor step in the right direction\b",
    ],
    "ai_vocab": [
        r"\badditionally\b",
        r"\balign with\b",
        r"\bdelve\b",
        r"\benhance\b",
        r"\bfostering\b",
        r"\binterplay\b",
        r"\bintricate\b",
        r"\blandscape\b",
        r"\bshowcase\b",
        r"\bunderscore\b",
    ],
    "sentence_shape": [
        r"\bnot just\b",
        r"\bnot merely\b",
        r"\bboasts?\b",
        r"\btaken together\b",
        r"\bthe first (major )?(growth )?pillar\b",
        r"\bthe second pillar\b",
        r"\bthe third pillar\b",
        r"\bthis paper (analyzes|reviews|examines)\b",
    ],
    "style_residue": [
        r"—",
        r"\*\*(?!(?:Keywords?|Key words?)[:：]\*\*)[^*\n]{1,40}[:：]\*\*",
        r"[🚀💡✅📌✨]",
        r"\bI hope this helps\b",
        r"\bOf course!\b",
        r"\bCertainly!\b",
        r"\bGreat question!\b",
        r"\bas of my last update\b",
    ],
    "filler_hedging": [
        r"\bin order to\b",
        r"\bdue to the fact that\b",
        r"\bat this point in time\b",
        r"\bcould potentially possibly\b",
    ],
}


@dataclass
class DocumentResult:
    doc_id: str
    model_family: str
    language: str
    path: str
    token_count: int
    category_counts: dict[str, int]
    total_hits: int
    hits_per_1k_tokens: float
    top_examples: dict[str, list[str]]


def token_count(text: str, language: str) -> int:
    if language == "zh":
        return max(1, len(re.findall(r"[\u4e00-\u9fff]", text)))
    return max(1, len(re.findall(r"\b[\w'-]+\b", text)))


def normalize_snippet(text: str) -> str:
    text = re.sub(r"\s+", " ", text.strip())
    return text[:140]


def collect_matches(text: str, patterns: Iterable[str], *, flags: int = 0) -> list[str]:
    snippets: list[str] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags):
            start = max(0, match.start() - 40)
            end = min(len(text), match.end() + 80)
            snippets.append(normalize_snippet(text[start:end]))
            if len(snippets) >= 8:
                return snippets
    return snippets


def evaluate_document(item: dict[str, str], root: Path) -> DocumentResult:
    path = root / item["path"]
    text = path.read_text()
    language = item["language"]
    rules = ZH_RULES if language == "zh" else EN_RULES
    flags = re.IGNORECASE if language == "en" else 0

    counts: dict[str, int] = {}
    examples: dict[str, list[str]] = {}
    for category, patterns in rules.items():
        matches = collect_matches(text, patterns, flags=flags)
        counts[category] = len(matches)
        if matches:
            examples[category] = matches[:3]

    total_hits = sum(counts.values())
    tokens = token_count(text, language)
    density = round(total_hits / tokens * 1000, 2)
    return DocumentResult(
        doc_id=item["id"],
        model_family=item["model_family"],
        language=language,
        path=item["path"],
        token_count=tokens,
        category_counts=counts,
        total_hits=total_hits,
        hits_per_1k_tokens=density,
        top_examples=examples,
    )


def write_json(results: list[DocumentResult], out_path: Path) -> None:
    payload = {
        "summary": summarize(results),
        "documents": [
            {
                "doc_id": r.doc_id,
                "model_family": r.model_family,
                "language": r.language,
                "path": r.path,
                "token_count": r.token_count,
                "category_counts": r.category_counts,
                "total_hits": r.total_hits,
                "hits_per_1k_tokens": r.hits_per_1k_tokens,
                "top_examples": r.top_examples,
            }
            for r in results
        ],
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def summarize(results: list[DocumentResult]) -> dict[str, object]:
    by_language = Counter(r.language for r in results)
    by_model = Counter(r.model_family for r in results)
    categories = Counter()
    for result in results:
        categories.update(result.category_counts)

    worst = sorted(results, key=lambda r: r.hits_per_1k_tokens, reverse=True)
    return {
        "documents": len(results),
        "by_language": dict(by_language),
        "by_model_family": dict(by_model),
        "top_categories": categories.most_common(10),
        "highest_density_docs": [
            {
                "doc_id": r.doc_id,
                "hits_per_1k_tokens": r.hits_per_1k_tokens,
                "total_hits": r.total_hits,
            }
            for r in worst[:5]
        ],
    }


def write_markdown(
    results: list[DocumentResult],
    out_path: Path,
    *,
    title: str,
    intro: list[str],
) -> None:
    summary = summarize(results)
    lines: list[str] = []
    lines.append(f"# {title}")
    lines.append("")
    lines.extend(intro)
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Documents: {summary['documents']}")
    lines.append(f"- Languages: {summary['by_language']}")
    lines.append(f"- Model families: {summary['by_model_family']}")
    lines.append(f"- Top categories: {summary['top_categories']}")
    lines.append("")
    lines.append("## Ranking by AI-signal density")
    lines.append("")
    lines.append("| Rank | Doc | Model | Lang | Hits | Hits/1k tokens |")
    lines.append("| --- | --- | --- | --- | ---: | ---: |")
    for idx, result in enumerate(sorted(results, key=lambda r: r.hits_per_1k_tokens, reverse=True), start=1):
        lines.append(
            f"| {idx} | {result.doc_id} | {result.model_family} | {result.language} | "
            f"{result.total_hits} | {result.hits_per_1k_tokens} |"
        )
    lines.append("")
    lines.append("## Per-document notes")
    lines.append("")
    for result in sorted(results, key=lambda r: r.hits_per_1k_tokens, reverse=True):
        lines.append(f"### {result.doc_id}")
        lines.append("")
        lines.append(f"- Path: `{result.path}`")
        lines.append(f"- Tokens: {result.token_count}")
        lines.append(f"- Total hits: {result.total_hits}")
        lines.append(f"- Hits per 1k tokens: {result.hits_per_1k_tokens}")
        top_categories = sorted(
            ((k, v) for k, v in result.category_counts.items() if v),
            key=lambda item: item[1],
            reverse=True,
        )[:5]
        lines.append(f"- Top categories: {top_categories if top_categories else 'none'}")
        if result.top_examples:
            lines.append("- Example matches:")
            for category, snippets in list(result.top_examples.items())[:3]:
                lines.append(f"  - {category}: {snippets[0]}")
        lines.append("")

    out_path.write_text("\n".join(lines) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="eval/dataset_manifest.json")
    parser.add_argument("--json-out", default="eval/results/baseline-source.json")
    parser.add_argument("--md-out", default="eval/results/baseline-source.md")
    parser.add_argument("--title", default="Baseline Evaluation Report")
    parser.add_argument(
        "--intro-mode",
        choices=["baseline", "rewritten"],
        default="baseline",
        help="Controls the explanatory text at the top of the markdown report.",
    )
    args = parser.parse_args()

    root = Path.cwd()
    manifest_path = root / args.manifest
    items = json.loads(manifest_path.read_text())
    results_dir = (root / args.json_out).parent
    results_dir.mkdir(parents=True, exist_ok=True)

    results = [evaluate_document(item, root) for item in items]
    write_json(results, root / args.json_out)
    intro_map = {
        "baseline": [
            "This report scores the source papers before any rewriting.",
            "The numbers below are heuristic AI-signal counts derived from the skill's English and Chinese rule families.",
        ],
        "rewritten": [
            "This report scores the rewritten papers produced by the current evaluation round.",
            "The numbers below are heuristic AI-signal counts derived from the skill's English and Chinese rule families.",
        ],
    }
    write_markdown(
        results,
        root / args.md_out,
        title=args.title,
        intro=intro_map[args.intro_mode],
    )
    print(f"Wrote {args.json_out}")
    print(f"Wrote {args.md_out}")


if __name__ == "__main__":
    main()
