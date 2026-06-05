#!/usr/bin/env python3
"""measure_tokens.py — real token accounting for a Claude Code skill.

Walks a skill directory and reports line + token counts, grouped by load
discipline:

  - Always-loaded: SKILL.md (enters context the moment the skill is invoked)
  - On-demand:     rules/, references/, scripts/, assets/  (only enter context
                   when Claude explicitly Reads them)
  - Untracked:     evals/, test/, anything under a dot-prefixed dir (test
                   harness, never loaded by Claude)

Usage:
  measure_tokens.py <skill_dir>
  measure_tokens.py --diff <before_dir> <after_dir>
  measure_tokens.py <skill_dir> --json

The token count uses OpenAI's `tiktoken` cl100k_base encoder as a proxy for
Claude's tokenizer. The two are not identical, but cl100k_base is within ~5%
of Claude's actual count for English+code text and is good enough for relative
sizing decisions (the only decision this script supports). For absolute
billing-grade numbers, swap in `anthropic.Anthropic().messages.count_tokens()`
via the --tokenizer flag (not yet implemented).
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

try:
    import tiktoken
except ImportError:
    sys.stderr.write(
        "error: tiktoken is required. install with:  pip install tiktoken\n"
    )
    sys.exit(2)


ALWAYS_LOADED = "SKILL.md"
ON_DEMAND_DIRS = ("rules", "references", "scripts", "assets")
SKIP_DIRS = ("evals", "test", "tests", "__pycache__")


@dataclass
class FileMetric:
    path: Path           # absolute
    rel: str             # relative to skill root, with forward slashes
    lines: int
    tokens: int
    group: str           # "always" | "on_demand" | "untracked"


@dataclass
class SkillReport:
    skill_dir: Path
    files: list[FileMetric] = field(default_factory=list)

    def by_group(self, group: str) -> list[FileMetric]:
        return [f for f in self.files if f.group == group]

    def totals(self, group: str) -> tuple[int, int]:
        items = self.by_group(group)
        return sum(f.lines for f in items), sum(f.tokens for f in items)


def count_tokens(text: str, encoder) -> int:
    return len(encoder.encode(text, disallowed_special=()))


def count_lines(text: str) -> int:
    if not text:
        return 0
    n = text.count("\n")
    if not text.endswith("\n"):
        n += 1
    return n


def classify(rel_path: Path) -> str:
    """Return load-discipline group for a path relative to skill root."""
    parts = rel_path.parts
    if not parts:
        return "untracked"
    top = parts[0]
    if top.startswith(".") or top in SKIP_DIRS:
        return "untracked"
    if len(parts) == 1 and top == ALWAYS_LOADED:
        return "always"
    if top in ON_DEMAND_DIRS:
        return "on_demand"
    return "untracked"


def walk_skill(skill_dir: Path, encoder) -> SkillReport:
    report = SkillReport(skill_dir=skill_dir)
    for path in sorted(skill_dir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(skill_dir)
        group = classify(rel)
        if group == "untracked":
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            # binary asset — skip silently
            continue
        report.files.append(FileMetric(
            path=path,
            rel=str(rel).replace("\\", "/"),
            lines=count_lines(text),
            tokens=count_tokens(text, encoder),
            group=group,
        ))
    return report


def fmt_int(n: int) -> str:
    return f"{n:>6,}"


def fmt_signed(n: int) -> str:
    return f"{n:+,}"


def print_report(report: SkillReport) -> None:
    print(f"Skill: {report.skill_dir.name}")
    print(f"  Path: {report.skill_dir}")
    print()

    always = report.by_group("always")
    on_demand = report.by_group("on_demand")

    print("  Always-loaded (enters context on every invocation):")
    if not always:
        print("    (none — no SKILL.md found)")
    else:
        for f in always:
            print(f"    {f.rel:<48}{fmt_int(f.lines)} lines  {fmt_int(f.tokens)} tokens")

    print()
    print("  On-demand (loaded only when Read by Claude):")
    if not on_demand:
        print("    (none)")
    else:
        for f in on_demand:
            print(f"    {f.rel:<48}{fmt_int(f.lines)} lines  {fmt_int(f.tokens)} tokens")

    a_lines, a_tokens = report.totals("always")
    o_lines, o_tokens = report.totals("on_demand")
    total_lines = a_lines + o_lines
    total_tokens = a_tokens + o_tokens

    print()
    print("  " + "─" * 72)
    print(f"  {'Always-loaded total:':<48}{fmt_int(a_lines)} lines  {fmt_int(a_tokens)} tokens")
    print(f"  {'On-demand total:':<48}{fmt_int(o_lines)} lines  {fmt_int(o_tokens)} tokens")
    print(f"  {'Skill total:':<48}{fmt_int(total_lines)} lines  {fmt_int(total_tokens)} tokens")
    if total_tokens > 0:
        ratio = a_tokens / total_tokens * 100
        print(f"  {'Always-loaded share of total tokens:':<48}{ratio:>5.1f}%")


def print_diff(before: SkillReport, after: SkillReport) -> None:
    a_b_lines, a_b_tokens = before.totals("always")
    a_a_lines, a_a_tokens = after.totals("always")
    o_b_lines, o_b_tokens = before.totals("on_demand")
    o_a_lines, o_a_tokens = after.totals("on_demand")

    t_b_lines = a_b_lines + o_b_lines
    t_b_tokens = a_b_tokens + o_b_tokens
    t_a_lines = a_a_lines + o_a_lines
    t_a_tokens = a_a_tokens + o_a_tokens

    print(f"Before: {before.skill_dir}")
    print(f"After:  {after.skill_dir}")
    print()
    print(f"  {'Layer':<24}{'Before':>20}{'After':>20}{'Delta':>20}")
    print("  " + "─" * 84)

    def row(label: str, b_lines: int, b_tokens: int, a_lines: int, a_tokens: int) -> None:
        d_lines = a_lines - b_lines
        d_tokens = a_tokens - b_tokens
        before_str = f"{b_lines:,}L / {b_tokens:,}T"
        after_str = f"{a_lines:,}L / {a_tokens:,}T"
        delta_str = f"{fmt_signed(d_lines)}L / {fmt_signed(d_tokens)}T"
        print(f"  {label:<24}{before_str:>20}{after_str:>20}{delta_str:>20}")

    row("Always-loaded", a_b_lines, a_b_tokens, a_a_lines, a_a_tokens)
    row("On-demand",     o_b_lines, o_b_tokens, o_a_lines, o_a_tokens)
    row("Total",         t_b_lines, t_b_tokens, t_a_lines, t_a_tokens)

    print()
    if a_b_tokens > 0:
        pct = (a_a_tokens - a_b_tokens) / a_b_tokens * 100
        verdict = "shrunk" if pct < 0 else "grew" if pct > 0 else "unchanged"
        print(f"  Always-loaded {verdict} by {abs(pct):.1f}% in tokens.")
    if t_a_tokens > t_b_tokens:
        added = t_a_tokens - t_b_tokens
        print(f"  Total content grew by {added:,} tokens (added new rules/scripts/assets).")


def report_to_dict(report: SkillReport) -> dict:
    a_lines, a_tokens = report.totals("always")
    o_lines, o_tokens = report.totals("on_demand")
    return {
        "skill_dir": str(report.skill_dir),
        "files": [
            {"rel": f.rel, "group": f.group, "lines": f.lines, "tokens": f.tokens}
            for f in report.files
        ],
        "totals": {
            "always": {"lines": a_lines, "tokens": a_tokens},
            "on_demand": {"lines": o_lines, "tokens": o_tokens},
            "skill": {"lines": a_lines + o_lines, "tokens": a_tokens + o_tokens},
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Measure line + token counts for a Claude Code skill.",
    )
    parser.add_argument("skill_dir", nargs="?", help="Path to skill directory.")
    parser.add_argument("--diff", nargs=2, metavar=("BEFORE", "AFTER"),
                        help="Compare two skill snapshots.")
    parser.add_argument("--json", action="store_true",
                        help="Emit machine-readable JSON instead of a human report.")
    args = parser.parse_args(argv)

    if not args.skill_dir and not args.diff:
        parser.error("either skill_dir or --diff is required")

    encoder = tiktoken.get_encoding("cl100k_base")

    if args.diff:
        before_path, after_path = (Path(p).resolve() for p in args.diff)
        for p in (before_path, after_path):
            if not p.is_dir():
                sys.stderr.write(f"error: not a directory: {p}\n")
                return 2
        before = walk_skill(before_path, encoder)
        after = walk_skill(after_path, encoder)
        if args.json:
            print(json.dumps({
                "before": report_to_dict(before),
                "after": report_to_dict(after),
            }, indent=2))
        else:
            print_diff(before, after)
        return 0

    skill_dir = Path(args.skill_dir).resolve()
    if not skill_dir.is_dir():
        sys.stderr.write(f"error: not a directory: {skill_dir}\n")
        return 2

    report = walk_skill(skill_dir, encoder)
    if args.json:
        print(json.dumps(report_to_dict(report), indent=2))
    else:
        print_report(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
