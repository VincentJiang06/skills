#!/usr/bin/env python3
"""
Batch rewrite evaluation documents with codex exec.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


EN_RULES = [
    "Preserve meaning, evidence, numbers, chronology, and section structure.",
    "Keep an academic register: serious, restrained, specific, and readable.",
    "Remove common AI-writing signals: inflated significance, promotional adjectives, vague attribution, empty uplift, formulaic contrasts, rule-of-three scaffolding, em-dash overuse, filler phrases, and generic conclusions.",
    "Prefer direct claims, concrete verbs, and precise transitions.",
    "Prefer plain academic paragraphs over bullet-heavy markdown, bold lead-in labels, and management-report formatting unless the source truly requires list structure.",
    "Cut report boilerplate such as 'this paper examines', 'the following section discusses', 'main findings', or other structure-announcing filler when it adds no content.",
    "Before finalizing, silently check for sentence-shape residue such as 'not just X but Y', stock 'future outlook' headings, and repeated 'The period from X to Y...' constructions, and rewrite them if they are not necessary.",
    "Do not invent facts, citations, or quotations.",
    "Output only the rewritten paper in Markdown.",
]

ZH_RULES = [
    "保留原文含义、证据、数字、时间顺序和章节结构。",
    "保持学术语域：严肃、克制、具体、可读，不要口语化。",
    "重点消除中文 AI 痕迹：不是……而是……、不仅……还……、首先/其次/最后、在……背景下、具有重要意义、起到重要作用、抽象名词化、空泛升华、模板化总结。",
    "优先使用直接陈述、具体动词和真实逻辑衔接，不要靠套话推进。",
    "优先改成段落化学术表达，避免粗体领句、答题式列表、过密编号标题和管理咨询式报告外壳，除非原文确实依赖该结构。",
    "删除只负责报幕的元叙述，如“本文拟”“本报告将”“研究背景与意义”“增长动力分析”“主要研究发现”等；如果保留标题，也要让标题简洁自然。",
    "在定稿前，静默检查并尽量消除这些高风险连接词或句型：同时、此外、另一方面、总的来说、综上所述、由此可见、值得注意的是、不可忽视的是、这说明、这体现了、这反映出。",
    "不要编造事实、引文、数据或来源。",
    "只输出改写后的 Markdown 正文，不要加说明。",
]

PROMPT_VERSION = "1.2"


def make_prompt(language: str, source_text: str) -> str:
    rules = ZH_RULES if language == "zh" else EN_RULES
    preface = (
        f"请改写下面这篇中文学术文本。你是在执行 Humanizer Academic v{PROMPT_VERSION} 评测。\n\n要求：\n"
        if language == "zh"
        else f"Rewrite the following academic paper. You are running the Humanizer Academic v{PROMPT_VERSION} evaluation.\n\nRequirements:\n"
    )
    body = "\n".join(f"- {rule}" for rule in rules)
    extra = (
        "\n\n定稿前请静默做一次清理：删掉仍然像 AI 模板、报告壳子或答题格式残留的句子与版式。\n"
        if language == "zh"
        else "\n\nBefore finalizing, do one silent cleanup pass for any remaining AI-template, report-shell, or answer-format residue.\n"
    )
    source_label = "\n\n原文：\n\n" if language == "zh" else "\n\nSource paper:\n\n"
    return f"{preface}{body}{extra}{source_label}{source_text}\n"


def run_one(
    item: dict[str, str],
    root: Path,
    output_dir: Path,
    timeout: int,
    force: bool,
    max_attempts: int,
) -> dict[str, object]:
    source_path = root / item["path"]
    output_path = output_dir / f"{item['id']}.md"
    log_path = output_dir / f"{item['id']}.log"
    output_dir.mkdir(parents=True, exist_ok=True)

    if output_path.exists() and output_path.stat().st_size > 0 and not force:
        return {
            "id": item["id"],
            "status": "skipped",
            "output_path": str(output_path.relative_to(root)),
            "log_path": str(log_path.relative_to(root)),
        }

    prompt = make_prompt(item["language"], source_path.read_text())
    cmd = [
        "codex",
        "exec",
        "--ephemeral",
        "-c",
        'model_reasoning_effort="medium"',
        "-s",
        "read-only",
        "--color",
        "never",
        "-C",
        str(root),
        "-o",
        str(output_path),
        "-",
    ]
    last_result: dict[str, object] | None = None
    for attempt in range(1, max_attempts + 1):
        if output_path.exists():
            output_path.unlink()
        try:
            result = subprocess.run(
                cmd,
                input=prompt,
                text=True,
                capture_output=True,
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
            stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")
            log_path.write_text(
                f"[ATTEMPT {attempt}/{max_attempts}]\n" + stdout + "\n[TIMEOUT]\n" + stderr
            )
            last_result = {
                "id": item["id"],
                "status": "timeout",
                "output_path": str(output_path.relative_to(root)),
                "log_path": str(log_path.relative_to(root)),
                "attempts": attempt,
            }
        else:
            log_path.write_text(
                f"[ATTEMPT {attempt}/{max_attempts}]\n"
                + (result.stdout or "")
                + ("\n" if result.stdout else "")
                + (result.stderr or "")
            )
            status = "ok" if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0 else "failed"
            last_result = {
                "id": item["id"],
                "status": status,
                "returncode": result.returncode,
                "output_path": str(output_path.relative_to(root)),
                "log_path": str(log_path.relative_to(root)),
                "attempts": attempt,
            }
            if status == "ok":
                return last_result

        if attempt < max_attempts:
            time.sleep(min(2 * attempt, 6))

    assert last_result is not None
    return last_result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="eval/dataset_manifest.json")
    parser.add_argument("--output-dir", default="eval/outputs/codex-gpt-5.4")
    parser.add_argument("--timeout", type=int, default=360)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--ids", nargs="*")
    parser.add_argument("--max-attempts", type=int, default=3)
    args = parser.parse_args()

    root = Path.cwd()
    all_items = json.loads((root / args.manifest).read_text())
    manifest = list(all_items)
    if args.ids:
        wanted = set(args.ids)
        manifest = [item for item in manifest if item["id"] in wanted]
    if args.limit is not None:
        manifest = manifest[: args.limit]

    output_dir = root / args.output_dir
    results = []
    existing_manifest_path = output_dir / "manifest.json"
    existing_manifest = {}
    if existing_manifest_path.exists():
        existing_manifest = {
            item["id"]: item for item in json.loads(existing_manifest_path.read_text())
        }
    for idx, item in enumerate(manifest, start=1):
        print(f"[{idx}/{len(manifest)}] {item['id']}", flush=True)
        result = run_one(item, root, output_dir, args.timeout, args.force, args.max_attempts)
        results.append(result)
        if result["status"] in {"ok", "skipped"}:
            existing_manifest[item["id"]] = {
                "id": item["id"],
                "model_family": item["model_family"],
                "language": item["language"],
                "topic": item["topic"],
                "path": result["output_path"],
            }

    rewritten_manifest = [
        existing_manifest[item["id"]]
        for item in all_items
        if item["id"] in existing_manifest
        and (root / existing_manifest[item["id"]]["path"]).exists()
    ]
    (output_dir / "manifest.json").write_text(json.dumps(rewritten_manifest, ensure_ascii=False, indent=2) + "\n")
    (output_dir / "run-summary.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")

    failures = [r for r in results if r["status"] not in {"ok", "skipped"}]
    print(json.dumps({"total": len(results), "failures": len(failures), "output_dir": str(output_dir.relative_to(root))}, ensure_ascii=False))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
