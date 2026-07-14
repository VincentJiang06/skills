#!/usr/bin/env python3
"""check_sections.py — heading presence (+ optional order) vs the parsed
requirement. Pass (exit 0) = every required heading found (and, with
--ordered, in a valid relative order); a missing or mis-ordered heading =
exit 1. Malformed invocation = exit 2 (argparse).

--required "A,B,C"  : comma-separated required section names.
--ordered           : additionally require the required names to appear in the
                      document in the given relative order (subsequence).

A required name matches a heading when the heading text equals it (case-
insensitive) or begins with it followed by a space (so "Methods of review"
satisfies required "Methods"). Stateless pure function of file + flags.
"""
from __future__ import annotations

import argparse
import re
import sys

HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$")


def parse_headings(text: str):
    headings = []
    for line in text.splitlines():
        m = HEADING_RE.match(line)
        if m:
            headings.append(m.group(1).strip())
    return headings


def matches(required: str, heading: str) -> bool:
    r = required.strip().lower()
    h = heading.strip().lower()
    return h == r or h.startswith(r + " ")


def first_index(required: str, headings) -> int:
    for i, h in enumerate(headings):
        if matches(required, h):
            return i
    return -1


def main() -> int:
    ap = argparse.ArgumentParser(description="Deterministic section presence/order checker.")
    ap.add_argument("paper", help="path to the paper (markdown)")
    ap.add_argument("--required", required=True, help="comma-separated required section names")
    ap.add_argument("--ordered", action="store_true", help="also enforce the required order")
    args = ap.parse_args()

    try:
        with open(args.paper, "r", encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        print(f"check_sections: cannot read {args.paper}: {e}", file=sys.stderr)
        return 2

    required = [r.strip() for r in args.required.split(",") if r.strip()]
    headings = parse_headings(text)

    missing = [r for r in required if first_index(r, headings) < 0]
    problems = []
    if missing:
        problems.append("missing: " + ", ".join(missing))

    if args.ordered and not missing:
        indices = [first_index(r, headings) for r in required]
        for a, b in zip(indices, indices[1:]):
            if a >= b:
                problems.append("order violation: required order not honored in document")
                break

    if problems:
        print("SECTIONS: FAIL — " + " | ".join(problems))
        return 1
    print(f"SECTIONS: PASS — all {len(required)} required headings present"
          + (" and in order" if args.ordered else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
