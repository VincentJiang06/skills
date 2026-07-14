#!/usr/bin/env python3
"""check_citations.py — the STRUCTURAL integrity gate. Deterministic, stdlib
only. Pass (exit 0) = zero orphans in either direction AND every reference
carries a well-formed identifier AND no per-style format violation on checked
entries. Any structural defect = exit 1. Malformed invocation = exit 2.

WHAT THIS GATE DOES (form) and DOES NOT (existence):
  It validates the SHAPE of the citation apparatus:
    (a) bidirectional in-text <-> reference cross-reference (zero orphans);
    (b) every reference has a syntactically valid DOI / URL / ISBN;
    (c) a light per-style format marker check.
  It CANNOT tell whether an identifier POINTS AT A REAL, MATCHING source — a
  fabricated reference with a well-formed-but-invented DOI PASSES this gate by
  construction (the green-but-wrong shape, spec FAQ Q4/Q6). Existence and
  claim-support are the SEPARATE source_fidelity dimension, judged by an
  independent verifier with source lookup (references/subjective-rubric.md).
  This script must never be presented as an anti-fabrication guarantee.

Styles:
  apa / mla / chicago  -> author-date resolution  ( (Surname, YYYY) )
  ieee / gbt           -> numeric resolution       ( [n] )

Stateless pure function of file + flags.
"""
from __future__ import annotations

import argparse
import re
import sys

AUTHOR_DATE_STYLES = {"apa", "mla", "chicago"}
NUMERIC_STYLES = {"ieee", "gbt"}

HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$")
REF_HEADING_RE = re.compile(r"^(references|works cited|bibliography|参考文献|引用文献)$", re.IGNORECASE)

# identifier syntax (FORM only — never existence). Each pattern requires a
# real, resolvable SHAPE, not merely a recognizable prefix:
#   DOI : the registrant/suffix `10.NNNN/...` shape.
#   URL : http(s) + a host that has at least one dot and a >=2-letter TLD, so a
#         bare `http://x` (no dot, no TLD — not a resolvable address) is REJECTED.
#         This closes the green-but-wrong hole where any `http://<garbage>` string
#         counted as a well-formed locator (battery F1).
#   ISBN: 10- or 13-digit ISBN body.
DOI_RE = re.compile(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+")
URL_RE = re.compile(r"https?://[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}(?:[:/?#]\S*)?")
ISBN_RE = re.compile(r"ISBN(?:[-\s]?1[03])?[:\s]*([0-9Xx][0-9Xx\-\s]{8,})", re.IGNORECASE)

SURNAME = r"[A-Z][A-Za-z''\-]+"

# GB/T 7714 literature-type tags (文献类型标志): [J] journal, [M] monograph,
# [D] dissertation, [C] conference, plus the other standard single-letter and
# electronic-carrier tags. Every GB/T reference entry must carry one.
GBT_TYPETAG_RE = re.compile(r"\[(?:J|M|D|C|N|S|P|R|G|A|Z|CP|DB|CM|EB)(?:/(?:OL|DK|MT|CD))?\]")


def split_body_and_refs(text: str):
    """Return (body_text, [reference_entry_lines])."""
    lines = text.splitlines()
    ref_start = None
    for i, line in enumerate(lines):
        m = HEADING_RE.match(line)
        if m and REF_HEADING_RE.match(m.group(1).strip()):
            ref_start = i
            break
    if ref_start is None:
        return text, []
    body = "\n".join(lines[:ref_start])
    ref_lines = [ln.strip() for ln in lines[ref_start + 1:] if ln.strip()]
    return body, ref_lines


def has_identifier(entry: str) -> bool:
    if DOI_RE.search(entry) or URL_RE.search(entry):
        return True
    m = ISBN_RE.search(entry)
    if m:
        digits = re.sub(r"[^0-9Xx]", "", m.group(1))
        if len(digits) in (10, 13):
            return True
    return False


# ---------------------------------------------------------------- author-date

def intext_authordate_keys(body: str):
    keys = set()
    # parenthetical: (... YYYY ...) possibly ';'-separated multiple cites
    for inner in re.findall(r"\(([^()]*\d{4}[a-z]?[^()]*)\)", body):
        for chunk in inner.split(";"):
            sm = re.search(SURNAME, chunk)
            ym = re.search(r"(\d{4})", chunk)
            if sm and ym:
                keys.add((sm.group(0).lower(), ym.group(1)))
    # narrative: Surname [et al.] (YYYY)
    for sm, ym in re.findall(rf"({SURNAME})(?:\s+et al\.?)?\s+\((\d{{4}})[a-z]?\)", body):
        keys.add((sm.lower(), ym))
    return keys


def ref_authordate_keys(ref_lines):
    keys = []
    for entry in ref_lines:
        sm = re.match(rf"\s*({SURNAME})", entry)
        ym = re.search(r"\((\d{4})[a-z]?\)", entry) or re.search(r"\b(\d{4})\b", entry)
        if sm and ym:
            keys.append(((sm.group(1).lower(), ym.group(1)), entry))
    return keys


def check_authordate(body, ref_lines, style):
    problems = []
    intext = intext_authordate_keys(body)
    refs = ref_authordate_keys(ref_lines)
    ref_keys = {k for k, _ in refs}

    orphans_intext = intext - ref_keys
    orphans_refs = ref_keys - intext
    for k in sorted(orphans_intext):
        problems.append(f"orphan in-text citation with no reference entry: {k[0]} ({k[1]})")
    for k in sorted(orphans_refs):
        problems.append(f"uncited reference entry (reverse orphan): {k[0]} ({k[1]})")

    for entry in ref_lines:
        if not has_identifier(entry):
            problems.append(f"reference lacks a well-formed DOI/URL/ISBN: {entry[:70]}...")
        # per-style format marker: author-date styles require a (YYYY)
        if not re.search(r"\(\d{4}[a-z]?\)", entry):
            problems.append(f"{style} format: reference missing (YYYY) date marker: {entry[:70]}...")
        # wrong-style rejection: an author-date reference must NOT carry a GB/T
        # literature-type tag ([J]/[M]/[D]/[C]…) — that is a different style's format.
        if GBT_TYPETAG_RE.search(entry):
            problems.append(f"{style} format: reference carries a GB/T literature-type tag "
                            f"(wrong style's format for {style}): {entry[:70]}...")

    return problems, len(ref_lines), len(intext)


# ---------------------------------------------------------------- numeric

def check_numeric(body, ref_lines, style):
    problems = []
    cited = set(int(n) for n in re.findall(r"\[(\d+)\]", body))
    listed = {}
    for entry in ref_lines:
        m = re.match(r"\[(\d+)\]", entry)
        if m:
            listed[int(m.group(1))] = entry
        else:
            # wrong-style rejection: a numeric-style reference list entry that
            # does not begin with a `[n]` marker is malformed for this style
            # (e.g. an author-date `Surname, I. (YYYY)` entry pasted into an
            # IEEE/GB/T list).
            problems.append(f"{style} format: reference entry not in numeric `[n] …` form "
                            f"(wrong style's format): {entry[:70]}...")
    listed_nums = set(listed)

    for n in sorted(cited - listed_nums):
        problems.append(f"orphan in-text marker [{n}] with no reference entry")
    for n in sorted(listed_nums - cited):
        problems.append(f"uncited reference entry [{n}] (reverse orphan)")

    for n, entry in listed.items():
        if not has_identifier(entry):
            problems.append(f"reference [{n}] lacks a well-formed DOI/URL/ISBN")
        # GB/T 7714 format: every reference must carry a literature-type tag
        # ([J]/[M]/[D]/[C]…). This is a real per-style rule the docs state
        # (references/citation-styles.md, GB/T block) — an entry lacking it is a
        # style-format violation (battery F3).
        if style == "gbt" and not GBT_TYPETAG_RE.search(entry):
            problems.append(f"gbt format: reference [{n}] missing a literature-type tag "
                            f"[J]/[M]/[D]/[C]…: {entry[:70]}...")

    return problems, len(listed), len(cited)


def main() -> int:
    ap = argparse.ArgumentParser(description="Structural citation-integrity gate (form, not existence).")
    ap.add_argument("paper", help="path to the paper (markdown)")
    ap.add_argument("--style", choices=sorted(AUTHOR_DATE_STYLES | NUMERIC_STYLES), required=True)
    args = ap.parse_args()

    try:
        with open(args.paper, "r", encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        print(f"check_citations: cannot read {args.paper}: {e}", file=sys.stderr)
        return 2

    body, ref_lines = split_body_and_refs(text)
    if not ref_lines:
        print("CITATIONS: FAIL — no reference list found")
        return 1

    if args.style in NUMERIC_STYLES:
        problems, nref, ncite = check_numeric(body, ref_lines, args.style)
    else:
        problems, nref, ncite = check_authordate(body, ref_lines, args.style)

    if problems:
        print(f"CITATIONS: FAIL — style={args.style} refs={nref} intext={ncite}")
        for p in problems:
            print(f"  - {p}")
        return 1
    print(f"CITATIONS: PASS — style={args.style} refs={nref} intext={ncite}; "
          f"zero orphans, all identifiers well-formed "
          f"(NOTE: form only; existence/support = source_fidelity)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
