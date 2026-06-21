#!/usr/bin/env python3
"""Low-visibility audit entry point: scope -> analyze -> emit doc set.

Audits an existing mobile UI (H5 `.html` or WeChat mini-program `.wxml`) for
FIELD low-visibility issues and writes a structured handoff document set. It
NEVER edits the target — output goes only to the out dir (default
`<target>/.lv-audit`). Built to be re-run cheaply on a scoped subset.

  python3 audit.py <file|dir> [--pages a,b,c] [--selector .sel] [--css sheet.wxss]
                   [--viewport-px 375] [--max-pages N] [--out DIR]
                   [--input-mode static|visual_estimate] [--json]

Exit: 0 ok | 2 bad target / missing --css | 3 empty scope | 4 internal | 5 OUTPUT_ONLY refusal.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze       # noqa: E402
import scope as scope_mod  # noqa: E402
import emit_docs     # noqa: E402


def _read(path):
    # tolerant decoding so a non-UTF-8 stylesheet never crashes the audit
    return analyze.read_text_tolerant(path)


def _auto_css(path):
    """For a .wxml page, auto-pair a sibling .wxss of the same stem."""
    if path.lower().endswith(".wxml"):
        cand = path[: -len(".wxml")] + ".wxss"
        if os.path.isfile(cand):
            return cand
    return None


def main(argv=None):
    ap = argparse.ArgumentParser(description="Low-visibility audit -> handoff doc set")
    ap.add_argument("target", help="an .html/.wxml file, or a directory of pages")
    ap.add_argument("--pages", help="comma-separated page names to scope to")
    ap.add_argument("--selector", help="restrict to nodes matching this simple selector")
    ap.add_argument("--css", help="external stylesheet (.css/.wxss) to merge for an exact audit")
    ap.add_argument("--viewport-px", type=int, default=375)
    ap.add_argument("--max-pages", type=int, default=20)
    ap.add_argument("--out", help="output dir for the doc set (default <target>/.lv-audit)")
    ap.add_argument("--input-mode", choices=["static", "visual_estimate"], default="static")
    ap.add_argument("--json", action="store_true", help="print the doc set as JSON to stdout")
    args = ap.parse_args(argv)

    if not os.path.exists(args.target):
        print(f"error: no such target: {args.target}", file=sys.stderr)
        return 2

    pages = [p.strip() for p in args.pages.split(",") if p.strip()] if args.pages else None
    sc = scope_mod.resolve_scope(args.target, pages=pages, selector=args.selector,
                                 max_pages=args.max_pages)
    if sc["status"] == "empty_scope":
        miss = ", ".join(sc["missing"]) or args.target
        print(f"error: empty scope — requested page(s) not found: {miss}", file=sys.stderr)
        print("       (no full-scan fallback; check the page name or --pages)", file=sys.stderr)
        return 3

    if args.css and not os.path.isfile(args.css):
        print(f"error: --css file not found: {args.css}", file=sys.stderr)
        return 2
    tokens = analyze.load_tokens(None)
    css_extra = _read(args.css) if args.css else None
    base = args.target if os.path.isdir(args.target) else os.path.dirname(args.target)

    analyses = []
    for f in sc["files"]:
        per_css = css_extra
        if per_css is None:
            ac = _auto_css(f)
            if ac:
                per_css = _read(ac)
        try:
            res = analyze.analyze_path(f, tokens, css_extra=per_css,
                                       selector=args.selector, viewport_px=args.viewport_px)
        except Exception as exc:  # never crash the run — degrade to a recorded problem
            res = {"summary": {"score": 100,
                               "by_severity": {"critical": 0, "major": 0, "minor": 0},
                               "resolved_count": 0, "needs_judgment_count": 1},
                   "findings": [],
                   "needs_judgment": [{"reason": "analyzer_error",
                                       "location": f"{type(exc).__name__}: {exc}"}]}
        rel = os.path.relpath(f, base) if base else os.path.basename(f)
        analyses.append({"file": rel, "result": res})

    meta = {"target": os.path.abspath(args.target),
            "scope": {"requested": sc["requested"],
                      "analyzed_files": [a["file"] for a in analyses],
                      "missing": sc["missing"], "bounded": sc["bounded"],
                      "selector": args.selector},
            "input_mode": args.input_mode}
    doc = emit_docs.build_doc_set(analyses, meta)
    errs = emit_docs.validate_doc_set(doc)
    if errs:
        print("internal error: doc set failed validation: " + "; ".join(errs), file=sys.stderr)
        return 4

    target_root = args.target if os.path.isdir(args.target) \
        else os.path.dirname(os.path.abspath(args.target))
    out_dir = args.out or os.path.join(target_root, ".lv-audit")
    # OUTPUT_ONLY: refuse if the out dir contains any analyzed source file — that
    # would risk clobbering the source. The default <target>/.lv-audit and any --out
    # that doesn't sit on top of the sources are fine.
    real_out = os.path.realpath(out_dir)
    if any(os.path.realpath(f) == real_out or os.path.realpath(f).startswith(real_out + os.sep)
           for f in sc["files"]):
        print(f"error: OUTPUT_ONLY — refuse to write the doc set on top of the audited "
              f"source files: {out_dir}", file=sys.stderr)
        print("       use the default <target>/.lv-audit, or an --out dir that does not "
              "contain the sources.", file=sys.stderr)
        return 5
    paths = emit_docs.write_doc_set(doc, out_dir)

    if args.json:
        print(json.dumps(doc, ensure_ascii=False, indent=2))
    else:
        s = doc["summary"]
        print(f"audited {len(analyses)} file(s) — status={s['status']} "
              f"worst_score={s['worst_score']} "
              f"(C{s['by_severity']['critical']}/M{s['by_severity']['major']}/"
              f"m{s['by_severity']['minor']}, needs_judgment={s['needs_judgment_count']})")
        for p in paths:
            print(f"  wrote {os.path.relpath(p, os.getcwd()) if p.startswith(os.getcwd()) else p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
