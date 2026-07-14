#!/usr/bin/env python3
"""measure_tokens.py — real token accounting + architecture flags for a Claude Code skill.

Absorbed into skill-creator-max from skill-zipper (proven tool, logic
unchanged). Used by the zipper stage / Z-series CompressionReport to measure
per-path token deltas (per_path_token_delta) and flag oversized always-loaded
content ahead of a compression pass.

Walks a skill directory and reports line + token counts, grouped by load
discipline, PLUS the frontmatter `description` size and a set of architecture
flags that surface the parts a restructure should refine.

  - Description:   the frontmatter `description:` — the HIGHEST-leverage text. It
                   sits in the available-skills index on EVERY turn (not just on
                   invocation), Claude Code truncates it past a hard limit, and an
                   over-long one dilutes trigger signal. Measured + flagged here.
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
Claude's tokenizer (within ~5% for English+code; good enough for relative sizing).
"""

from __future__ import annotations

import argparse
import json
import re
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

# --- Architecture budgets (thresholds the flags use; tune in diagnosis-rubric.md) ---
DESC_HARD_LIMIT = 1024     # chars — Claude Code TRUNCATES the description beyond this
DESC_TARGET = 320          # chars — trigger-focused target (what + when/$trigger + key do-NOT)
SKILL_TOK_CONCERNING = 1500
SKILL_TOK_BAD = 3000
ONDEMAND_TOK_BIG = 4000    # a single on-demand file this large should usually be split
ONDEMAND_LINES_BIG = 400


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
    skill_md_text: str = ""       # raw SKILL.md (for orphan detection)
    desc_present: bool = False
    desc_chars: int = 0
    desc_tokens: int = 0

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


def extract_description(skill_md_text: str) -> str | None:
    """Return the folded frontmatter `description:` value, or None if absent.

    Handles YAML block scalars (`>`, `>-`, `|`, `|-`) and plain/quoted scalars,
    folding to the rendered string Claude actually sees (single newlines -> spaces).
    """
    m = re.match(r"^---\n(.*?)\n---", skill_md_text, re.S)
    if not m:
        return None
    fm = m.group(1).split("\n")
    i = next((k for k, l in enumerate(fm) if re.match(r"^description:", l)), -1)
    if i < 0:
        return None
    head = re.sub(r"^description:\s*", "", fm[i])
    if head[:1] in (">", "|"):  # block scalar — gather indented/blank lines
        buf = []
        i += 1
        while i < len(fm) and (fm[i] == "" or fm[i][:1] in (" ", "\t")):
            buf.append(fm[i])
            i += 1
        out, prev_blank = "", True
        for line in (l.strip() for l in buf):
            if line == "":
                out += "\n"
                prev_blank = True
            else:
                out += ("" if prev_blank else " ") + line
                prev_blank = False
        return out.strip()
    # plain/quoted scalar (may continue on indented continuation lines)
    buf = [head]
    i += 1
    while i < len(fm) and fm[i][:1] in (" ", "\t"):
        buf.append(fm[i].strip())
        i += 1
    return " ".join(buf).strip().strip('"').strip("'")


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
        if str(rel).replace("\\", "/") == ALWAYS_LOADED:
            report.skill_md_text = text
            desc = extract_description(text)
            if desc is not None:
                report.desc_present = True
                report.desc_chars = len(desc)
                report.desc_tokens = count_tokens(desc, encoder)
    return report


def compute_flags(report: SkillReport) -> list[tuple[str, str, str]]:
    """Architecture flags: (severity, area, message). severity ∈ ok|warn|bad."""
    flags: list[tuple[str, str, str]] = []

    # 1. description — the most-always-loaded text
    if report.desc_present:
        c = report.desc_chars
        if c > DESC_HARD_LIMIT:
            flags.append(("bad", "description",
                          f"{c} chars > {DESC_HARD_LIMIT} HARD LIMIT — Claude Code TRUNCATES it; "
                          f"Retrigger/Compress to a trigger-only description (~{DESC_TARGET} chars)"))
        elif c > DESC_TARGET:
            flags.append(("warn", "description",
                          f"{c} chars > {DESC_TARGET} target — dilutes trigger signal; "
                          f"cut to what + when/$trigger + the key do-NOT (feature detail belongs in the body)"))
    else:
        flags.append(("bad", "description", "no frontmatter description found — the skill cannot trigger reliably"))

    # 2. always-loaded SKILL.md budget
    _, a_tokens = report.totals("always")
    if a_tokens > SKILL_TOK_BAD:
        flags.append(("bad", "always-loaded",
                      f"SKILL.md {a_tokens:,} tokens > {SKILL_TOK_BAD:,} — Encapsulate detail into on-demand rules/references"))
    elif a_tokens > SKILL_TOK_CONCERNING:
        flags.append(("warn", "always-loaded",
                      f"SKILL.md {a_tokens:,} tokens > {SKILL_TOK_CONCERNING:,} — candidate for Encapsulate/Compress"))

    on_demand = report.by_group("on_demand")

    # 3. oversized CONTEXT-LOADED files. rules/references/assets get Read INTO context,
    #    so size matters; scripts/ are EXECUTED (not loaded), so skip them here.
    for f in on_demand:
        if f.rel.startswith("scripts/"):
            continue
        if f.tokens > ONDEMAND_TOK_BIG or f.lines > ONDEMAND_LINES_BIG:
            flags.append(("warn", "on-demand",
                          f"{f.rel} is large ({f.lines} lines / {f.tokens:,} tokens) — consider splitting or compressing"))

    # 4. orphan on-demand files: referenced by NOBODY (SKILL.md OR any other file) =
    #    dead weight, or a missing 'load when' pointer.
    texts: dict[str, str] = {}
    for f in on_demand:
        try:
            texts[f.rel] = f.path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            texts[f.rel] = ""
    for f in on_demand:
        base = f.rel.split("/")[-1]
        referenced = (base in report.skill_md_text or f.rel in report.skill_md_text
                      or any((base in t or f.rel in t) for r, t in texts.items() if r != f.rel))
        if not referenced:
            flags.append(("warn", "orphan",
                          f"{f.rel} is referenced nowhere (SKILL.md or other files) — dead weight, or a missing 'load when' pointer"))

    return flags


def fmt_int(n: int) -> str:
    return f"{n:>6,}"


def fmt_signed(n: int) -> str:
    return f"{n:+,}"


def _desc_band(report: SkillReport) -> str:
    if not report.desc_present:
        return "MISSING"
    c = report.desc_chars
    if c > DESC_HARD_LIMIT:
        return f"OVER HARD LIMIT (>{DESC_HARD_LIMIT}, truncated)"
    if c > DESC_TARGET:
        return f"dilution (>{DESC_TARGET} target)"
    return "ok"


def print_report(report: SkillReport) -> None:
    print(f"Skill: {report.skill_dir.name}")
    print(f"  Path: {report.skill_dir}")
    print()

    # Description — loaded in the available-skills index on EVERY turn
    if report.desc_present:
        print(f"  Description (frontmatter — in the skill index on EVERY turn):")
        print(f"    {report.desc_chars:>6,} chars  {report.desc_tokens:>5,} tokens   [{_desc_band(report)}]")
    else:
        print("  Description: (MISSING — the skill cannot trigger reliably)")
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

    # Architecture flags — what a comprehensive refinement should act on
    flags = compute_flags(report)
    print()
    print("  Architecture flags (every part + the load architecture):")
    if not flags:
        print("    ✓ none — description within limits, lean always-loaded, no oversized/orphan parts")
    else:
        sev_mark = {"bad": "✗ BAD ", "warn": "• warn", "ok": "  ok  "}
        for sev, area, msg in flags:
            print(f"    {sev_mark.get(sev, '?')} [{area}] {msg}")


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
    # description delta (a Retrigger/Compress on the description shows up here)
    if before.desc_present or after.desc_present:
        print(f"  {'Description chars':<24}{before.desc_chars:>20,}{after.desc_chars:>20,}{fmt_signed(after.desc_chars - before.desc_chars):>20}")
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
        "description": {
            "present": report.desc_present,
            "chars": report.desc_chars,
            "tokens": report.desc_tokens,
            "hard_limit": DESC_HARD_LIMIT,
            "target": DESC_TARGET,
            "over_hard_limit": report.desc_chars > DESC_HARD_LIMIT,
            "band": _desc_band(report),
        },
        "files": [
            {"rel": f.rel, "group": f.group, "lines": f.lines, "tokens": f.tokens}
            for f in report.files
        ],
        "totals": {
            "always": {"lines": a_lines, "tokens": a_tokens},
            "on_demand": {"lines": o_lines, "tokens": o_tokens},
            "skill": {"lines": a_lines + o_lines, "tokens": a_tokens + o_tokens},
        },
        "flags": [
            {"severity": sev, "area": area, "message": msg}
            for sev, area, msg in compute_flags(report)
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Measure line + token counts (and architecture flags) for a Claude Code skill.",
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
