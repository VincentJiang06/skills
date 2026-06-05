#!/usr/bin/env python3
"""Re-runnable regression + behavioral harness for low-visibility-fix.

Imports the SHIPPED mechanism from scripts/ (analyze, scope, emit_docs, policy)
and drives the user-facing entry point scripts/audit.py. Each adversarial-checklist
edge has one case here. Prints one `PASS/FAIL <case>` line per case and exits
non-zero if any case fails — the conductor re-runs this file as the gate.

Layers:
  L0  schema validation  — design-tokens.json, eval-cases.json, every golden,
                           and one emitted doc-set vs schemas/handoff-doc.schema.json
  L1  golden suite        — analyzer output == fixtures/*.expected.json
  determinism             — analyzer + doc-set reproducible
  C_* behavioral edges    — the targeted-param / doc-set / no-mutation / boundary
                            invariants (the re-scope's core)

Usage:
  python3 evals/run_all.py                 # run all cases, print summary
  python3 evals/run_all.py --write-metrics # also write meta/metrics-record.json
"""
import argparse
import glob
import hashlib
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCRIPTS = os.path.join(ROOT, "scripts")
SCHEMAS = os.path.join(ROOT, "schemas")
FIX = os.path.join(HERE, "fixtures")
PROJECT = os.path.join(FIX, "project")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, HERE)

import analyze  # noqa: E402
from analyze import analyze_html, load_tokens  # noqa: E402
import scope as scope_mod  # noqa: E402
import emit_docs  # noqa: E402
import policy  # noqa: E402
from schema_check import validate, validate_file  # noqa: E402

TOKENS = load_tokens(None)
AUDIT = os.path.join(SCRIPTS, "audit.py")

CASES = []


def case(cid):
    def deco(fn):
        CASES.append((cid, fn))
        return fn
    return deco


def read(p):
    with open(p, encoding="utf-8") as fh:
        return fh.read()


def run_audit(args):
    p = subprocess.run([sys.executable, AUDIT, *args], capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def snapshot(d):
    out = {}
    for root, _dirs, files in os.walk(d):
        if ".lv-audit" in root:
            continue
        for f in files:
            p = os.path.join(root, f)
            out[os.path.relpath(p, d)] = hashlib.sha256(read_bytes(p)).hexdigest()
    return out


def read_bytes(p):
    with open(p, "rb") as fh:
        return fh.read()


def static_meta(target, files, requested, missing=None, bounded=False,
                selector=None, mode="static"):
    return {"target": target,
            "scope": {"requested": requested, "analyzed_files": files,
                      "missing": missing or [], "bounded": bounded,
                      "selector": selector},
            "input_mode": mode}


# --------------------------------------------------------------------------
# L0 / L1 / determinism (carried over, behavior-asserting)
# --------------------------------------------------------------------------

@case("L0_schema")
def _l0():
    errs = []
    for inst, sch in [
        (os.path.join(ROOT, "references", "design-tokens.json"),
         os.path.join(SCHEMAS, "design-tokens.schema.json")),
        (os.path.join(HERE, "eval-cases.json"),
         os.path.join(SCHEMAS, "eval-cases.schema.json")),
    ]:
        errs += [f"{os.path.basename(inst)}: {e}" for e in validate_file(inst, sch)]
    with open(os.path.join(SCHEMAS, "analyzer-output.schema.json"), encoding="utf-8") as f:
        out_schema = json.load(f)
    for g in sorted(glob.glob(os.path.join(FIX, "*.expected.json"))):
        with open(g, encoding="utf-8") as f:
            errs += [f"{os.path.basename(g)}: {e}" for e in validate(json.load(f), out_schema)]
    # emitted doc-set vs its schema (single clean run)
    a = analyze_html(read(os.path.join(FIX, "clean_field_ui.html")), TOKENS)
    doc = emit_docs.build_doc_set(
        [{"file": "clean_field_ui.html", "result": a}],
        static_meta("clean_field_ui.html", ["clean_field_ui.html"], ["clean_field_ui.html"]))
    with open(os.path.join(SCHEMAS, "handoff-doc.schema.json"), encoding="utf-8") as f:
        doc_schema = json.load(f)
    errs += [f"handoff-doc: {e}" for e in validate(doc, doc_schema)]
    assert not errs, "; ".join(errs)


@case("L1_golden")
def _l1():
    fails = []
    for g in sorted(glob.glob(os.path.join(FIX, "*.expected.json"))):
        html = g[: -len(".expected.json")] + ".html"
        p = subprocess.run([sys.executable, os.path.join(SCRIPTS, "analyze.py"), html],
                           capture_output=True, text=True)
        if p.returncode not in (0, 1):
            fails.append(f"{os.path.basename(html)} crashed")
            continue
        with open(g, encoding="utf-8") as f:
            if json.loads(p.stdout) != json.load(f):
                fails.append(os.path.basename(html))
    assert not fails, "golden drift: " + ", ".join(fails)


@case("determinism")
def _determinism():
    bad = read(os.path.join(FIX, "bad_field_ui.html"))
    a1, a2 = analyze_html(bad, TOKENS), analyze_html(bad, TOKENS)
    assert a1 == a2, "analyzer non-deterministic"
    meta = static_meta("bad_field_ui.html", ["bad_field_ui.html"], ["bad_field_ui.html"])
    d1 = emit_docs.build_doc_set([{"file": "bad_field_ui.html", "result": a1}], meta)
    d2 = emit_docs.build_doc_set([{"file": "bad_field_ui.html", "result": a2}], meta)
    assert d1 == d2, "doc-set non-deterministic"


# --------------------------------------------------------------------------
# C_* — one per adversarial-checklist edge (see eval-cases.json edge_map)
# --------------------------------------------------------------------------

@case("C_scope_missing")          # edge: non-existent page -> empty_scope, no fallback
def _scope_missing():
    s = scope_mod.resolve_scope(PROJECT, pages=["pageZ"])
    assert s["status"] == "empty_scope", s
    assert s["files"] == [], s
    assert "pageZ" in s["missing"], s
    with tempfile.TemporaryDirectory() as t:
        rc, _o, _e = run_audit([PROJECT, "--pages", "pageZ", "--out", t])
        assert rc != 0, "empty scope must exit non-zero (no silent full scan)"
        assert not glob.glob(os.path.join(t, "*")), "no docs on empty scope"


@case("C_scope_default")          # edge: omitted -> bounded default, never unbounded
def _scope_default():
    s = scope_mod.resolve_scope(PROJECT, pages=None, max_pages=2)
    assert s["status"] == "ok", s
    assert len(s["files"]) == 2, f"default not capped: {s['files']}"
    assert s["bounded"] is True, "must report it bounded the scan"


@case("C_scope_selector")         # edge: component/selector -> only that component
def _scope_selector():
    html = read(os.path.join(FIX, "two_components.html"))
    one = analyze_html(html, TOKENS, selector=".compA")
    allf = analyze_html(html, TOKENS)
    assert len(allf["findings"]) == 2, allf["findings"]
    assert len(one["findings"]) == 1, one["findings"]
    assert "ta" in one["findings"][0]["location"], one["findings"][0]


@case("C_scope_multi")            # edge: multiple pages -> exactly those
def _scope_multi():
    s = scope_mod.resolve_scope(PROJECT, pages=["pageA", "pageC"])
    got = sorted(os.path.basename(f) for f in s["files"])
    assert got == ["pageA.html", "pageC.html"], got
    assert s["missing"] == [], s


@case("C_no_mutation")            # edge: zero modifications to target source files
def _no_mutation():
    before = snapshot(PROJECT)
    with tempfile.TemporaryDirectory() as t:
        rc, _o, _e = run_audit([PROJECT, "--out", t])
        assert rc == 0, _e
    after = snapshot(PROJECT)
    assert before == after, "target source files were mutated"


@case("C_zero_findings_doc")      # edge: clean UI -> complete doc, never empty/missing
def _zero_doc():
    with tempfile.TemporaryDirectory() as t:
        rc, _o, _e = run_audit([os.path.join(FIX, "clean_field_ui.html"), "--out", t])
        assert rc == 0, _e
        ajson = os.path.join(t, "audit.json")
        assert os.path.isfile(ajson) and os.path.getsize(ajson) > 0, "missing/empty doc"
        doc = json.loads(read(ajson))
    assert emit_docs.validate_doc_set(doc) == [], emit_docs.validate_doc_set(doc)
    assert all(k in doc for k in emit_docs.REQUIRED_SECTIONS), doc.keys()
    assert doc["summary"]["status"] == "clean", doc["summary"]
    assert doc["findings"] == [], doc["findings"]


@case("C_contrast_boundary")      # edge: 7.0 clean / mid major / <baseline critical
def _contrast_boundary():
    def sev(color):
        h = f'<p style="color:{color};background:#ffffff;font-size:16px">x</p>'
        fs = [f for f in analyze_html(h, TOKENS)["findings"] if f["rule"] == "contrast"]
        return fs[0]["severity"] if fs else "clean"
    assert sev("#525252") == "clean", "ratio >= field must not be flagged"
    assert sev("#6f6f6f") == "major", "field>ratio>=baseline must be major"
    assert sev("#aaaaaa") == "critical", "ratio < baseline must be critical"


@case("C_target_boundary")        # edge: 64 clean / 63 major / 47 critical
def _target_boundary():
    def sev(px):
        h = f'<button style="width:{px}px;height:{px}px">A</button>'
        fs = [f for f in analyze_html(h, TOKENS)["findings"] if f["rule"] == "target_size"]
        return fs[0]["severity"] if fs else "clean"
    assert sev(64) == "clean", "64px (field floor) must not be flagged"
    assert sev(63) == "major", "63px must be major"
    assert sev(47) == "critical", "47px must be critical"


@case("C_icon_tiers")             # edge: aria-only minor / none major / visible clean
def _icon_tiers():
    def icon(html):
        fs = [f for f in analyze_html(html, TOKENS)["findings"] if f["rule"] == "icon_only"]
        return fs[0]["severity"] if fs else "clean"
    assert icon('<button aria-label="确认"><svg></svg></button>') == "minor"
    assert icon('<button><svg></svg></button>') == "major"
    assert icon('<button>确认</button>') == "clean"


@case("C_color_only")             # edge: color alone flagged / color+text clean
def _color_only():
    def has(html):
        return any(f["rule"] == "color_only" for f in analyze_html(html, TOKENS)["findings"])
    assert has('<span class="status" style="background:#ff0000"></span>') is True
    assert has('<span class="status" style="background:#ff0000">正常</span>') is False


@case("C_needs_judgment")         # edge: bg-image/var -> needs_judgment, no fake ratio
def _needs_judgment():
    h = '<div style="background:url(bg.png)"><p style="color:#777777">巡检</p></div>'
    r = analyze_html(h, TOKENS)
    assert any(n["reason"] == "bg_image" for n in r["needs_judgment"]), r["needs_judgment"]
    assert not any(f["rule"] == "contrast" for f in r["findings"]), "must not fabricate a ratio"


@case("C_output_boundary")        # edge: output outside designated dir -> refuse
def _output_boundary():
    with tempfile.TemporaryDirectory() as t:
        ok = emit_docs.ensure_output_path(t, "audit.json")
        assert os.path.dirname(os.path.realpath(ok)) == os.path.realpath(t)
        for bad in ("../../etc/hosts", "/etc/hosts", "../escape.json"):
            try:
                emit_docs.ensure_output_path(t, bad)
                raise AssertionError(f"escape not refused: {bad}")
            except emit_docs.OutputBoundaryError:
                pass


@case("C_refuse_contrast")        # edge: lower contrast below field for critical -> refuse
def _refuse_contrast():
    v = policy.contrast_change_verdict(2.3, "field_critical", TOKENS)
    assert v["verdict"] == "refuse", v
    assert v["min_allowed"] == TOKENS["contrast"]["field"]["text"], v
    assert policy.contrast_change_verdict(8.0, "field_critical", TOKENS)["verdict"] == "allow"


@case("C_degraded_doc")           # edge: screenshot/no-renderer -> estimate doc still emits
def _degraded_doc():
    finding = {"id": "f1", "rule": "contrast", "severity": "major",
               "location": "button.cta (visual)", "axis": "glare"}
    meta = static_meta("shot.png", ["shot.png"], ["shot.png"], mode="visual_estimate")
    doc = emit_docs.build_doc_set([{"file": "shot.png", "result":
                                    {"summary": {"score": 80, "by_severity":
                                                 {"critical": 0, "major": 1, "minor": 0},
                                                 "resolved_count": 1, "needs_judgment_count": 0},
                                     "findings": [finding], "needs_judgment": []}}], meta)
    assert emit_docs.validate_doc_set(doc) == [], emit_docs.validate_doc_set(doc)
    assert doc["scope"]["input_mode"] == "visual_estimate", doc["scope"]
    assert all("estimate" in f.get("evidence", "").lower() for f in doc["findings"]), \
        "visual findings must be labeled estimates"


@case("C_wxml_rpx")               # edge: mini-program WXML/WXSS handled, not mis-measured
def _wxml_rpx():
    wxml = read(os.path.join(FIX, "mp_page.wxml"))
    wxss = read(os.path.join(FIX, "mp_page.wxss"))
    r = analyze_html(wxml, TOKENS, css_extra=wxss, viewport_px=375)
    ts = [f for f in r["findings"] if f["rule"] == "target_size"]
    assert any(".act" in f["location"] for f in ts), f"rpx button not measured: {ts}"
    assert any("tapper" in f["location"] for f in ts), "view[bindtap] not treated interactive"
    assert any(f["rule"] == "font_size" for f in r["findings"]), "rpx font not resolved"
    assert all(isinstance(f.get("measured"), (int, float)) for f in ts), "rpx not -> px"


# --------------------------------------------------------------------------
# R_* — regressions for bugs the independent battery found (loop 1)
# --------------------------------------------------------------------------

@case("R_bg_modern_color")        # P0: modern color syntaxes parsed; no fabricated white bg
def _bg_modern():
    for bg in ("rgb(0 0 0)", "rgba(0 0 0 / 1)", "hsl(0 0% 0%)", "#000000ff"):
        h = f'<p style="color:#ffffff;background-color:{bg};font-size:18px">x</p>'
        fs = [f for f in analyze_html(h, TOKENS)["findings"] if f["rule"] == "contrast"]
        assert not fs, f"white-on-black via {bg!r} must be clean (21:1), got {fs}"


@case("R_bg_dark_false_negative")  # P0: dark-on-dark not silently scored vs white
def _bg_dark_fn():
    h = '<p style="color:#595959;background-color:rgb(20 20 20);font-size:16px">x</p>'
    r = analyze_html(h, TOKENS)
    assert any(f["rule"] == "contrast" for f in r["findings"]), \
        "dark text on a dark bg must be flagged, not scored against white"


@case("R_bg_unparseable_nj")      # P0: truly unparseable bg -> needs_judgment, never a fabricated ratio
def _bg_unparseable():
    h = '<p style="color:#777777;background-color:color-mix(in srgb,#000,#111);font-size:16px">x</p>'
    r = analyze_html(h, TOKENS)
    assert not any(f["rule"] == "contrast" for f in r["findings"]), "must not fabricate a ratio"
    assert any(n["reason"] == "unresolved_color" for n in r["needs_judgment"]), r["needs_judgment"]


@case("R_output_into_source")     # P1: refuse writing the doc set into the target source tree
def _out_into_source():
    with tempfile.TemporaryDirectory() as t:
        src = os.path.join(t, "src")
        os.makedirs(src)
        with open(os.path.join(src, "page.html"), "w") as f:
            f.write('<button style="width:20px;height:20px">x</button>')
        planted = os.path.join(src, "report.md")
        with open(planted, "w") as f:
            f.write("ORIGINAL")
        rc, _o, _e = run_audit([os.path.join(src, "page.html"), "--out", src])
        assert rc != 0, "writing into the target source dir must be refused (OUTPUT_ONLY)"
        assert read(planted) == "ORIGINAL", "must not overwrite an existing source file"


@case("R_dup_pages")              # P1: duplicate --pages deduped
def _dup_pages():
    s = scope_mod.resolve_scope(PROJECT, pages=["pageA", "pageA"])
    assert len(s["files"]) == 1, f"duplicate pages must dedup: {s['files']}"


@case("R_selector_no_match")      # P1: a selector matching nothing is not silently 'clean'
def _sel_no_match():
    r = analyze_html(read(os.path.join(FIX, "two_components.html")), TOKENS, selector=".totally-absent")
    assert any(n["reason"] == "selector_no_match" for n in r["needs_judgment"]), r["needs_judgment"]


@case("R_css_missing")            # P2: missing --css file -> clean error, not a traceback
def _css_missing():
    with tempfile.TemporaryDirectory() as t:
        rc, _o, e = run_audit([os.path.join(FIX, "clean_field_ui.html"), "--css",
                               "/no/such/sheet.wxss", "--out", t])
        assert rc == 2, f"missing --css must exit 2, got {rc}"
        assert "Traceback" not in e, "must not leak a traceback"


@case("R_one_axis_unresolved")    # P2: one-axis interactive -> unknown axis -> needs_judgment
def _one_axis():
    r = analyze_html('<a href="#" style="display:block;width:200px">链接</a>', TOKENS)
    assert any(n["reason"] == "target_size_unresolved" for n in r["needs_judgment"]), \
        "an interactive control with only one known axis must route the unknown axis to needs_judgment"


@case("R_ambiguous_page")         # P2: a page name matching .html AND .wxml -> not silently one
def _ambiguous():
    with tempfile.TemporaryDirectory() as t:
        for ext in (".html", ".wxml"):
            with open(os.path.join(t, "page" + ext), "w") as f:
                f.write("<button>x</button>")
        s = scope_mod.resolve_scope(t, pages=["page"])
        assert len(s["files"]) == 2, f"ambiguous name must include both, not silently one: {s['files']}"


@case("R_deep_nest")              # battery round 2: deep DOM must not crash; doc still emits
def _deep_nest():
    deep = "<div>" * 2000 + '<button style="width:20px;height:20px">x</button>' + "</div>" * 2000
    r = analyze_html(deep, TOKENS)          # importable path must not raise
    assert isinstance(r.get("findings"), list)
    with tempfile.TemporaryDirectory() as t:
        srcdir = os.path.join(t, "src")
        os.makedirs(srcdir)
        src = os.path.join(srcdir, "deep.html")
        with open(src, "w") as f:
            f.write(deep)
        out = os.path.join(t, "out")          # outside the target tree (OUTPUT_ONLY-safe)
        rc, _o, e = run_audit([src, "--out", out])
        assert rc == 0, f"deep DOM crashed audit.py: {e[:160]}"
        assert os.path.isfile(os.path.join(out, "audit.json")), "no doc set emitted on deep DOM"


# --------------------------------------------------------------------------

def entry_tokens():
    txt = read(os.path.join(ROOT, "SKILL.md"))
    return round((len(txt) / 4 + len(txt.split()) * 1.3) / 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write-metrics", action="store_true")
    args = ap.parse_args()
    failed = []
    for cid, fn in CASES:
        try:
            fn()
            print(f"PASS  {cid}")
        except Exception as e:
            failed.append(cid)
            print(f"FAIL  {cid}: {e}")
    passed = len(CASES) - len(failed)
    print(f"\nRESULT: {'GREEN' if not failed else 'RED'}  ({passed}/{len(CASES)})")

    if args.write_metrics and not failed:
        rec = {
            "schema_version": "1.0.0",
            "skill_id": "skill.low-visibility-fix",
            "generated_by": "evals/run_all.py --write-metrics",
            "measured": {
                "harness_pass_rate": round(passed / len(CASES), 3),
                "cases_total": len(CASES),
                "no_target_mutation_rate": 1.0,
                "doc_completeness_rate": 1.0,
                "determinism_rate": 1.0,
                "policy_violation_rate": 0,
                "skill_entry_tokens_estimate": entry_tokens(),
            },
            "notes": "Behavioral harness: every adversarial-checklist edge bound to a case.",
        }
        out = os.path.join(ROOT, "meta", "metrics-record.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"wrote {os.path.relpath(out, ROOT)}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
