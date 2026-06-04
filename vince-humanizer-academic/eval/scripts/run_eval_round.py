#!/usr/bin/env python3
"""
Run a full evaluation round: rewrite -> score rewritten outputs -> compare to baseline.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], root: Path) -> None:
    print("+", " ".join(cmd), flush=True)
    result = subprocess.run(cmd, cwd=root, check=False)
    if result.returncode != 0:
        sys.exit(result.returncode)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--round-id", required=True, help="Output label, e.g. codex-gpt-5.4-v2")
    parser.add_argument("--manifest", default="eval/dataset_manifest.json")
    parser.add_argument("--timeout", type=int, default=360)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--ids", nargs="*")
    parser.add_argument("--polish-english", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    output_dir = f"eval/outputs/{args.round_id}"
    result_json = f"eval/results/{args.round_id}.json"
    result_md = f"eval/results/{args.round_id}.md"
    compare_json = f"eval/results/{args.round_id}-compare.json"
    compare_md = f"eval/results/{args.round_id}-compare.md"

    rewrite_cmd = [
        "python3",
        "eval/scripts/run_codex_rewrites.py",
        "--manifest",
        args.manifest,
        "--output-dir",
        output_dir,
        "--timeout",
        str(args.timeout),
    ]
    if args.force:
        rewrite_cmd.append("--force")
    if args.ids:
        rewrite_cmd.extend(["--ids", *args.ids])
    run(rewrite_cmd, root)

    if args.polish_english:
        manifest = json.loads((root / output_dir / "manifest.json").read_text())
        english_files = [
            str(root / item["path"])
            for item in manifest
            if item["language"] == "en"
        ]
        if english_files:
            run(
                [
                    "python3",
                    "humanizer-academic/scripts/polish_english.py",
                    *english_files,
                ],
                root,
            )

    run(
        [
            "python3",
            "eval/scripts/run_baseline_eval.py",
            "--manifest",
            f"{output_dir}/manifest.json",
            "--json-out",
            result_json,
            "--md-out",
            result_md,
            "--title",
            f"Evaluation Report: {args.round_id}",
            "--intro-mode",
            "rewritten",
        ],
        root,
    )

    run(
        [
            "python3",
            "eval/scripts/compare_eval_results.py",
            "--source",
            "eval/results/baseline-source.json",
            "--rewritten",
            result_json,
            "--json-out",
            compare_json,
            "--md-out",
            compare_md,
        ],
        root,
    )


if __name__ == "__main__":
    main()
