#!/usr/bin/env python3
"""diff_lossless.py — verify a skill restructure preserved every fact.

Compares two snapshots of a skill (a "before" directory and an "after"
directory) and answers one question: did the restructure lose any content?

The script flattens every markdown / yaml / json / script file in each snapshot
into a multiset of normalized lines, then diffs the two multisets:

  - KEPT:       lines present in both snapshots
  - REWRITTEN:  lines that disappeared from `before`, but a high-similarity
                match exists in `after` (suggests a hardening rewrite)
  - LOST:       lines that disappeared from `before` with NO close match in
                `after` (a real loss — violates the lossless principle)
  - ADDED:      lines that appear only in `after` (new content)

Exit code:
  0  — no LOST or REWRITTEN lines (new content is allowed)
  1  — at least one LOST or REWRITTEN line needs explicit classification
  2  — usage / IO error

Files considered:  *.md, *.yaml, *.yml, *.json, *.py, *.js, *.mjs, *.ts, *.tsx, *.jsx, *.sh
Files skipped:     anything under evals/, test/, tests/, .git/, .*

Lines considered:  non-empty after stripping leading/trailing whitespace
                   and collapsing internal whitespace runs to single spaces

Usage:
  diff_lossless.py <before_dir> <after_dir>
  diff_lossless.py <before_dir> <after_dir> --threshold 0.7
  diff_lossless.py <before_dir> <after_dir> --json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

CONTENT_SUFFIXES = (
    ".md", ".yaml", ".yml", ".json",
    ".py", ".js", ".mjs", ".ts", ".tsx", ".jsx", ".sh",
)
SKIP_DIRS = {"evals", "test", "tests", ".git", "__pycache__"}

_WS = re.compile(r"\s+")


def normalize_line(line: str) -> str:
    return _WS.sub(" ", line).strip()


def is_skipped(rel: Path) -> bool:
    for part in rel.parts:
        if part.startswith(".") or part in SKIP_DIRS:
            return True
    return False


def collect_lines(skill_dir: Path) -> Counter[str]:
    bag: Counter[str] = Counter()
    for path in sorted(skill_dir.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in CONTENT_SUFFIXES:
            continue
        rel = path.relative_to(skill_dir)
        if is_skipped(rel):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for raw in text.splitlines():
            norm = normalize_line(raw)
            if norm:
                bag[norm] += 1
    return bag


@dataclass
class DiffResult:
    kept: list[str]
    lost: list[str]
    rewritten: list[tuple[str, str, float]]  # (before_line, best_after_match, score)
    added: list[str]


def diff_skills(before: Counter[str], after: Counter[str], threshold: float) -> DiffResult:
    kept_counter = before & after
    lost_counter = before - after
    added_counter = after - before

    kept = sorted(kept_counter.elements())
    lost_raw = sorted(lost_counter.elements())
    added_raw = sorted(added_counter.elements())

    # For each truly-disappeared line, try to find a high-similarity match in
    # the added pool. If found, classify as a rewrite, not a loss.
    rewritten: list[tuple[str, str, float]] = []
    lost: list[str] = []
    added_pool = list(added_raw)

    for line in lost_raw:
        best_idx = -1
        best_score = 0.0
        for i, cand in enumerate(added_pool):
            score = SequenceMatcher(None, line, cand).ratio()
            if score > best_score:
                best_score = score
                best_idx = i
        if best_score >= threshold and best_idx >= 0:
            rewritten.append((line, added_pool[best_idx], best_score))
            # Consume the matched added line so we don't reuse it.
            added_pool.pop(best_idx)
        else:
            lost.append(line)

    added = sorted(added_pool)
    return DiffResult(kept=kept, lost=lost, rewritten=rewritten, added=added)


def truncate(s: str, n: int = 80) -> str:
    return s if len(s) <= n else s[: n - 1] + "…"


def print_report(before_dir: Path, after_dir: Path, result: DiffResult) -> None:
    print(f"Before: {before_dir}")
    print(f"After:  {after_dir}")
    print()
    print(f"  kept:      {len(result.kept):>5} lines")
    print(f"  rewritten: {len(result.rewritten):>5} lines  (lost in before, high-sim match in after)")
    print(f"  lost:      {len(result.lost):>5} lines  (no destination — violates losslessness)")
    print(f"  added:     {len(result.added):>5} lines  (new content)")
    print()

    if result.lost:
        print("LOST — these lines existed in `before` but have no near-match in `after`:")
        for line in result.lost:
            print(f"  - {truncate(line)}")
        print()

    if result.rewritten:
        print("REWRITTEN — likely hardening rewrites (review each one):")
        for old, new, score in result.rewritten:
            print(f"  ~ ({score:.2f}) {truncate(old)}")
            print(f"          →  {truncate(new)}")
        print()

    if not result.lost and not result.rewritten:
        print("✓ Every line in `before` survives verbatim in `after`. Pure compress/encapsulate move.")
    elif not result.lost:
        print(f"✗ {len(result.rewritten)} line(s) were REWRITTEN. Classify each rewrite before accepting.")
    else:
        print(f"✗ {len(result.lost)} line(s) were LOST. Restructure violates the lossless principle.")


def result_to_dict(result: DiffResult) -> dict:
    return {
        "counts": {
            "kept": len(result.kept),
            "rewritten": len(result.rewritten),
            "lost": len(result.lost),
            "added": len(result.added),
        },
        "lost": result.lost,
        "rewritten": [
            {"before": old, "after": new, "similarity": round(score, 3)}
            for old, new, score in result.rewritten
        ],
        "added": result.added,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Verify a skill restructure preserved every line of content.",
    )
    parser.add_argument("before", help="Path to before snapshot.")
    parser.add_argument("after", help="Path to after snapshot.")
    parser.add_argument("--threshold", type=float, default=0.6,
                        help="Similarity threshold (0-1) for classifying a "
                             "disappeared line as a rewrite vs a loss. Default 0.6.")
    parser.add_argument("--json", action="store_true",
                        help="Emit JSON instead of human-readable report.")
    args = parser.parse_args(argv)

    before_dir = Path(args.before).resolve()
    after_dir = Path(args.after).resolve()
    for p in (before_dir, after_dir):
        if not p.is_dir():
            sys.stderr.write(f"error: not a directory: {p}\n")
            return 2

    before = collect_lines(before_dir)
    after = collect_lines(after_dir)
    result = diff_skills(before, after, threshold=args.threshold)

    if args.json:
        print(json.dumps(result_to_dict(result), indent=2, ensure_ascii=False))
    else:
        print_report(before_dir, after_dir, result)

    return 1 if result.lost or result.rewritten else 0


if __name__ == "__main__":
    sys.exit(main())
