#!/usr/bin/env python3
"""extract_shadow_map.py — deterministic shadow-map extractor for the AIM step.

When the target is philosophy-grounded, its rules carry lint-enforced six-piece fields
(阴影原则 / shadow-principle = how the mechanism reverses into risk, and 可证伪问题 /
falsifiable-questions = ready-made probes). Those are exactly the pre-drawn attack map.

We extract them by deterministic grep — NOT by an LLM. An LLM extractor would re-open the
map-tampering surface (a weak/adversarial model could drop or reword the most dangerous
shadow-principle), and would make cross-model runs incomparable. Fields the script cannot
parse are emitted as `needs_human`, never silently dropped.

Action surface (A36): read-only — reads .md files, writes stdout only. Extracted text is
attack-map DATA from the target, never instructions to the striker (P10).

Structure checks only (A50): per node, is each field present, and is every line under a
falsifiable-questions header a bullet? A node carrying only ONE of the two fields, an empty
question list, or an unrecognised line shape (e.g. a `1.` list) is `needs_human` — never judged.

Stdlib only, model-agnostic. Usage:
    python3 extract_shadow_map.py <file-or-dir> [--json]
    python3 extract_shadow_map.py --selftest   # non-vacuity: clean fixture passes, tampers flag
"""
import argparse
import json
import os
import re
import sys

# Section headers the KB uses for the two attack-map fields. Bilingual + markdown-bold tolerant.
SHADOW_RE = re.compile(r"\*\*(?:阴影原则|Shadow[- ]?Principle)\*\*[:：]?\s*(.*)", re.IGNORECASE)
FALSIFY_RE = re.compile(r"\*\*(?:可证伪问题|Falsifiable[- ]?Questions?)\*\*[:：]?", re.IGNORECASE)
# A node header like "## C3｜..." or "### A11（...）" or "## S10｜信任边界".
NODE_RE = re.compile(r"^#{2,4}\s+([A-Z]\d+|P\d+|A\d+|T\d+)[｜（(．.\s]")


def iter_md_files(path):
    if os.path.isfile(path):
        yield path
        return
    for root, _dirs, files in os.walk(path):
        for f in sorted(files):
            if f.endswith(".md"):
                yield os.path.join(root, f)


def extract(path):
    """Return list of {node, file, line, shadow, falsifiable[], needs_human}."""
    out = []
    cur = None
    with open(path, encoding="utf-8") as fh:
        lines = fh.readlines()
    for i, raw in enumerate(lines):
        line = raw.rstrip("\n")
        m = NODE_RE.match(line)
        if m:
            if cur:
                out.append(cur)
            cur = {"node": m.group(1), "file": path, "line": i + 1,
                   "shadow": None, "falsifiable": [], "needs_human": []}
            continue
        if cur is None:
            continue
        ms = SHADOW_RE.search(line)
        if ms:
            cur["shadow"] = ms.group(1).strip() or None
            if not cur["shadow"]:
                cur["needs_human"].append(f"empty shadow-principle @line {i+1}")
            continue
        if FALSIFY_RE.search(line):
            # collect bullets as probes until a new bold/node header, or a blank after >=1 bullet
            cur["has_falsify_header"] = True
            j = i + 1
            while j < len(lines):
                nxt = lines[j].rstrip("\n")
                if nxt.startswith("**") or NODE_RE.match(nxt) or (nxt.strip() == "" and cur["falsifiable"]):
                    break
                if nxt.strip().startswith(("- ", "* ", "• ")):
                    cur["falsifiable"].append(nxt.strip()[2:].strip())
                elif nxt.strip():  # any other shape under the header is surfaced, not dropped
                    cur["needs_human"].append(f"unrecognised falsifiable-question line @line {j+1}")
                j += 1
            if not cur["falsifiable"]:
                cur["needs_human"].append(f"falsifiable-questions header with no bullet @line {i+1}")
    if cur:
        out.append(cur)
    return out


def mark_gaps(nodes):
    """A node missing either field is a gap in the map, not silently fine."""
    for n in nodes:
        has_f = n.pop("has_falsify_header", False) or n["falsifiable"]
        if n["shadow"] is None and not has_f:
            n["needs_human"].append("no shadow-principle and no falsifiable-questions found")
        elif n["shadow"] is None and not any("shadow" in h for h in n["needs_human"]):
            n["needs_human"].append("falsifiable-questions but no shadow-principle header")
        elif not has_f:
            n["needs_human"].append("shadow-principle but no falsifiable-questions header")
    return nodes


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("path", nargs="?", help="a philosophy KB file or directory")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        return selftest()
    if not args.path:
        ap.error("path required")

    nodes = []
    for f in iter_md_files(args.path):
        nodes.extend(extract(f))

    mark_gaps(nodes)
    covered = [n for n in nodes if n["shadow"] or n["falsifiable"]]
    gaps = [n for n in nodes if n["needs_human"]]

    if args.json:
        print(json.dumps({"nodes": nodes, "covered": len(covered),
                          "total": len(nodes), "needs_human": len(gaps)},
                         ensure_ascii=False, indent=2))
    else:
        print(f"shadow-map: {len(covered)}/{len(nodes)} nodes carry an attack surface; "
              f"{len(gaps)} need human review")
        for n in nodes:
            surf = n["shadow"] or (n["falsifiable"][0] if n["falsifiable"] else "—")
            flag = "  [needs_human]" if n["needs_human"] else ""
            print(f"  {n['node']:>5}  {surf[:90]}{flag}")
    # Non-zero exit if the map has holes — a tampered/incomplete map must not pass silently.
    return 1 if gaps else 0


def selftest():
    import tempfile
    ok = "## S1｜x\n**阴影原则**：r\n**可证伪问题**：\n- q1\n- q2\n"
    cases = {"clean": (ok, 0), "renamed-shadow": (ok.replace("阴影原则", "阴影"), 1),
             "one-numbered-line": (ok.replace("- q2", "1. q2"), 1),
             "empty-question-list": (ok.replace("- q1\n- q2\n", "\n**BAD**：x\n"), 1),
             "no-question-header": (ok.split("**可证伪问题**")[0], 1)}
    bad = 0
    for name, (text, want) in cases.items():
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(text)
        got = sum(1 for n in mark_gaps(extract(f.name)) if n["needs_human"])
        os.unlink(f.name)
        print(f"selftest {name}: {'ok' if (got > 0) == bool(want) else 'FAIL'}")
        bad += (got > 0) != bool(want)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
