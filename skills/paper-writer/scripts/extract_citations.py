#!/usr/bin/env python3
"""extract_citations.py — citation checklist emitter + ledger-COMPLETENESS gate.

Two jobs, one deterministic script (stdlib only):

  (1) CHECKLIST EMISSION (default, no --verify):
      Emit the full, machine-readable checklist of every distinct citation the
      paper carries — each reference entry with its stable citation-id and the
      identifier (DOI/URL/ISBN). This is the worklist handed to the independent
      citation verifier (a fresh, non-fork subagent; see SKILL.md), which looks
      up EACH id and records a per-id verdict in its verification ledger (JSON).
      Exit 0 on a readable paper with >=1 citation.

  (2) LEDGER-COMPLETENESS GATE (--verify LEDGER.json): a D-plane skeleton check.
      Existence and support cannot be checked by a pure stdlib script — they need
      a real lookup and a judgment, which belong to the LEDGER'S AUTHOR (the
      independent verifier). What this script checks DETERMINISTICALLY is only
      that the ledger is COMPLETE and INTERNALLY CONSISTENT:

        - every extracted citation has a ledger entry, and
        - that entry's verdict is terminal: RESOLVED or SOURCE_NEEDED, and
        - if any verdict is SOURCE_NEEDED, the paper carries at least one
          [SOURCE NEEDED] / [需要来源] marker (whole-paper check, NOT per-id).

      Any citation that is undispositioned, PENDING, missing from the ledger, or
      inconsistent is UNRESOLVED -> exit 1 (BLOCK). A missing ledger blocks
      everything. Else exit 0.

      What exit 0 does NOT establish: that any source exists or supports its
      claim, or who wrote the ledger (a ledger typed by the paper's own author
      passes just the same). Those are established — or not — by whoever wrote
      the ledger; the reply must name that (see SKILL.md "Who decides what").

Malformed invocation = exit 2 (argparse).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import check_citations as cc  # noqa: E402  (sibling script, run-not-imported elsewhere)

TERMINAL_VERDICTS = {"RESOLVED", "SOURCE_NEEDED"}
SOURCE_NEEDED_MARKER_RE = re.compile(r"\[SOURCE NEEDED[^\]]*\]|\[需要来源[^\]]*\]")


def first_identifier(entry: str) -> str:
    m = cc.DOI_RE.search(entry)
    if m:
        return "doi:" + m.group(0).rstrip(".,;")   # sentence-final period is not part of the DOI
    m = cc.URL_RE.search(entry)
    if m:
        return m.group(0)
    m = cc.ISBN_RE.search(entry)
    if m:
        return "ISBN " + re.sub(r"\s+", "", m.group(1))
    return "<NO WELL-FORMED IDENTIFIER>"


def extract_citations(text: str, style: str):
    """Return an ordered list of (citation_id, identifier, entry) for every
    reference entry, using the same resolution mode as check_citations."""
    body, ref_lines = cc.split_body_and_refs(text)
    out = []
    if style in cc.NUMERIC_STYLES:
        for entry in ref_lines:
            m = re.match(r"\[(\d+)\]", entry)
            cid = f"[{m.group(1)}]" if m else f"<UNNUMBERED:{entry[:20]}>"
            out.append((cid, first_identifier(entry), entry))
    else:
        # Fail closed (PW-F04): an entry with no key is listed as <UNKEYED:…> and needs
        # a verdict like any other. Year suffixes stay in the id (2006a / 2006b), and any
        # remaining collision gets _2, _3 so each entry has its own verdict (PW-F05).
        seen = {}
        for key, entry in cc.ref_authordate_keys(ref_lines, style):
            cid = "_".join(p for p in key if p) if key else f"<UNKEYED:{entry[:20]}>"
            seen[cid] = seen.get(cid, 0) + 1
            if seen[cid] > 1:
                cid = f"{cid}_{seen[cid]}"
            out.append((cid, first_identifier(entry), entry))
    return out


def emit_checklist(citations, style) -> int:
    if not citations:
        print("EXTRACT: FAIL — no reference entries found to verify")
        return 1
    print(f"CITATION CHECKLIST (style={style}) — verify EACH id resolves to a real, "
          f"matching source; record a verdict per id in the verification ledger:")
    for cid, ident, entry in citations:
        print(f"  - id={cid} | identifier={ident} | VERIFY: {entry[:80]}")
    print(f"TOTAL {len(citations)} citation(s) to verify. "
          f"RESOLVED = looked up + real + supports claim; "
          f"SOURCE_NEEDED = could not verify -> mark [SOURCE NEEDED] and drop the claim. "
          f"Never ship an unverified citation as resolved.")
    return 0


def run_verify(text: str, citations, ledger_path: str) -> int:
    if not os.path.isfile(ledger_path):
        print(f"VERIFY: BLOCK — verification ledger not found at '{ledger_path}'. "
              f"The existence check has not been performed; a paper may not ship "
              f"a 'citations resolve' report without a completed ledger.")
        print(f"  unresolved={len(citations)}/{len(citations)}")
        return 1
    try:
        with open(ledger_path, "r", encoding="utf-8") as f:
            ledger = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"VERIFY: BLOCK — cannot read/parse ledger '{ledger_path}': {e}")
        return 1

    entries = ledger.get("citations") or {}
    has_marker = bool(SOURCE_NEEDED_MARKER_RE.search(text))

    unresolved = []
    source_needed = []
    for cid, ident, entry in citations:
        rec = entries.get(cid)
        verdict = (rec or {}).get("verdict") if isinstance(rec, dict) else None
        if verdict not in TERMINAL_VERDICTS:
            unresolved.append((cid, verdict or "MISSING"))
        elif verdict == "SOURCE_NEEDED":
            if not has_marker:
                # dispositioned SOURCE_NEEDED but no marker in the paper => it was
                # silently shipped as if resolved. Inconsistent => unresolved.
                unresolved.append((cid, "SOURCE_NEEDED-but-no-marker-in-paper"))
            else:
                source_needed.append(cid)

    total = len(citations)
    if unresolved:
        print(f"VERIFY: BLOCK — {len(unresolved)}/{total} citation(s) UNRESOLVED; "
              f"a 'citations resolve' report may NOT be emitted.")
        for cid, state in unresolved:
            print(f"  - id={cid}: {state}")
        print(f"  unresolved={len(unresolved)}/{total}")
        return 1

    if source_needed:
        print(f"VERIFY: PASS (ledger complete and internally consistent) — {total} dispositioned; "
              f"{len(source_needed)} marked [SOURCE NEEDED] and dropped, "
              f"{total - len(source_needed)} RESOLVED. "
              f"Report MUST say 'N marked [SOURCE NEEDED]' — NOT 'all resolve'.")
        for cid in source_needed:
            print(f"  - id={cid}: SOURCE_NEEDED (claim marked + dropped)")
        return 0

    print(f"VERIFY: PASS — ledger complete and internally consistent: all {total} citation(s) "
          f"carry verdict RESOLVED. This script did not check existence or support; the "
          f"ledger's author did (name them in the report).")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Citation checklist + ledger-completeness gate (checks the ledger is complete and consistent; does not check existence).")
    ap.add_argument("paper", help="path to the paper (markdown)")
    ap.add_argument("--style", choices=sorted(cc.AUTHOR_DATE_STYLES | cc.NUMERIC_STYLES), required=True)
    ap.add_argument("--verify", metavar="LEDGER", default=None,
                    help="verification ledger JSON; run the ledger-completeness gate instead of emitting the checklist")
    args = ap.parse_args()

    try:
        with open(args.paper, "r", encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        print(f"extract_citations: cannot read {args.paper}: {e}", file=sys.stderr)
        return 2

    citations = extract_citations(text, args.style)

    if args.verify is None:
        return emit_checklist(citations, args.style)

    if not citations:
        print("VERIFY: BLOCK — no reference entries to verify (a paper making cited "
              "claims must carry a reference list)")
        return 1
    return run_verify(text, citations, args.verify)


if __name__ == "__main__":
    sys.exit(main())
