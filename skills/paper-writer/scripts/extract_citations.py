#!/usr/bin/env python3
"""extract_citations.py — the citation-EXISTENCE verification apparatus.

Two jobs, one deterministic script (stdlib only):

  (1) CHECKLIST EMISSION (default, no --verify):
      Emit the full, machine-readable checklist of every distinct citation the
      paper carries — each reference entry with its stable citation-id and the
      identifier (DOI/URL/ISBN) the agent must resolve. This is the worklist for
      the MANDATORY existence check: the agent looks up EACH id, confirms it
      resolves to a real, matching source, and records a per-id verdict in a
      verification ledger (JSON). Exit 0 on a readable paper with >=1 citation.

  (2) VERIFY GATE (--verify LEDGER.json): the OUT-OF-BAND BLOCK.
      Existence itself cannot be checked by a pure stdlib script — it needs a
      real lookup, which the agent performs. What this script enforces
      DETERMINISTICALLY is that the checklist was actually COMPLETED and is
      internally consistent, so a green "citations resolve" report can NEVER be
      emitted from the draft's own say-so:

        - every extracted citation MUST have a ledger entry, and
        - that entry's verdict MUST be terminal: RESOLVED (looked up, real,
          supports the claim) or SOURCE_NEEDED (could not verify -> claim marked
          [SOURCE NEEDED]/[需要来源] in the paper and dropped, NEVER shipped as
          resolved), and
        - a SOURCE_NEEDED verdict MUST be backed by an actual [SOURCE NEEDED] /
          [需要来源] marker in the paper (else it was silently shipped as if
          resolved -> inconsistent -> BLOCK).

      Any citation that is undispositioned, PENDING, missing from the ledger, or
      inconsistent is UNRESOLVED. exit 1 (BLOCK) + the unresolved count if any
      remain; else exit 0. A missing ledger file blocks everything (exit 1).

      The gate opens ONLY when the checklist is 100% dispositioned. The report may
      then print "resolve/valid" — but only when unresolved==0 AND source_needed==0;
      with source_needed>0 the report must say "N marked [SOURCE NEEDED]", never
      "all resolve". This is the F1 fix: form-checked-green is not existence-green.

Malformed invocation = exit 2 (argparse). Existence is NEVER asserted by this
script; it asserts only that the human/agent existence check was completed.
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
        return "doi:" + m.group(0)
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
        for (surname, year), entry in cc.ref_authordate_keys(ref_lines):
            out.append((f"{surname}_{year}", first_identifier(entry), entry))
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
        print(f"VERIFY: PASS (checklist complete) — {total} dispositioned; "
              f"{len(source_needed)} marked [SOURCE NEEDED] and dropped, "
              f"{total - len(source_needed)} RESOLVED. "
              f"Report MUST say 'N marked [SOURCE NEEDED]' — NOT 'all resolve'.")
        for cid in source_needed:
            print(f"  - id={cid}: SOURCE_NEEDED (claim marked + dropped)")
        return 0

    print(f"VERIFY: PASS — all {total} citation(s) RESOLVED (looked up, real, matching). "
          f"Report may state 'citations {total}/{total} resolve'.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Citation-existence checklist + verify gate (existence check, not form).")
    ap.add_argument("paper", help="path to the paper (markdown)")
    ap.add_argument("--style", choices=sorted(cc.AUTHOR_DATE_STYLES | cc.NUMERIC_STYLES), required=True)
    ap.add_argument("--verify", metavar="LEDGER", default=None,
                    help="verification ledger JSON; run the out-of-band existence gate instead of emitting the checklist")
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
