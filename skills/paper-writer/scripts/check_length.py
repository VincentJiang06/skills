#!/usr/bin/env python3
"""check_length.py — deterministic word/character counter with a counting-
convention flag. Pass (exit 0) = body count within [min, max]; out of band
= exit 1. Malformed invocation = exit 2 (argparse).

Conventions:
  en_words  : whitespace-delimited token count (markdown '#' heading markers
              and list bullets stripped) — the English word-count convention.
  zh_chars  : count of CJK ideographic characters — the Chinese character-
              count convention (U2: ZH counts characters, not words).

COUNTING CONVENTION (reproducible, disclosed in the compliance report):
  * The reference / bibliography list is EXCLUDED BY DEFAULT — body word/char
    counts never include the reference list, so a sub-min body can NOT be lifted
    over the bar by padding the reference list (battery F2). The default-excluded
    heading set is: References / Works Cited / Bibliography / 参考文献 / 引用文献.
  * Markdown heading '#' markers and list bullets are stripped (heading WORDS are
    kept; the marker glyphs are not counted).
  * --include-references opts BACK IN to counting the reference list (rare;
    disclose it in the report if used).

--exclude-section NAME (repeatable): ALSO drop the block from a heading whose
  text matches NAME (e.g. an "Abstract" a discipline excludes), from that heading
  through the next heading or EOF. Additive on top of the default reference
  exclusion.

Stdlib only. This is a stateless pure function of its input file + flags: the
output depends only on the immediate input, never on preceding context.
"""
from __future__ import annotations

import argparse
import re
import sys

HEADING_RE = re.compile(r"^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$")

# Reference-list headings excluded from the body count BY DEFAULT (F2).
DEFAULT_EXCLUDED_SECTIONS = ["references", "works cited", "bibliography", "参考文献", "引用文献"]


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def strip_excluded_sections(text: str, exclude_names) -> str:
    if not exclude_names:
        return text
    wanted = {n.strip().lower() for n in exclude_names}
    lines = text.splitlines()
    out = []
    skipping = False
    for line in lines:
        m = HEADING_RE.match(line)
        if m:
            title = m.group(2).strip().lower()
            if title in wanted:
                skipping = True
                continue
            else:
                skipping = False
        if not skipping:
            out.append(line)
    return "\n".join(out)


def strip_markdown_markers(text: str) -> str:
    lines = []
    for line in text.splitlines():
        m = HEADING_RE.match(line)
        if m:
            lines.append(m.group(2))  # keep heading words, drop '#'
        else:
            # drop leading list bullets / blockquote markers
            lines.append(re.sub(r"^\s{0,3}([-*+>]\s+|\d+\.\s+)", "", line))
    return "\n".join(lines)


def count_en_words(text: str) -> int:
    text = strip_markdown_markers(text)
    tokens = [t for t in re.split(r"\s+", text) if t.strip()]
    return len(tokens)


def count_zh_chars(text: str) -> int:
    # CJK Unified Ideographs (incl. common extension ranges) — count characters.
    return len(re.findall(r"[㐀-䶿一-鿿豈-﫿]", text))


def main() -> int:
    ap = argparse.ArgumentParser(description="Deterministic length checker for paper-writer.")
    ap.add_argument("paper", help="path to the paper (markdown/plain text)")
    ap.add_argument("--min", type=int, required=True, help="minimum count (inclusive)")
    ap.add_argument("--max", type=int, required=True, help="maximum count (inclusive)")
    ap.add_argument("--convention", choices=["en_words", "zh_chars"], required=True)
    ap.add_argument("--exclude-section", action="append", default=[],
                    help="ADDITIONAL heading name to exclude from the count (repeatable)")
    ap.add_argument("--include-references", action="store_true",
                    help="opt back IN to counting the reference list (default: excluded)")
    args = ap.parse_args()

    try:
        text = read_text(args.paper)
    except OSError as e:
        print(f"check_length: cannot read {args.paper}: {e}", file=sys.stderr)
        return 2

    excluded = list(args.exclude_section)
    if not args.include_references:
        excluded = excluded + DEFAULT_EXCLUDED_SECTIONS
    body = strip_excluded_sections(text, excluded)
    count = count_en_words(body) if args.convention == "en_words" else count_zh_chars(body)

    refs_note = "refs=counted" if args.include_references else "refs=excluded"
    in_band = args.min <= count <= args.max
    verdict = "PASS" if in_band else "FAIL"
    where = "in band" if in_band else ("under" if count < args.min else "over")
    print(f"LENGTH: {verdict} count={count} convention={args.convention} {refs_note} "
          f"band=[{args.min},{args.max}] ({where})")
    return 0 if in_band else 1


if __name__ == "__main__":
    sys.exit(main())
