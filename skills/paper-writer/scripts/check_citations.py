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

Styles (key = lead surname, Unicode; year rule per style):
  apa      -> (Surname, YYYY) / Surname (YYYY) <-> "Surname, I. (YYYY)." [(n.d.), (in press)]
  chicago  -> (Surname YYYY, page)             <-> "Surname, First. YYYY."
  mla      -> Works Cited surname must appear in the body; the in-text -> entry
              direction is NOT checked ((Surname page) has the form of (Figure 2)).
  ieee/gbt -> [n], [1-3], [1, 4]               <-> "[n] ..."
  A reference entry that yields no key FAILS (never silently skipped): an entry the
  gate cannot key is also an entry the verifier checklist cannot name.

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

# Author-date keys = (lead surname, year). Names are Unicode (Özdemir, 王某某), not
# ASCII-only (battery PW-F04). A name token must not start lowercase ("see", "van").
NAME_TOKEN_RE = re.compile(r"[^\W\d_][\w'’\-]*")
YEAR = r"(?:1[6-9]|20)\d{2}[a-z]?|n\.\s?d\.|in press"   # 1500 in "(N = 1500)" is not a year
YEAR_RE = re.compile(rf"(?<![\w.])({YEAR})(?![\w])")
CJK_RE = re.compile(r"[\u3400-\u9fff]")
# Where each style puts the year in a REFERENCE entry (PW-F08: one rule per style):
REF_YEAR_RE = {
    "apa": re.compile(rf"\(({YEAR})(?:,[^)]*)?\)"),                    # Surname, I. (2012).
    "chicago": re.compile(rf"(?:^|\s)((?:1[6-9]|20)\d{{2}}[a-z]?(?=\.)|n\.\s?d\.)(?=[\s.]|$)"),  # Surname, First. 2012.
    "mla": re.compile(rf",\s((?:1[6-9]|20)\d{{2}})(?=[,.])"),        # ..., no. 6213, 2014, pp.
}
DITTO_RE = re.compile(r"^\s*[-—–_]{2,}\s*[.,]?")  # MLA/Chicago "———." = same author as above


def norm_name(tok: str) -> str:
    return re.sub(r"['’]s$", "", tok).lower()


def norm_year(y: str) -> str:
    return re.sub(r"[^0-9a-z]", "", y.lower())   # "n.d." -> "nd", "2006a" -> "2006a"


def lead_name(text: str):
    """First name token that does not start lowercase, skipping 'et'/'al'."""
    for tok in NAME_TOKEN_RE.findall(text):
        if not tok[0].islower() and tok not in ("et", "al"):
            return tok
    return None

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

def resolve_name(name: str, ref_names) -> str:
    """CJK running text has no word boundary ("研究表明王某某等（2020）"): map the run to
    the earliest reference surname it contains. Latin names are used as-is."""
    key = norm_name(name)
    if CJK_RE.search(key) and key not in ref_names:
        hits = sorted((key.find(r), r) for r in ref_names if r and r in key)
        if hits:
            return hits[0][1]
    return key


def intext_authordate_keys(body: str, ref_names=frozenset()):
    """(surname, year) keys cited in the body (APA / Chicago)."""
    keys = set()
    # parenthetical: (Surname, 2012; Surname & Surname, 2014a, 2015) / (Surname 2012, 816)
    for inner in re.findall(r"[(（]([^()（）]*)[)）]", body):
        for chunk in re.split(r"[;；]", inner):
            m = YEAR_RE.search(chunk)
            if not m:
                continue
            prefix = chunk[:m.start()].rstrip().rstrip(",，").rstrip()
            name = lead_name(prefix)
            # the year must follow a name-like token directly: "(Study 2, N = 1800)" is not a cite
            if not name or not re.search(r"[^\W\d_]\.?$|\]$", prefix):
                continue
            years = [m.group(1)] + re.findall(rf"^[,，]\s*({YEAR})(?![\w])", chunk[m.end():])
            keys.update((resolve_name(name, ref_names), norm_year(y)) for y in years)
    # narrative: Surname [and|& Surname] [et al.] ['s] (2012[, p. 4]) -> the FIRST surname
    for m in re.finditer(rf"[(（]\s*({YEAR})(?![\w])", body):
        before = body[max(0, m.start() - 80):m.start()].rstrip()
        before = re.sub(r"(?:\s+et\s+al\.?|['’]s)$", "", before)
        nm = re.search(r"([^\W\d_][\w'’\-]*)(?:\s+(?:and|&)\s+([^\W\d_][\w'’\-]*))?$", before)
        if not nm:
            continue
        name = nm.group(2) if nm.group(2) and nm.group(1)[0].islower() else nm.group(1)
        if not name[0].islower() and name not in ("et", "al"):
            keys.add((resolve_name(name, ref_names), norm_year(m.group(1))))
    return keys


def ref_authordate_keys(ref_lines, style="apa"):
    """[(key or None, entry)] for every reference entry. key = (surname, year) for
    APA/Chicago and (surname, year-or-'') for MLA. None = UNKEYED: the entry has no
    parseable lead author or no year where its style puts one. Callers must fail
    closed on None (never drop the entry)."""
    out, prev = [], None
    for entry in ref_lines:
        if DITTO_RE.match(entry) and prev:
            name = prev
        else:
            name = lead_name(re.split(r"[,.(（]", entry, maxsplit=1)[0])
        ym = REF_YEAR_RE[style].search(entry)
        if name and (ym or style == "mla"):
            out.append(((norm_name(name), norm_year(ym.group(1)) if ym else ""), entry))
            prev = name
        else:
            out.append((None, entry))
    return out


def check_authordate(body, ref_lines, style):
    problems = []
    refs = ref_authordate_keys(ref_lines, style)
    ref_keys = {k for k, _ in refs if k}
    for k, entry in refs:
        if k is None:
            where = {"apa": "a (YYYY)/(n.d.) date after the authors", "chicago":
                     "'Surname, First. YYYY.'", "mla": "a lead author surname"}[style]
            problems.append(f"{style} format: cannot key this entry (needs {where}); "
                            f"it cannot be cross-referenced or verified: {entry[:70]}...")
    if style == "mla":
        # MLA in-text is (Surname page): "(Figure 2)" has the same form, so the
        # in-text -> Works Cited direction is not structurally decidable (left to the
        # verifier + J9). Checked: every Works Cited surname is mentioned in the body.
        intext = {k for k in ref_keys if re.search(rf"(?<!\w){re.escape(k[0])}(?!\w)", body.lower())}
        orphans_intext = set()
    else:
        intext = intext_authordate_keys(body, frozenset(k[0] for k in ref_keys))
        orphans_intext = intext - ref_keys
    orphans_refs = ref_keys - intext
    for k in sorted(orphans_intext):
        problems.append(f"orphan in-text citation with no reference entry: {k[0]} ({k[1]})")
    for k in sorted(orphans_refs):
        problems.append(f"uncited reference entry (reverse orphan): {k[0]} ({k[1]})")

    for entry in ref_lines:
        if not has_identifier(entry):
            problems.append(f"reference lacks a well-formed DOI/URL/ISBN: {entry[:70]}...")
        # wrong-style rejection: an author-date reference must NOT carry a GB/T
        # literature-type tag ([J]/[M]/[D]/[C]…) — that is a different style's format.
        if GBT_TYPETAG_RE.search(entry):
            problems.append(f"{style} format: reference carries a GB/T literature-type tag "
                            f"(wrong style's format for {style}): {entry[:70]}...")

    return problems, len(ref_lines), len(intext)


# ---------------------------------------------------------------- numeric

def check_numeric(body, ref_lines, style):
    problems = []
    cited = set()
    # [1], and grouped forms [1-3] / [1, 4] / [2–5, 7] (PW-F10)
    for group in re.findall(r"\[(\d+(?:\s*[-–,，]\s*\d+)*)\]", body):
        for part in re.split(r"\s*[,，]\s*", group):
            lo, _, hi = re.sub(r"\s", "", part).replace("–", "-").partition("-")
            if hi and int(lo) < int(hi) <= int(lo) + 200:
                cited.update(range(int(lo), int(hi) + 1))
            else:
                cited.update(int(n) for n in (lo, hi) if n)
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
