#!/usr/bin/env python3
"""extract_shadow_map.py — deterministic shadow-map extractor for the AIM step.

When the target is philosophy-grounded, its rules carry lint-enforced six-piece fields
(阴影原则 / shadow-principle = how the mechanism reverses into risk, and 可证伪问题 /
falsifiable-questions = ready-made probes). Those are exactly the pre-drawn attack map.

We extract them by deterministic grep — NOT by an LLM. An LLM extractor would re-open the
map-tampering surface (a weak/adversarial model could drop or reword the most dangerous
shadow-principle), and would make cross-model runs incomparable. Fields the script cannot
parse are emitted as `needs_human`, never silently dropped.

Stdlib only, model-agnostic. Usage:
    python3 extract_shadow_map.py <file-or-dir> [--json]
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
            # collect following bullet/dash lines as probes until a blank or new bold header
            j = i + 1
            while j < len(lines):
                nxt = lines[j].rstrip("\n")
                if nxt.strip().startswith(("-", "*", "•")):
                    cur["falsifiable"].append(nxt.strip().lstrip("-*• ").strip())
                elif nxt.strip() == "" or nxt.startswith("**") or NODE_RE.match(nxt):
                    break
                j += 1
    if cur:
        out.append(cur)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("path", help="a philosophy KB file or directory")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    nodes = []
    for f in iter_md_files(args.path):
        nodes.extend(extract(f))

    # A node with neither field is a gap in the map, not silently fine.
    for n in nodes:
        if n["shadow"] is None and not n["falsifiable"]:
            n["needs_human"].append("no shadow-principle and no falsifiable-questions found")

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


if __name__ == "__main__":
    sys.exit(main())
