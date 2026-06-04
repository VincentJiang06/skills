#!/usr/bin/env python3
"""
Compare source and rewritten heuristic evaluation outputs.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load(path: Path) -> dict:
    return json.loads(path.read_text())


def compare(source: dict, rewritten: dict) -> dict:
    src_docs = {doc["doc_id"]: doc for doc in source["documents"]}
    out_docs = {doc["doc_id"]: doc for doc in rewritten["documents"]}
    comparisons = []
    for doc_id, src in src_docs.items():
        if doc_id not in out_docs:
            continue
        out = out_docs[doc_id]
        comparisons.append(
            {
                "doc_id": doc_id,
                "language": src["language"],
                "model_family": src["model_family"],
                "source_hits": src["total_hits"],
                "rewritten_hits": out["total_hits"],
                "source_density": src["hits_per_1k_tokens"],
                "rewritten_density": out["hits_per_1k_tokens"],
                "density_delta": round(out["hits_per_1k_tokens"] - src["hits_per_1k_tokens"], 2),
                "hit_delta": out["total_hits"] - src["total_hits"],
            }
        )
    comparisons.sort(key=lambda item: item["density_delta"])
    return {
        "documents_compared": len(comparisons),
        "average_source_density": round(sum(c["source_density"] for c in comparisons) / len(comparisons), 2) if comparisons else 0,
        "average_rewritten_density": round(sum(c["rewritten_density"] for c in comparisons) / len(comparisons), 2) if comparisons else 0,
        "comparisons": comparisons,
    }


def write_markdown(report: dict, path: Path) -> None:
    lines = [
        "# Rewrite Comparison Report",
        "",
        f"- Documents compared: {report['documents_compared']}",
        f"- Average source density: {report['average_source_density']}",
        f"- Average rewritten density: {report['average_rewritten_density']}",
        "",
        "| Doc | Lang | Source hits | Rewritten hits | Source/1k | Rewritten/1k | Delta |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in report["comparisons"]:
        lines.append(
            f"| {row['doc_id']} | {row['language']} | {row['source_hits']} | {row['rewritten_hits']} | "
            f"{row['source_density']} | {row['rewritten_density']} | {row['density_delta']} |"
        )
    path.write_text("\n".join(lines) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="eval/results/baseline-source.json")
    parser.add_argument("--rewritten", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--md-out", required=True)
    args = parser.parse_args()

    report = compare(load(Path(args.source)), load(Path(args.rewritten)))
    Path(args.json_out).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    write_markdown(report, Path(args.md_out))


if __name__ == "__main__":
    main()
