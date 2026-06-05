"""Structured handoff document-set builder + OUTPUT_ONLY writer.

The doc set is the skill's stable deliverable: a machine sidecar (`audit.json`,
validated against schemas/handoff-doc.schema.json) plus a human report
(`report.md`). It is emitted on EVERY run, including the zero-findings "clean"
case. This module NEVER edits the target — `write_doc_set` only writes inside the
designated out dir (`ensure_output_path` refuses any path that escapes it).
"""
import json
import os

SCHEMA_VERSION = "1.0.0"
GENERATED_BY = "low-visibility-fix/audit.py"

REQUIRED_SECTIONS = ["schema_version", "generated_by", "target", "scope",
                     "summary", "findings", "recommendations", "needs_judgment",
                     "next_round_scope"]

# vague -> precise fix recipe, expressed as a RECOMMENDATION (never auto-applied).
_RECIPES = {
    "contrast": "Raise foreground/background contrast to >= the field ratio "
                "(text 7:1, large 4.5:1): shift the text colour toward the nearest "
                "extreme keeping hue; adjust the background only if needed.",
    "target_size": "Enlarge the hit target to >= 64px (min-width/min-height + "
                   "padding; 80px ideal). Do not shrink siblings — reflow or stack.",
    "icon_only": "Add a VISIBLE text label beside the icon (text survives glare "
                 "better than a glyph); an aria-label alone is a weak fallback.",
    "color_only": "Encode state with colour PLUS text/icon/shape, not colour alone.",
    "spacing": "Increase the gap between adjacent targets to >= 12px (gloves).",
    "font_size": "Raise body text to >= 16px (18px for critical labels); prefer rem.",
}
_NJ_GUIDANCE = {
    "css_var_unresolved": "Runtime/locally-scoped CSS var — assess each theme or the "
                          "worst case in the visual pass; do not fabricate a ratio.",
    "bg_image": "Text over an image — estimate contrast visually (recommend a scrim/"
                "overlay or a solid text background); not a single computable number.",
    "external_stylesheet": "Re-run with --css <sheet> (or inline it) for an exact "
                           "audit; otherwise this is an inline-only audit.",
    "js_state": "State styles applied at runtime — inspect the JS/class logic or ask "
                "which states exist; verify in the visual pass.",
    "image_only": "Screenshot input — give a labelled visual estimate, not a measurement.",
    "target_size_unresolved": "Size is layout-dependent (or only one axis is known) — "
                              "check the rendered/computed box in the visual pass before judging.",
    "unresolved_color": "A declared colour could not be parsed (e.g. color-mix/currentColor) — "
                        "assess it in the visual pass; not a computable ratio.",
    "selector_no_match": "The targeted selector matched no element — re-check the selector; "
                         "nothing in this scope was actually inspected.",
    "analyzer_error": "The analyzer could not process this file — inspect it manually / via the "
                      "visual pass; the rest of the scope was still audited.",
}


class OutputBoundaryError(Exception):
    pass


def build_doc_set(analyses, meta=None):
    """Assemble the doc set. Every REQUIRED_SECTIONS key is always present.

    analyses: [{"file": str, "result": <analyzer result dict>}]
    meta:     {"target": str, "scope": {...}, "input_mode": "static"|"visual_estimate"}
    """
    meta = meta or {}
    mode = meta.get("input_mode", "static")
    estimate = mode == "visual_estimate"

    scope = dict(meta.get("scope", {}))
    scope.setdefault("requested", [])
    scope.setdefault("analyzed_files", [a["file"] for a in analyses])
    scope.setdefault("missing", [])
    scope.setdefault("bounded", False)
    scope.setdefault("selector", None)
    scope["input_mode"] = mode

    findings, recs, njs = [], [], []
    by_sev = {"critical": 0, "major": 0, "minor": 0}
    worst = 100
    fid = 0
    for a in analyses:
        f_file = a["file"]
        res = a.get("result", {})
        worst = min(worst, res.get("summary", {}).get("score", 100))
        for f in res.get("findings", []):
            fid += 1
            ident = f"F{fid}"
            ev = f.get("fix_hint", "")
            if estimate:
                ev = ("visual estimate — " + ev) if ev else "visual estimate"
            elif not ev:
                ev = "measured value vs field threshold"
            item = {"id": ident, "file": f_file, "rule": f["rule"],
                    "severity": f["severity"], "location": f["location"]}
            for k in ("measured", "threshold", "axis"):
                if k in f:
                    item[k] = f[k]
            item["evidence"] = ev
            findings.append(item)
            by_sev[f["severity"]] += 1
            recs.append({"finding_id": ident, "rule": f["rule"],
                         "recommendation": _RECIPES.get(f["rule"], "See rules/handoff-docs.md."),
                         "snippet_ref": f"assets/fix-snippets.html#{f['rule']}"})
        for n in res.get("needs_judgment", []):
            njs.append({"file": f_file, "reason": n["reason"], "location": n["location"],
                        "guidance": _NJ_GUIDANCE.get(n["reason"], "Complete via the visual pass.")})

    status = "issues_found" if findings else "clean"
    nxt = ("address these, then re-run on the next file or component via --pages/--selector"
           if findings else "no issues in this scope; widen --pages to the next area")
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_by": GENERATED_BY,
        "target": meta.get("target", ""),
        "scope": scope,
        "summary": {"status": status, "total_findings": len(findings),
                    "by_severity": by_sev, "needs_judgment_count": len(njs),
                    "worst_score": worst},
        "findings": findings,
        "recommendations": recs,
        "needs_judgment": njs,
        "next_round_scope": nxt,
    }


def validate_doc_set(doc_set):
    """Self-contained structural check (the schema file is the external contract)."""
    if not isinstance(doc_set, dict):
        return ["doc_set is not an object"]
    errs = [f"missing section: {k}" for k in REQUIRED_SECTIONS if k not in doc_set]
    scope = doc_set.get("scope", {})
    if isinstance(scope, dict):
        errs += [f"scope missing: {k}" for k in
                 ("requested", "analyzed_files", "missing", "bounded", "selector", "input_mode")
                 if k not in scope]
    summ = doc_set.get("summary", {})
    if isinstance(summ, dict):
        errs += [f"summary missing: {k}" for k in
                 ("status", "total_findings", "by_severity", "needs_judgment_count", "worst_score")
                 if k not in summ]
    for arr in ("findings", "recommendations", "needs_judgment"):
        if not isinstance(doc_set.get(arr), list):
            errs.append(f"{arr} is not a list")
    return errs


def render_markdown(doc_set):
    s = doc_set["summary"]
    sc = doc_set["scope"]
    lines = [f"# 低能见度审计交接文档 — {doc_set['target']}", "",
             f"- 模式: {sc['input_mode']}  |  文件: {', '.join(sc['analyzed_files']) or '—'}"
             + (f"  |  选择器: {sc['selector']}" if sc.get("selector") else ""),
             f"- 结论: **{s['status']}**  |  最低分 {s['worst_score']}/100  |  "
             f"critical {s['by_severity']['critical']} · major {s['by_severity']['major']} · "
             f"minor {s['by_severity']['minor']}  |  待判定 {s['needs_judgment_count']}", ""]
    if sc.get("missing"):
        lines += [f"> 未找到的页面: {', '.join(sc['missing'])}", ""]
    lines.append("## Findings（按严重度）")
    if not doc_set["findings"]:
        lines.append("无 — 该范围内未发现低能见度问题。")
    else:
        for sev in ("critical", "major", "minor"):
            fs = [f for f in doc_set["findings"] if f["severity"] == sev]
            if not fs:
                continue
            lines.append(f"### {sev} ({len(fs)})")
            for f in fs:
                m = (f" — measured {f['measured']} / need {f['threshold']}"
                     if "measured" in f and "threshold" in f else "")
                lines.append(f"- `{f['rule']}` @ {f['file']} {f['location']}{m}")
    lines += ["", "## 修改建议（交给实现 agent，本技能不直接改文件）"]
    if not doc_set["recommendations"]:
        lines.append("无。")
    else:
        rmap = {r["finding_id"]: r for r in doc_set["recommendations"]}
        for f in doc_set["findings"]:
            r = rmap.get(f["id"])
            if r:
                lines.append(f"- [{f['id']}] {r['recommendation']}  ({r.get('snippet_ref', '')})")
    if doc_set["needs_judgment"]:
        lines += ["", "## 待判定（需视觉/浏览器二次确认）"]
        for n in doc_set["needs_judgment"]:
            lines.append(f"- `{n['reason']}` @ {n['file']} {n['location']} — {n['guidance']}")
    lines += ["", "## 下一轮建议范围", doc_set["next_round_scope"], ""]
    return "\n".join(lines)


def doc_set_files(doc_set):
    return {"audit.json": json.dumps(doc_set, ensure_ascii=False, indent=2) + "\n",
            "report.md": render_markdown(doc_set) + "\n"}


def ensure_output_path(out_dir, filename):
    """Confine writes to out_dir; refuse any path that escapes it (OUTPUT_ONLY)."""
    out_real = os.path.realpath(out_dir)
    cand = os.path.realpath(os.path.join(out_dir, filename))
    if cand != out_real and not cand.startswith(out_real + os.sep):
        raise OutputBoundaryError(
            f"OUTPUT_ONLY: refuse to write outside {out_dir!r}: {filename!r}")
    return cand


def write_doc_set(doc_set, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for fname, content in doc_set_files(doc_set).items():
        path = ensure_output_path(out_dir, fname)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
        written.append(path)
    return written
