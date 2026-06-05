// Eval cases for the mp-groundline deterministic core.
//
// Each case feeds a fixture mini-program to scan(root) (and, for generator
// cases, gen_migration_map.generate(scan)) and asserts on the DOCUMENTED VALUES
// of the output — never on shape alone, never on SKILL.md text. Every case is
// tagged with the verbatim adversarial_checklist edge it covers so the
// build-report can map 16/16 edges → a passing case.
//
// A case is { id, edge, fixture, kind, assert }. `assert(ctx)` throws an Error
// whose message is the failure reason; returning normally = pass.
//   kind "scan"  → ctx = { scan, root }   (root = absolute fixture dir)
//   kind "gen"   → ctx = { scan, generate, root }
//
// The harness (run_all.mjs) imports scan + generate from ../scripts and runs
// each case. cases.mjs deliberately holds NO scanner/generator logic.

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { CATEGORY_ORDER } from "../scripts/gen_migration_map.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.join(HERE, "..", "tests", "fixtures");
const fx = (name) => path.join(FIXTURES, name);
// the two CLI entry points (resolved once; used by the B3 CLI-contract cases)
const SCAN_CLI = path.join(HERE, "..", "scripts", "scan.mjs");
const GEN_CLI = path.join(HERE, "..", "scripts", "gen_migration_map.mjs");

// count Markdown table cell-delimiters = UNESCAPED `|` (a `\|` is a literal pipe,
// not a delimiter). A well-formed row has the same count as the header.
function unescapedPipes(s) {
  return (s.match(/(?<!\\)\|/g) || []).length;
}
// pull the Section-4 "Findings" table out of a generated MIGRATION-MAP: returns
// { header, rows } where rows are the body lines (after the |---| separator).
function findingsTable(md) {
  const lines = md.split("\n");
  const h = lines.findIndex((l) => /\| File:Line \| Category \|/.test(l));
  if (h < 0) return { header: "", rows: [] };
  const rows = [];
  for (let i = h + 2; i < lines.length; i++) {
    if (lines[i].trim() === "") break;
    rows.push(lines[i]);
  }
  return { header: lines[h], rows };
}

// ---- tiny assertion helpers (throw on failure) ----
function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}
function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function findingsOf(result, category) {
  return (result.findings || []).filter((f) => f && f.category === category);
}
function actionsOf(result, category) {
  return findingsOf(result, category).map((f) => f.action);
}

export const cases = [
  // ── 1. app renderer:skyline → exactly one mechanical flip, nothing dropped ──
  {
    id: "scan_renderer_flip_one",
    edge: "app.json with renderer:'skyline' (the fixture) → renderer_config.renderer=='skyline' AND exactly one 'mechanical' finding for the app-level flip; nothing dropped",
    fixture: "clean-workaround",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      eq(r.renderer_config.renderer, "skyline", "renderer_config.renderer");
      const flips = findingsOf(r, "renderer_flip");
      eq(flips.length, 1, "renderer_flip finding count");
      eq(flips[0].action, "mechanical", "renderer_flip action");
      eq(r.summary.mechanical, 1, "summary.mechanical");
      ok(flips[0].file.endsWith("app.json"), `flip file should be app.json, got ${flips[0].file}`);
    }
  },

  // ── 2. already webview → mechanical==0, already_migrated, STOP ──
  {
    id: "scan_already_webview",
    edge: "app.json ALREADY renderer:'webview' → renderer_config.renderer=='webview', summary.mechanical==0, reported as already-migrated and the protocol STOPS before any edit",
    fixture: "already-webview",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      eq(r.renderer_config.renderer, "webview", "renderer_config.renderer");
      eq(r.summary.mechanical, 0, "summary.mechanical");
      eq(r.summary.already_migrated, true, "summary.already_migrated");
      eq(findingsOf(r, "renderer_flip").length, 0, "no renderer_flip when already webview");
    }
  },

  // ── 3. page-level override differing from app-level → distinct per-page mechanical ──
  {
    id: "scan_page_override_distinct",
    edge: "page-level renderer override that DIFFERS from app-level (page json renderer:'skyline' under app renderer:'webview') → a distinct per-page 'mechanical' finding at that page's json, NOT merged into the app-level finding",
    fixture: "page-override",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      // app is skyline; one page (legacy) overrides to webview → that differs.
      const overrides = findingsOf(r, "page_renderer_override");
      eq(overrides.length, 1, "page_renderer_override count");
      eq(overrides[0].action, "mechanical", "override action");
      ok(overrides[0].file.includes("legacy"), `override should point at the legacy page json, got ${overrides[0].file}`);
      // it is DISTINCT from the app-level flip
      const flips = findingsOf(r, "renderer_flip");
      eq(flips.length, 1, "app-level flip still present and singular");
      ok(overrides[0].file !== flips[0].file, "override and app flip must be different files");
      // page_overrides surfaced in renderer_config
      eq(r.renderer_config.page_overrides.length, 1, "renderer_config.page_overrides count");
    }
  },

  // ── 4. worklet → rewrite, high, exact file:line ──
  {
    id: "scan_worklet_rewrite",
    edge: "worklet usage present (wx.worklet / applyAnimatedStyle / runOnUI / createAnimation worklet) → a 'rewrite' finding (high severity) at the exact file:line — MUST NOT be missed or downgraded to keep/verify",
    fixture: "worklet",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const w = findingsOf(r, "worklet");
      ok(w.length >= 1, `expected >=1 worklet finding, got ${w.length}`);
      ok(w.every((f) => f.action === "rewrite"), "every worklet finding must be action=rewrite");
      ok(w.every((f) => f.severity === "high"), "every worklet finding must be severity=high");
      const first = w[0];
      ok(first.file.endsWith("index.js"), `worklet file should be the js, got ${first.file}`);
      ok(first.line > 0, `worklet finding must carry a real line, got ${first.line}`);
      ok(r.summary.rewrite >= 1, "summary.rewrite >= 1");
    }
  },

  // ── 5. custom route → rewrite ──
  {
    id: "scan_custom_route_rewrite",
    edge: "custom route present (routeBuilder / wx.router / wx:// / open-container) → a 'rewrite' finding — MUST NOT be missed",
    fixture: "custom-route",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const cr = findingsOf(r, "custom_route");
      ok(cr.length >= 1, `expected >=1 custom_route finding, got ${cr.length}`);
      ok(cr.every((f) => f.action === "rewrite"), "custom_route must be rewrite");
    }
  },

  // ── 6. each real Skyline-only element → one rewrite per occurrence ──
  {
    id: "scan_skyline_components_each",
    edge: "a real Skyline-only ELEMENT (<span>, <grid-view>, <list-view>, <sticky-header>, <sticky-section>, <nested-scroll-header>, <nested-scroll-body>, <draggable-sheet>, <snapshot>, any *-gesture-handler) → one 'rewrite' finding per occurrence",
    fixture: "skyline-components",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const comp = findingsOf(r, "skyline_component");
      // fixture has: list-view, sticky-header, sticky-section, grid-view,
      // draggable-sheet, snapshot, span, pan-gesture-handler = 8 real tags.
      eq(comp.length, 8, "skyline_component finding count (one per real tag)");
      ok(comp.every((f) => f.action === "rewrite"), "every skyline_component must be rewrite");
      const tags = comp.map((f) => f.snippet);
      for (const expect of ["list-view", "sticky-header", "sticky-section", "grid-view", "draggable-sheet", "snapshot", "span", "pan-gesture-handler"]) {
        ok(tags.some((s) => s.includes(expect)), `missing a finding for <${expect}>; snippets=${JSON.stringify(tags)}`);
      }
    }
  },

  // ── 7. substring false-match → NO finding ──
  {
    id: "scan_false_match_guard",
    edge: "substring false-match: the literal text 'span'/'list-view'/'grid-view' inside an attribute value, a class name, a JS identifier (e.g. spanning, listViewData), or a comment → NO finding (only a real Skyline element tag counts)",
    fixture: "false-match",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      // POSITIVE control so this is not vacuously green against an empty stub:
      // the fixture IS renderer:skyline, so the scanner must have actually run
      // and produced the app-level flip while choosing NOT to flag substrings.
      eq(r.renderer_config.renderer, "skyline", "renderer_config.renderer (scanner must have run)");
      eq(findingsOf(r, "renderer_flip").length, 1, "the scanner must still find the app-level flip");
      // the guard itself: zero false skyline_component / worklet findings.
      const comp = findingsOf(r, "skyline_component");
      eq(comp.length, 0, `false-match fixture must yield ZERO skyline_component findings, got ${comp.length}: ${JSON.stringify(comp.map((f) => f.snippet))}`);
      eq(findingsOf(r, "worklet").length, 0, "no worklet false-positive");
    }
  },

  // ── 8. clean-workaround program → every workaround KEEP, zero rewrite ──
  {
    id: "scan_clean_workarounds_keep",
    edge: "a clean-workaround program (box-shadow-as-border + flex-instead-of-grid + word-break:break-all + scroll-view type=list/custom + precomputed template flags + camera tap-mask, the fixture's profile) → EVERY such finding action=='keep' and summary.rewrite==0 (no false rewrite)",
    fixture: "clean-workaround",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      eq(r.summary.rewrite, 0, "summary.rewrite must be 0 for a clean-workaround program");
      // every workaround category present is 'keep'
      const workaroundCats = ["box_shadow_border", "word_break", "backdrop_filter", "flex_grid_workaround", "scroll_view_type"];
      let seen = 0;
      for (const cat of workaroundCats) {
        const fs = findingsOf(r, cat);
        for (const f of fs) {
          eq(f.action, "keep", `${cat} action`);
          seen++;
        }
      }
      ok(seen >= 3, `expected several workaround findings, saw ${seen}`);
      // box-shadow border + word-break + scroll-view type must each be detected
      ok(findingsOf(r, "box_shadow_border").length >= 1, "box_shadow_border detected");
      ok(findingsOf(r, "word_break").length >= 1, "word_break detected");
      ok(findingsOf(r, "scroll_view_type").length >= 1, "scroll_view_type detected");
    }
  },

  // ── 9. scroll-view already enhanced → keep + generator emits no "add enhanced" ──
  {
    id: "gen_scroll_enhanced_no_redundant",
    edge: "scroll-view that ALREADY has enhanced → action=='keep', and the generator does NOT emit a redundant 'add enhanced' suggestion",
    fixture: "scroll-enhanced",
    kind: "gen",
    assert({ scan, generate, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const sv = findingsOf(r, "scroll_view_type");
      ok(sv.length >= 1, "scroll_view_type detected");
      ok(sv.every((f) => f.action === "keep"), "scroll_view_type must be keep");
      // the finding must record that enhanced is already present
      ok(sv.some((f) => /enhanced/i.test(f.snippet) || /enhanced/i.test(f.note || "")), "finding should note enhanced is already present");
      const md = generate(r);
      ok(!/add\s+enhanced/i.test(md), "MIGRATION-MAP must NOT suggest 'add enhanced' when enhanced is already present");
    }
  },

  // ── 10. componentFramework glass-easel → config note, keep ──
  {
    id: "scan_component_framework_keep",
    edge: "componentFramework present (glass-easel) → surfaced as a config note with decision 'keep glass-easel (supported on WebView, maximizes consistency)', not silently changed",
    fixture: "clean-workaround",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.renderer_config.componentFramework, "glass-easel", "renderer_config.componentFramework");
      const cf = findingsOf(r, "component_framework");
      eq(cf.length, 1, "component_framework finding count");
      eq(cf[0].action, "keep", "component_framework action");
      ok(/glass-easel/.test(cf[0].note), "note should mention glass-easel");
    }
  },

  // ── 11. non-default miniprogramRoot → resolve app.json via project.config.json ──
  {
    id: "scan_non_default_root",
    edge: "app.json at a NON-default miniprogramRoot (project.config.json miniprogramRoot != repo root, e.g. 'miniprogram/') → scanner resolves and finds app.json via project.config.json, not by assuming repo root",
    fixture: "non-default-root",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, `scanner must resolve app.json under app/, got ok=${r.ok} error=${r.error}`);
      eq(r.miniprogramRoot, "app/", "resolved miniprogramRoot");
      eq(r.renderer_config.renderer, "skyline", "renderer found via resolved root");
      ok(findingsOf(r, "renderer_flip")[0].file.includes("app/"), "flip file path under app/");
    }
  },

  // ── 12. malformed / missing app.json → structured error, not a crash ──
  {
    id: "scan_malformed_structured_error",
    edge: "malformed or missing app.json (invalid JSON / file absent) → a structured error object reported as a blocker, NOT an uncaught crash and NOT a silent empty scan",
    fixture: "malformed",
    kind: "scan",
    assert({ scan, root }) {
      let r;
      try {
        r = scan(root); // must NOT throw
      } catch (e) {
        throw new Error(`scan threw instead of returning a structured error: ${e.message}`);
      }
      eq(r.ok, false, "ok must be false on malformed app.json");
      ok(typeof r.error === "string" && r.error.length > 0, "error must be a non-empty string");
      ok(/app\.json/i.test(r.error), `error should mention app.json, got: ${r.error}`);
      // structured, not a silent empty success
      eq(r.summary.total, 0, "no findings on a blocker");
    }
  },

  // ── 12b. missing app.json (separate fixture, same contract) ──
  {
    id: "scan_missing_appjson_error",
    edge: "malformed or missing app.json (invalid JSON / file absent) → a structured error object reported as a blocker, NOT an uncaught crash and NOT a silent empty scan",
    fixture: "missing-appjson",
    kind: "scan",
    assert({ scan, root }) {
      let r;
      try {
        r = scan(root);
      } catch (e) {
        throw new Error(`scan threw on missing app.json: ${e.message}`);
      }
      eq(r.ok, false, "ok must be false when app.json is absent");
      ok(/not found|absent|missing/i.test(r.error), `error should say not found, got: ${r.error}`);
    }
  },

  // ── 12c. app.json that is a JSON ARRAY → malformed blocker, not a silent empty scan ──
  {
    id: "scan_array_appjson_is_blocker",
    edge: "app.json that parses to a JSON ARRAY ([1,2,3]) → the SAME structured malformed blocker as invalid JSON (ok:false + an error mentioning app.json, summary.total==0, non-zero CLI exit), NOT a degraded ok:true/already_migrated:true empty scan (a JSON array passes `typeof === 'object'` so the bare object-guard wrongly let it through)",
    fixture: "array-appjson",
    kind: "scan",
    assert({ scan, root }) {
      let r;
      try {
        r = scan(root); // must NOT throw
      } catch (e) {
        throw new Error(`scan threw on an array app.json instead of returning a structured error: ${e.message}`);
      }
      // the headline contract: an array app.json is a BLOCKER, not a silent success.
      eq(r.ok, false, "ok must be false on an array app.json (NOT a degraded ok:true)");
      ok(typeof r.error === "string" && r.error.length > 0, "error must be a non-empty string");
      ok(/app\.json/i.test(r.error), `error should mention app.json, got: ${r.error}`);
      eq(r.summary.total, 0, "no findings on a blocker");
      // the specific regression: it must NOT have degraded to already_migrated.
      eq(r.summary.already_migrated, false, "an array app.json must NOT be reported as already_migrated (the pre-fix degradation)");
      // and the CLI must surface a non-zero exit for the blocker (not exit 0).
      const p = spawnSync(process.execPath, [SCAN_CLI, root], { encoding: "utf8" });
      ok(p.status !== 0, `array-appjson scan via CLI must exit non-zero, got ${p.status}`);
      let parsed;
      try { parsed = JSON.parse(p.stdout); } catch (e) {
        throw new Error(`CLI stdout must be parseable JSON, got: ${JSON.stringify(p.stdout.slice(0, 120))}`);
      }
      eq(parsed.ok, false, "CLI JSON ok must be false for an array app.json");
    }
  },

  // ── 13. rendererOptions.skyline → config note, keep, never rewrite ──
  {
    id: "scan_renderer_options_keep",
    edge: "rendererOptions.skyline present (defaultDisplayBlock/defaultContentBox/disableABTest, the fixture's config) → reported as a config note 'ignored by WebView; safe to keep or strip', decision is mechanical/keep, never a rewrite",
    fixture: "clean-workaround",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      ok(r.renderer_config.rendererOptions && r.renderer_config.rendererOptions.skyline, "rendererOptions.skyline captured");
      const ro = findingsOf(r, "renderer_options");
      eq(ro.length, 1, "renderer_options finding count");
      ok(ro[0].action === "keep" || ro[0].action === "mechanical", `renderer_options action must be keep/mechanical, got ${ro[0].action}`);
      ok(ro[0].action !== "rewrite", "renderer_options must NEVER be rewrite");
      ok(/keep|strip|ignored/i.test(ro[0].note), "note should explain keep/strip/ignored");
    }
  },

  // ── 14. idempotency: re-scan webview tree → mechanical==0, no new findings ──
  {
    id: "scan_idempotency_roundtrip",
    edge: "idempotency / round-trip: re-running the scan on an already-migrated (webview) tree → summary.mechanical==0 and no new findings (the migration is not re-applied)",
    fixture: "already-webview",
    kind: "scan",
    assert({ scan, root }) {
      const a = scan(root);
      const b = scan(root);
      eq(a.summary.mechanical, 0, "first scan mechanical==0");
      eq(b.summary.mechanical, 0, "second scan mechanical==0");
      // metamorphic: same input → identical finding set across runs
      eq(JSON.stringify(b.findings), JSON.stringify(a.findings), "re-scan must yield an identical finding set (no new findings)");
      eq(b.summary.total, a.summary.total, "re-scan total unchanged");
    }
  },

  // ── 15. camera tap-mask → verify ──
  {
    id: "scan_camera_mask_verify",
    edge: "camera tap-mask wrapper → action=='verify' (taps may bubble under WebView), surfaced as a per-page verify row, not keep and not rewrite",
    fixture: "mixed",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      const cm = findingsOf(r, "camera_mask");
      ok(cm.length >= 1, `expected a camera_mask finding, got ${cm.length}`);
      eq(cm[0].action, "verify", "camera_mask action must be verify");
      ok(cm[0].action !== "keep" && cm[0].action !== "rewrite", "camera_mask is neither keep nor rewrite");
    }
  },

  // ── 16. mixed program → hard feature rewrite AND workarounds keep, both correct ──
  {
    id: "scan_mixed_both_correct",
    edge: "a program that mixes a hard rewrite feature AND clean workarounds → BOTH classified correctly in the same scan (rewrite for the hard feature, keep for the workarounds); the rewrite row is surfaced up front as a manual-review gate",
    fixture: "mixed",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      // hard feature: grid-view → rewrite
      const comp = findingsOf(r, "skyline_component");
      ok(comp.length >= 1, "skyline_component (grid-view) detected");
      ok(comp.every((f) => f.action === "rewrite"), "grid-view must be rewrite");
      // workaround: box-shadow border → keep, in the SAME scan
      const bs = findingsOf(r, "box_shadow_border");
      ok(bs.length >= 1, "box_shadow_border detected in the same scan");
      ok(bs.every((f) => f.action === "keep"), "box-shadow border must be keep");
      ok(r.summary.rewrite >= 1 && r.summary.keep >= 1, "both rewrite and keep present in the summary");
    }
  },

  // ── BUG-1 regression: ≥2 <open-container> in one file → one finding EACH ──
  {
    id: "scan_open_container_per_occurrence",
    edge: "multiple <open-container> in a single .wxml → one custom_route 'rewrite' finding PER occurrence (skyline-to-webview.md: flags every occurrence, must not silently drop one)",
    fixture: "open-container-multi",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const cr = findingsOf(r, "custom_route");
      // the fixture's index.wxml has exactly three <open-container> tags.
      eq(cr.length, 3, "one custom_route finding per <open-container> occurrence");
      ok(cr.every((f) => f.action === "rewrite"), "each open-container must be rewrite");
      ok(cr.every((f) => /open-container/.test(f.snippet)), "each finding snippet is the open-container tag");
      // distinct lines (not the same tag counted thrice)
      const lines = new Set(cr.map((f) => f.line));
      eq(lines.size, 3, `the three findings must be at distinct lines, got ${JSON.stringify([...lines])}`);
      ok(r.summary.rewrite >= 3, "summary.rewrite reflects all three occurrences");
    }
  },

  // ── BUG (per-line undercount) regression: ≥2 DISTINCT worklet / custom_route
  //    occurrences in ONE .js → one finding PER matching line (not one per file) ──
  {
    id: "scan_js_rewrite_per_occurrence",
    edge: "a single .js/.ts with multiple DISTINCT worklet occurrences and multiple DISTINCT custom_route occurrences on separate lines → one 'rewrite' finding PER matching line for each category (NOT one-per-file); within-line dedupe (a line matching both patterns → one worklet + one custom_route for that line); a token only inside a // or /* */ comment → NO finding (skyline-to-webview.md: flags every occurrence, must not silently drop one)",
    fixture: "js-rewrite-per-occurrence",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const w = findingsOf(r, "worklet");
      const cr = findingsOf(r, "custom_route");
      // 3 dedicated worklet lines (8,9,10) + the both-line (19) = 4 distinct.
      // 3 dedicated route lines (13,14,15) + the both-line (19) = 4 distinct.
      // The pre-fix per-file latch reported exactly 1 worklet + 1 custom_route.
      eq(w.length, 4, "worklet finding count (one per matching line, not one per file)");
      eq(cr.length, 4, "custom_route finding count (one per matching line, not one per file)");
      ok(w.every((f) => f.action === "rewrite" && f.severity === "high"), "every worklet finding is rewrite/high");
      ok(cr.every((f) => f.action === "rewrite"), "every custom_route finding is rewrite");
      // each category's findings sit on DISTINCT lines (not the same line counted N times)
      const wLines = new Set(w.map((f) => f.line));
      const crLines = new Set(cr.map((f) => f.line));
      eq(wLines.size, 4, `worklet findings must be at 4 distinct lines, got ${JSON.stringify([...wLines])}`);
      eq(crLines.size, 4, `custom_route findings must be at 4 distinct lines, got ${JSON.stringify([...crLines])}`);
      // the 3 dedicated worklet lines and 3 dedicated route lines are all present
      for (const ln of [8, 9, 10]) ok(wLines.has(ln), `expected a worklet finding at line ${ln}, got ${JSON.stringify([...wLines])}`);
      for (const ln of [13, 14, 15]) ok(crLines.has(ln), `expected a custom_route finding at line ${ln}, got ${JSON.stringify([...crLines])}`);
      // within-line dedupe: line 19 matches BOTH → exactly one of each (not two)
      ok(wLines.has(19), "the both-patterns line (19) yields a worklet finding");
      ok(crLines.has(19), "the both-patterns line (19) yields a custom_route finding");
      eq(w.filter((f) => f.line === 19).length, 1, "line 19 yields exactly ONE worklet finding (within-line dedupe)");
      eq(cr.filter((f) => f.line === 19).length, 1, "line 19 yields exactly ONE custom_route finding (within-line dedupe)");
      // comment-only tokens (lines 1–4) must NOT appear as findings
      ok(![...wLines, ...crLines].some((ln) => ln <= 4), `no finding may come from the comment header (lines 1–4), got worklet=${JSON.stringify([...wLines])} route=${JSON.stringify([...crLines])}`);
      ok(r.summary.rewrite >= 8, `summary.rewrite reflects all 4+4 occurrences, got ${r.summary.rewrite}`);
    }
  },

  // ── PRECISION (rewrite-class false positive): WEAK worklet tokens require a
  //    co-present STRONG signal — a generic charting/animation lib yields 0 ──
  {
    id: "scan_worklet_weak_tokens_need_strong_signal",
    edge: "weak worklet tokens (Easing / bare timing( / spring( / decay() in a .js with NO strong Skyline-worklet signal (no wx.worklet / 'worklet' directive / applyAnimatedStyle / runOnUI / runOnJS / useSharedValue) → ZERO worklet findings: a generic charting/animation lib that merely reuses those bare names is NOT a Skyline worklet and must NOT produce a phantom rewrite",
    fixture: "worklet-weak-no-strong",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      // POSITIVE control so this is not vacuously green: the fixture IS
      // renderer:skyline, so the scanner ran and produced the app-level flip
      // while choosing NOT to flag the weak tokens.
      eq(r.renderer_config.renderer, "skyline", "renderer (scanner must have run)");
      eq(findingsOf(r, "renderer_flip").length, 1, "the scanner must still find the app-level flip");
      // the gate itself: a file with ONLY Easing + spring() + timing() + decay()
      // and NO strong signal → zero worklet findings (pre-fix: ~4 false rewrites).
      const w = findingsOf(r, "worklet");
      eq(w.length, 0, `weak-only file must yield ZERO worklet findings, got ${w.length}: ${JSON.stringify(w.map((f) => f.line + ":" + f.snippet))}`);
      // and no false rewrite leaks into the summary from this file
      eq(r.summary.rewrite, 0, `no rewrite from a weak-token-only generic lib, got ${r.summary.rewrite}`);
    }
  },

  // ── PRECISION counterpart: with a STRONG signal present, the weak-token lines
  //    DO count (per-occurrence preserved — the gate is file-level, not a prefix) ──
  {
    id: "scan_worklet_weak_tokens_count_with_strong_signal",
    edge: "weak worklet tokens (Easing / spring() / timing() / decay() in a .js that ALSO carries a strong Skyline-worklet signal (applyAnimatedStyle) → the weak-token lines DO count, one rewrite finding PER matching line (per-occurrence preserved); file-level strong-signal gating, NOT a wx.worklet. prefix requirement",
    fixture: "worklet-weak-with-strong",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const w = findingsOf(r, "worklet");
      // strong line (7, applyAnimatedStyle) + 4 weak lines (8 Easing, 9 spring(),
      // 10 timing(, 11 decay() = 5 worklet findings, each its own line.
      eq(w.length, 5, `expected 5 worklet findings (1 strong + 4 weak lines), got ${w.length}: ${JSON.stringify(w.map((f) => f.line + ":" + f.snippet))}`);
      ok(w.every((f) => f.action === "rewrite" && f.severity === "high"), "every worklet finding is rewrite/high");
      const wLines = new Set(w.map((f) => f.line));
      eq(wLines.size, 5, `worklet findings must be at 5 distinct lines, got ${JSON.stringify([...wLines])}`);
      // the strong line AND each weak line are all present (the weak lines are
      // NOT dropped — file-level gating, not a per-line prefix requirement)
      for (const ln of [7, 8, 9, 10, 11]) ok(wLines.has(ln), `expected a worklet finding at line ${ln}, got ${JSON.stringify([...wLines])}`);
      ok(r.summary.rewrite >= 5, `summary.rewrite reflects all 5 occurrences, got ${r.summary.rewrite}`);
    }
  },

  // ── BUG-2 regression: custom *-gesture-handler NOT flagged; real one IS ──
  {
    id: "scan_custom_gesture_handler_no_false_match",
    edge: "a project's OWN custom component ending in -gesture-handler (<app-swipe-gesture-handler>, <my-custom-gesture-handler>) → NO skyline finding; a real closed-set <pan-gesture-handler> → exactly one rewrite (tighten must not break true positives)",
    fixture: "custom-gesture-handler",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const comp = findingsOf(r, "skyline_component");
      // ONLY the real pan-gesture-handler counts → exactly one finding.
      eq(comp.length, 1, `expected exactly one skyline_component (the real pan-gesture-handler), got ${comp.length}: ${JSON.stringify(comp.map((f) => f.snippet))}`);
      ok(/pan-gesture-handler/.test(comp[0].snippet), `the one finding must be the pan-gesture-handler, got ${comp[0].snippet}`);
      ok(comp[0].action === "rewrite", "the real gesture handler is a rewrite");
      // the two custom components must NOT appear in any finding snippet.
      const snippets = comp.map((f) => f.snippet).join(" ");
      ok(!/app-swipe-gesture-handler/.test(snippets), "custom <app-swipe-gesture-handler> must NOT be flagged");
      ok(!/my-custom-gesture-handler/.test(snippets), "custom <my-custom-gesture-handler> must NOT be flagged");
    }
  },

  // ── BUG-4 regression: UTF-8 BOM in app.json tolerated, not a blocker ──
  {
    id: "scan_appjson_bom_tolerated",
    edge: "app.json saved with a leading UTF-8 BOM (WeChat-DevTools / Windows) → scan succeeds (ok:true) with the renderer read correctly, NOT a 'malformed' blocker",
    fixture: "appjson-bom",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, `BOM-prefixed app.json must scan ok, got ok=${r.ok} error=${r.error}`);
      eq(r.renderer_config.renderer, "skyline", "renderer must be read through the BOM");
      eq(r.renderer_config.componentFramework, "glass-easel", "componentFramework read through the BOM");
      eq(findingsOf(r, "renderer_flip").length, 1, "the app-level flip is produced (scanner actually ran)");
    }
  },

  // ── GAP-3 guard: every advertised CATEGORY_ORDER category is emittable ──
  {
    id: "gen_category_order_all_emittable",
    edge: "doc-claim coverage: every category in gen_migration_map CATEGORY_ORDER / the scanner contract is actually emitted by scan() on at least one fixture (no advertised-but-unreachable category)",
    fixture: "mixed", // unused; this case scans the whole fixture corpus below
    kind: "scan",
    assert({ scan }) {
      // Categories the contract intentionally documents but the scanner does NOT
      // emit (not reliably detectable statically). MUST also be absent from
      // CATEGORY_ORDER — if one creeps back in, this set is how we'd whitelist it.
      const INTENTIONALLY_DOC_ONLY = new Set([]);

      // Scan every fixture dir and union the categories actually emitted.
      const fixtureDirs = [
        "clean-workaround", "worklet", "custom-route", "skyline-components",
        "false-match", "already-webview", "non-default-root", "page-override",
        "malformed", "mixed", "scroll-enhanced", "missing-appjson",
        "open-container-multi", "custom-gesture-handler", "appjson-bom",
        "js-rewrite-per-occurrence", "css-url-line", "box-shadow-inset-multi",
        "flex-grid-fullwidth"
      ];
      const emitted = new Set();
      for (const d of fixtureDirs) {
        const r = scan(fx(d));
        for (const f of r.findings || []) emitted.add(f.category);
      }

      // 1. Every advertised category must be reachable (or explicitly doc-only).
      const unreachable = CATEGORY_ORDER.filter(
        (c) => !emitted.has(c) && !INTENTIONALLY_DOC_ONLY.has(c)
      );
      ok(
        unreachable.length === 0,
        `CATEGORY_ORDER advertises categories the scanner never emits: ${JSON.stringify(unreachable)} (over-claim — implement or remove)`
      );

      // 2. Any whitelisted doc-only category must NOT be in CATEGORY_ORDER (it is
      //    documented prose, not an emitted/sortable category).
      const leaked = [...INTENTIONALLY_DOC_ONLY].filter((c) => CATEGORY_ORDER.includes(c));
      ok(
        leaked.length === 0,
        `doc-only categories must not appear in CATEGORY_ORDER: ${JSON.stringify(leaked)}`
      );

      // 3. Conversely, the scanner must not emit a category absent from
      //    CATEGORY_ORDER (the generator would drop it to the end / lose ordering).
      const unordered = [...emitted].filter((c) => !CATEGORY_ORDER.includes(c));
      ok(
        unordered.length === 0,
        `scanner emits categories missing from CATEGORY_ORDER: ${JSON.stringify(unordered)}`
      );
    }
  },

  // ── generator golden-snapshot: structure + per-finding rows ──
  {
    id: "gen_migration_map_structure",
    edge: "(generator) golden-snapshot — gen_migration_map over a fixed scan JSON produces a stable MIGRATION-MAP.md with config diff + mapping table + one row per finding (file:line + action + debug note)",
    fixture: "mixed",
    kind: "gen",
    assert({ scan, generate, root }) {
      const r = scan(root);
      const md = generate(r);
      ok(typeof md === "string" && md.length > 0, "generate must return a non-empty string");
      ok(/^#\s*MIGRATION-MAP/m.test(md), "must have a MIGRATION-MAP title");
      ok(/renderer/i.test(md) && /skyline/.test(md) && /webview/.test(md), "must contain the renderer config diff (skyline→webview)");
      ok(/Skyline.*WebView|WebView.*Skyline/.test(md), "must contain the Skyline↔WebView mapping table");
      // one row per finding: every finding's file should appear in the doc
      for (const f of r.findings) {
        ok(md.includes(f.file), `MIGRATION-MAP must include a row referencing ${f.file}`);
      }
      // rewrite items surfaced as a manual-review gate
      ok(/rewrite/i.test(md), "must surface rewrite items");
      // deterministic: generating twice yields identical output
      eq(generate(scan(root)), md, "generator must be deterministic (same scan → same doc)");
    }
  },

  // ════════════════ Stage-E hardening cases (A1/A2/B1–B4) ════════════════

  // ── A1: box-shadow border-hack precision — unit required, no-op NOT flagged ──
  {
    id: "scan_box_shadow_border_precision",
    edge: "box-shadow border-hack precision: a no-op `box-shadow: 0 0 0 0` / `none` / `0 0 0 transparent` must NOT be flagged (over-fire into keep), while a REAL 1-side hairline border `box-shadow: 0 0 0 1px #ccc` (and `.5px`) IS still flagged keep — the spread must carry a length unit (px/rpx/em/rem/%)",
    fixture: "box-shadow-precision",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const bs = findingsOf(r, "box_shadow_border");
      // fixture: 4 no-op resets (0 0 0 0 ×2, none, 0 0 0 transparent) + 2 real
      // (1px, .5px). ONLY the 2 real border-hacks may fire.
      eq(bs.length, 2, `expected exactly 2 box_shadow_border findings (the real 1px + .5px), got ${bs.length}: ${JSON.stringify(bs.map((f) => f.snippet))}`);
      ok(bs.every((f) => f.action === "keep"), "box_shadow_border must be keep");
      const snips = bs.map((f) => f.snippet).join(" ");
      ok(/1px/.test(snips), "the real 1px border must be flagged");
      ok(/\.5px/.test(snips), "the .5px hairline must be flagged (\\d*\\.?\\d+ catches a leading dot)");
      ok(!/0 0 0 0/.test(snips), "the no-op `0 0 0 0` reset must NOT be flagged");
      ok(!/transparent/.test(snips) && !/none/.test(snips), "`none` / `0 0 0 transparent` must NOT be flagged");
    }
  },

  // ── A2: flex_grid_workaround precision — display:flex alone never fires ──
  {
    id: "scan_flex_grid_precision",
    edge: "flex_grid_workaround precision: a normal `.navbar{display:flex}` + an UNRELATED `.tags{flex-wrap:wrap}` (no calc width) in one file must NOT fire (the old display:flex-OR-flex-wrap heuristic falsely triggered), while the real flex-instead-of-grid signature `flex-wrap:wrap` + a `width: calc(...)` child DOES fire once (keep)",
    fixture: "flex-grid-precision",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const fg = findingsOf(r, "flex_grid_workaround");
      // home/index.less has display:flex AND flex-wrap:wrap but NO width:calc →
      // must NOT fire; grid/index.less has flex-wrap:wrap + width:calc → fires.
      eq(fg.length, 1, `expected exactly 1 flex_grid_workaround (the real grid substitute only), got ${fg.length}: ${JSON.stringify(fg.map((f) => f.file))}`);
      ok(fg[0].file.includes("grid/index.less"), `the one finding must be the real grid-substitute file, got ${fg[0].file}`);
      ok(fg[0].action === "keep", "flex_grid_workaround must be keep");
      // explicit negative: the navbar/tags file produced no flex_grid finding
      ok(!fg.some((f) => f.file.includes("home/index.less")), "display:flex + unrelated flex-wrap:wrap (no calc width) must NOT fire");
    }
  },

  // ── B1: markdown-injection safety — a pipe/backtick in a snippet stays ONE row ──
  {
    id: "gen_markdown_injection_safe",
    edge: "markdown-injection safety: a finding whose matched snippet contains a pipe `|` and backticks (a real wxml attr `class=\"grid|cols\"` data-tpl=\"row-`tmpl`\") renders as exactly ONE well-formed MIGRATION-MAP table row with the same cell count as the header (no row-count inflation, no merged/empty cells, no stray backtick that closes the code span)",
    fixture: "md-injection",
    kind: "gen",
    assert({ scan, generate, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      // the matched scroll-view snippet must really carry the injection chars,
      // else the test is vacuous.
      const sv = findingsOf(r, "scroll_view_type");
      ok(sv.length >= 1, "scroll_view_type detected (the injection carrier)");
      ok(/\|/.test(sv[0].snippet), `snippet must contain a literal pipe, got ${JSON.stringify(sv[0].snippet)}`);
      ok(/`/.test(sv[0].snippet), `snippet must contain a backtick, got ${JSON.stringify(sv[0].snippet)}`);

      const md = generate(r);
      const { header, rows } = findingsTable(md);
      const want = unescapedPipes(header); // header delimiter count = cells+1
      ok(want >= 6, `findings table header should have >=6 delimiters, got ${want}`);
      // exactly ONE row references the injected finding (no inflation/split)
      const svRows = rows.filter((x) => /scroll_view_type/.test(x));
      eq(svRows.length, 1, `the injected finding must be exactly ONE row, got ${svRows.length}: ${JSON.stringify(svRows)}`);
      // that row must have the SAME unescaped-pipe (cell) count as the header
      eq(unescapedPipes(svRows[0]), want, `the injected row must have the header's cell count (no shift), got ${unescapedPipes(svRows[0])} vs ${want}: ${JSON.stringify(svRows[0])}`);
      // no stray backtick may survive inside the row (code span stays balanced):
      // the snippet cell is wrapped in `...`; an embedded backtick would break it.
      // After sanitize, the only backticks are the 4 cell-wrapping ones in §4
      // (File:Line not wrapped, Category/Action plain, Snippet wrapped, note plain)
      // → the snippet cell contributes exactly 2 backticks and no more.
      const backticks = (svRows[0].match(/`/g) || []).length;
      eq(backticks, 2, `the row's only backticks must be the snippet code-span pair (embedded backticks neutralized), got ${backticks}: ${JSON.stringify(svRows[0])}`);
      // and no empty/merged cell: splitting on UNESCAPED pipes yields non-degenerate cells
      const cells = svRows[0].split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
      eq(cells.length, want - 1, `cell count between delimiters must be header-1, got ${cells.length}`);
      ok(cells.every((c) => c.length > 0), `no cell may be empty/merged, got ${JSON.stringify(cells)}`);
    }
  },

  // ── B1b: a literal newline/CR in a note collapses, never splitting the row ──
  {
    id: "gen_markdown_newline_collapse",
    edge: "markdown-injection safety (newline/CR): a finding note carrying a CR/LF must collapse to a single space so the table row never splits into two rows — asserted against the generator with a synthetic finding (CR + LF + pipe in the note)",
    fixture: "md-injection", // root unused; this case builds its own scan object
    kind: "gen",
    assert({ generate }) {
      const synthetic = {
        ok: true, error: null, miniprogramRoot: "miniprogram/",
        renderer_config: { renderer: "skyline", componentFramework: null, style: null, navigationStyle: null, lazyCodeLoading: null, rendererOptions: null, page_overrides: [] },
        findings: [{
          category: "word_break", action: "keep", severity: "low",
          file: "miniprogram/pages/x/index.wxss", line: 7,
          snippet: "word-break: break-all;",
          note: "line-one\r\nline-two\nthird | piped"
        }],
        summary: { mechanical: 1, keep: 1, verify: 0, rewrite: 0, total: 2, already_migrated: false }
      };
      const md = generate(synthetic);
      const { header, rows } = findingsTable(md);
      const wbRows = rows.filter((x) => /word_break/.test(x));
      eq(wbRows.length, 1, `the CR/LF note must stay ONE row, got ${wbRows.length}: ${JSON.stringify(wbRows)}`);
      eq(unescapedPipes(wbRows[0]), unescapedPipes(header), `row cell count must equal header (no split/shift), got ${unescapedPipes(wbRows[0])} vs ${unescapedPipes(header)}`);
      ok(!/[\r\n]/.test(wbRows[0].replace(/\s+$/, "")), "no raw CR/LF may survive in the row");
    }
  },

  // ── B2a: subpackage renderer overrides — camelCase AND lowercase, own root ──
  {
    id: "scan_subpackage_overrides_both_spellings",
    edge: "real-world page discovery: a page-level renderer override inside `subPackages` (camelCase) AND `subpackages` (lowercase), each with its own `root`, are BOTH discovered (the prior `subPackages || subpackages` short-circuit silently dropped the lowercase set's overrides when both keys coexisted)",
    fixture: "subpackages",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const po = findingsOf(r, "page_renderer_override");
      eq(po.length, 2, `expected 2 page_renderer_override findings (camel + lower), got ${po.length}: ${JSON.stringify(po.map((f) => f.file))}`);
      const files = po.map((f) => f.file).join(" ");
      ok(/pkgCamel\/detail\/index\.json/.test(files), "the camelCase subPackages override must be found");
      ok(/pkglower\/page\/index\.json/.test(files), "the lowercase subpackages override must be found (the short-circuit bug)");
      ok(po.every((f) => f.action === "mechanical"), "each override is mechanical");
      eq(r.renderer_config.page_overrides.length, 2, "renderer_config.page_overrides count");
    }
  },

  // ── B2b: a worklet inside a custom COMPONENT file (Component(), not Page()) ──
  {
    id: "scan_component_file_worklet",
    edge: "real-world page discovery: a worklet usage inside a custom COMPONENT file (`Component({...})`, not a page) under usingComponents → still emits worklet 'rewrite' findings (component files are scanned, not just Page() files)",
    fixture: "component-worklet",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const w = findingsOf(r, "worklet");
      ok(w.length >= 1, `expected >=1 worklet finding in the component file, got ${w.length}`);
      ok(w.every((f) => f.action === "rewrite" && f.severity === "high"), "component-file worklet must be rewrite/high");
      ok(w.every((f) => /components\/mover\/index\.js/.test(f.file)), `worklet must be located in the component file, got ${JSON.stringify(w.map((f) => f.file))}`);
      ok(r.summary.rewrite >= 1, "summary.rewrite reflects the component worklet");
    }
  },

  // ── B2c: a 'worklet' directive / wx.worklet inside a .wxs module ──
  {
    id: "scan_wxs_worklet",
    edge: "real-world page discovery: a `'worklet'` directive or `wx.worklet` inside a `.wxs` file → emits worklet 'rewrite' findings (the file glob previously excluded `.wxs`, silently dropping them); a comment-only mention does NOT fire",
    fixture: "wxs-worklet",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const w = findingsOf(r, "worklet");
      // directive line (3) + wx.worklet line (6); the L1 comment must NOT fire.
      eq(w.length, 2, `expected 2 worklet findings in the .wxs (directive + wx.worklet), got ${w.length}: ${JSON.stringify(w.map((f) => f.file + ":" + f.line))}`);
      ok(w.every((f) => /\.wxs$/.test(f.file)), `worklet findings must be in the .wxs file, got ${JSON.stringify(w.map((f) => f.file))}`);
      ok(w.every((f) => f.action === "rewrite"), "wxs worklet must be rewrite");
      const lines = new Set(w.map((f) => f.line));
      ok(!lines.has(1), "the comment-only mention on line 1 must NOT fire (comment-strip applies to .wxs)");
    }
  },

  // ── B3a: CLI with NO arg → structured usage error, non-zero, no stack trace ──
  {
    id: "cli_scan_no_arg_structured_error",
    edge: "CLI contract: `node scripts/scan.mjs` with NO argument → a structured usage message on stderr + non-zero exit, NOT a Node stack trace / uncaught throw",
    fixture: "mixed", // unused; this case spawns the CLI
    kind: "scan",
    assert() {
      const p = spawnSync(process.execPath, [SCAN_CLI], { encoding: "utf8" });
      ok(p.status !== 0, `no-arg scan must exit non-zero, got ${p.status}`);
      ok(!/at \S+ \(.*:\d+:\d+\)/.test(p.stderr) && !/throw|TypeError|ReferenceError/.test(p.stderr),
        `no-arg scan must not print a stack trace, stderr=${JSON.stringify(p.stderr)}`);
      ok(/usage/i.test(p.stderr), `no-arg scan should print a usage hint, stderr=${JSON.stringify(p.stderr)}`);
    }
  },

  // ── B3b: CLI on a nonexistent path → {ok:false} JSON + non-zero, no throw ──
  {
    id: "cli_scan_nonexistent_path",
    edge: "CLI contract: `node scripts/scan.mjs /nonexistent` → prints a structured {ok:false,error} JSON and exits non-zero, never an uncaught error",
    fixture: "mixed",
    kind: "scan",
    assert() {
      const p = spawnSync(process.execPath, [SCAN_CLI, "/no/such/path/" + Date.now()], { encoding: "utf8" });
      ok(p.status !== 0, `nonexistent-path scan must exit non-zero, got ${p.status}`);
      let parsed;
      try { parsed = JSON.parse(p.stdout); } catch (e) {
        throw new Error(`stdout must be parseable JSON, got: ${JSON.stringify(p.stdout.slice(0, 120))}`);
      }
      eq(parsed.ok, false, "ok must be false for a nonexistent path");
      ok(typeof parsed.error === "string" && parsed.error.length > 0, "a non-empty error string is required");
      ok(!/at \S+ \(.*:\d+:\d+\)/.test(p.stderr), `must not print a stack trace, stderr=${JSON.stringify(p.stderr)}`);
    }
  },

  // ── B3c: gen CLI via <root> arg AND via piped stdin both work ──
  {
    id: "cli_gen_arg_and_stdin",
    edge: "CLI contract: `node scripts/gen_migration_map.mjs <root>` scans+renders, AND piping a scan JSON via stdin renders the SAME doc; neither throws an uncaught error",
    fixture: "mixed",
    kind: "scan",
    assert({ scan, root }) {
      // (1) by <root> arg
      const byArg = spawnSync(process.execPath, [GEN_CLI, root], { encoding: "utf8" });
      eq(byArg.status, 0, `gen by-arg must exit 0, got ${byArg.status} stderr=${JSON.stringify(byArg.stderr)}`);
      ok(/^#\s*MIGRATION-MAP/m.test(byArg.stdout), "gen by-arg must produce a MIGRATION-MAP");
      // (2) by piped stdin (scan JSON)
      const scanJson = JSON.stringify(scan(root));
      const byStdin = spawnSync(process.execPath, [GEN_CLI], { encoding: "utf8", input: scanJson });
      eq(byStdin.status || 0, 0, `gen by-stdin must not error, got ${byStdin.status} stderr=${JSON.stringify(byStdin.stderr)}`);
      ok(/^#\s*MIGRATION-MAP/m.test(byStdin.stdout), "gen by-stdin must produce a MIGRATION-MAP");
      // (3) both paths agree (the doc is a pure function of the scan)
      eq(byStdin.stdout.trim(), byArg.stdout.trim(), "by-arg and by-stdin must yield the same MIGRATION-MAP");
    }
  },

  // ── B3d: gen CLI on malformed stdin → structured error, non-zero, no throw ──
  {
    id: "cli_gen_bad_stdin",
    edge: "CLI contract: piping NON-JSON into `node scripts/gen_migration_map.mjs` (no arg) → a structured 'could not parse' message + non-zero exit, not an uncaught throw",
    fixture: "mixed",
    kind: "scan",
    assert() {
      const p = spawnSync(process.execPath, [GEN_CLI], { encoding: "utf8", input: "this is not json {" });
      ok(p.status !== 0, `bad stdin must exit non-zero, got ${p.status}`);
      ok(!/at \S+ \(.*:\d+:\d+\)/.test(p.stderr) || /could not parse/i.test(p.stderr),
        `bad stdin must report a structured parse error, stderr=${JSON.stringify(p.stderr)}`);
    }
  },

  // ════════════════ Stage-E repeat: CSS-detection defects (C1/C2/C3) ════════════════

  // ── C1 (BUG-1): CSS comment stripping must NOT eat a `url(https://…)` line ──
  {
    id: "scan_css_url_line_workaround_kept",
    edge: "CSS-comment safety: a real `background:url(https://cdn/x.png)` sharing a LINE with a keep workaround (`box-shadow:0 0 0 1px`, `word-break:break-all`, or `backdrop-filter`) must STILL produce that workaround finding at the right line in BOTH .wxss and .less (the JS `//`-comment stripper wrongly blanked the rest of the line at the scheme's `//`); a genuinely commented-out workaround (`/* … */` and a `//` LESS line comment) must STILL NOT fire",
    fixture: "css-url-line",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const bs = findingsOf(r, "box_shadow_border");
      const wb = findingsOf(r, "word_break");
      const bf = findingsOf(r, "backdrop_filter");
      // ONE url-line hairline + ONE url-line word-break + ONE url-line backdrop in
      // EACH of the .wxss and .less file → exactly 2 each. The commented-out
      // workarounds (block comment in .wxss; `//` line comment + `/* */` in .less)
      // must contribute ZERO — proving comment immunity is not regressed.
      eq(bs.length, 2, `expected exactly 2 box_shadow_border (one per file's url-line), got ${bs.length}: ${JSON.stringify(bs.map((f) => f.file + ":" + f.line))}`);
      eq(wb.length, 2, `expected exactly 2 word_break (one per file's url-line), got ${wb.length}: ${JSON.stringify(wb.map((f) => f.file + ":" + f.line))}`);
      eq(bf.length, 2, `expected exactly 2 backdrop_filter (one per file's url-line), got ${bf.length}: ${JSON.stringify(bf.map((f) => f.file + ":" + f.line))}`);
      ok([...bs, ...wb, ...bf].every((f) => f.action === "keep"), "all url-line workarounds are keep");
      // both file types are represented (the .less `//`-comment path AND the .wxss path)
      const files = [...bs, ...wb, ...bf].map((f) => f.file).join(" ");
      ok(/\.wxss/.test(files), "a .wxss url-line workaround must be found");
      ok(/\.less/.test(files), "a .less url-line workaround must be found");
      // the hairline must sit on the SAME line as the url() (the line the JS
      // stripper used to blank): .wxss L3, .less L4 in the fixture.
      ok(bs.some((f) => f.file.endsWith(".wxss") && f.line === 3), `the .wxss url-line hairline must be at L3, got ${JSON.stringify(bs.map((f) => f.file + ":" + f.line))}`);
      ok(bs.some((f) => f.file.endsWith(".less") && f.line === 4), `the .less url-line hairline must be at L4, got ${JSON.stringify(bs.map((f) => f.file + ":" + f.line))}`);
    }
  },

  // ── C2 (BUG-2): box_shadow_border catches inset + 2nd-clause + uppercase hairlines ──
  {
    id: "scan_box_shadow_border_inset_multishadow",
    edge: "box_shadow_border completeness: a hairline `0 0 0 Npx` clause anywhere in the value fires — with a leading `inset` (`inset 0 0 0 1px`), as a 2nd+ comma clause (`0 2px 8px rgba(), 0 0 0 1px`), and case-insensitively on the unit (`0 0 0 1PX`); but a no-op `0 0 0 0` / `none` / `0 0 0 transparent` and a normal multi-shadow with NO hairline clause (`0 2px 8px rgba(), 0 4px 16px rgba()`) must STILL NOT fire",
    fixture: "box-shadow-inset-multi",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const bs = findingsOf(r, "box_shadow_border");
      // fixture: inset(L5) + multi-2nd-clause(L6) + uppercase(L7) fire = 3;
      // nohair(L8) + reset(L9) + none(L10) + transparent(L11) do NOT.
      eq(bs.length, 3, `expected exactly 3 box_shadow_border (inset + multi-2nd + uppercase), got ${bs.length}: ${JSON.stringify(bs.map((f) => f.line + " " + f.snippet))}`);
      ok(bs.every((f) => f.action === "keep"), "box_shadow_border must be keep");
      const lines = new Set(bs.map((f) => f.line));
      ok(lines.has(5), `the inset hairline (L5) must fire, got ${JSON.stringify([...lines])}`);
      ok(lines.has(6), `the multi-shadow 2nd-clause hairline (L6) must fire, got ${JSON.stringify([...lines])}`);
      ok(lines.has(7), `the uppercase 1PX hairline (L7) must fire, got ${JSON.stringify([...lines])}`);
      // guardrails: the no-hairline multi-shadow + the resets must be SILENT.
      ok(!lines.has(8), "the no-hairline multi-shadow (L8) must NOT fire");
      ok(![9, 10, 11].some((ln) => lines.has(ln)), `the resets 0-0-0-0 / none / transparent (L9-11) must NOT fire, got ${JSON.stringify([...lines])}`);
      const snips = bs.map((f) => f.snippet).join(" ");
      ok(/inset/.test(snips), "an inset hairline snippet must be present");
      ok(/1PX/.test(snips), "the uppercase-unit hairline must be present (case-insensitive unit)");
    }
  },

  // ── C3 (BUG-3): flex_grid_workaround drops the full-width-calc false positive ──
  {
    id: "scan_flex_grid_fullwidth_no_false_positive",
    edge: "flex_grid_workaround precision: an UNRELATED tag-cloud (`flex-wrap:wrap`) co-located with an UNRELATED full-width container (`width: calc(100% - 20px)`) must NOT fire (a 100% calc is a container, not a grid column); a genuine flex-grid whose non-100% column width (`width: calc(50% - 6rpx)`) is declared in a SIBLING rule of the flex container STILL fires (no false negative on the real sibling-rule pattern — block-scoping would have broken this)",
    fixture: "flex-grid-fullwidth",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const fg = findingsOf(r, "flex_grid_workaround");
      // cloud/index.less: flex-wrap:wrap + width:calc(100% …) → must NOT fire;
      // grid/index.less: flex-wrap:wrap + a sibling width:calc(50% …) → fires once.
      eq(fg.length, 1, `expected exactly 1 flex_grid_workaround (the real column-width grid only), got ${fg.length}: ${JSON.stringify(fg.map((f) => f.file))}`);
      ok(fg[0].file.includes("grid/index.less"), `the one finding must be the genuine grid-substitute file, got ${fg[0].file}`);
      ok(fg[0].action === "keep", "flex_grid_workaround must be keep");
      ok(!fg.some((f) => f.file.includes("cloud/index.less")), "the unrelated tag-cloud + full-width calc(100%) file must NOT fire");
    }
  },

  // ════════════════ Stage-E surgical polish (FIX 1 / FIX 2 / FIX 3) ════════════════

  // ── FIX 1: CSS property names are case-INSENSITIVE → uppercase props match ──
  {
    id: "scan_css_prop_case_insensitive",
    edge: "CSS property-name case-insensitivity parity: a `.less` with `WORD-BREAK: BREAK-ALL` and `BACKDROP-FILTER: blur(4px)` (uppercase/mixed-case property names — valid CSS, property names are case-insensitive) must STILL fire the keep workaround findings (word_break + backdrop_filter), matching BOX_SHADOW_BORDER_RE's existing `i` flag; the value part matches case-insensitively too (`break-all`/`BREAK-ALL`)",
    fixture: "css-prop-case",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      // POSITIVE control so this is not vacuously green: the fixture IS
      // renderer:skyline, so the scanner ran and produced the app-level flip.
      eq(r.renderer_config.renderer, "skyline", "renderer (scanner must have run)");
      eq(findingsOf(r, "renderer_flip").length, 1, "the scanner must still find the app-level flip");
      // the fix itself: the uppercase-property workarounds each keep a finding.
      const wb = findingsOf(r, "word_break");
      const bf = findingsOf(r, "backdrop_filter");
      eq(wb.length, 1, `uppercase WORD-BREAK: BREAK-ALL must fire word_break, got ${wb.length}: ${JSON.stringify(wb.map((f) => f.snippet))}`);
      eq(bf.length, 1, `uppercase BACKDROP-FILTER must fire backdrop_filter, got ${bf.length}: ${JSON.stringify(bf.map((f) => f.snippet))}`);
      ok(wb[0].action === "keep" && bf[0].action === "keep", "both uppercase-prop workarounds are keep");
      // the matched snippets really carry the uppercase property name (non-vacuous)
      ok(/WORD-BREAK/.test(wb[0].snippet), `word_break snippet must be the uppercase prop, got ${JSON.stringify(wb[0].snippet)}`);
      ok(/BACKDROP-FILTER/.test(bf[0].snippet), `backdrop_filter snippet must be the uppercase prop, got ${JSON.stringify(bf[0].snippet)}`);
    }
  },

  // ── FIX 2: dedupe page_renderer_override by RESOLVED file path ──
  {
    id: "scan_page_override_dedupe",
    edge: "page_renderer_override dedupe: the SAME physical page (same resolved root/page json) listed in BOTH `subPackages` and `subpackages` (the post-MERGE consequence) must yield EXACTLY ONE page_renderer_override finding for that file — the contract's 'one finding per page' granularity; dedupe is by RESOLVED PATH only, so two DIFFERENT subpackage pages in different roots STILL each produce their own override (no over-collapse)",
    fixture: "page-override-dedupe",
    kind: "scan",
    assert({ scan, root }) {
      const r = scan(root);
      eq(r.ok, true, "ok");
      const po = findingsOf(r, "page_renderer_override");
      // app.json lists {root:"sub", pages:["p/index"]} in BOTH subPackages AND
      // subpackages (→ the SAME resolved sub/p/index.json), plus a DISTINCT
      // {root:"sub2", pages:["q/index"]}. Both page jsons pin webview under the
      // skyline app. Dedup by resolved path → sub/p/index once + sub2/q/index once.
      const dup = po.filter((f) => /sub\/p\/index\.json$/.test(f.file));
      eq(dup.length, 1, `the duplicated sub/p/index page must yield exactly ONE override (dedupe by resolved path), got ${dup.length}: ${JSON.stringify(po.map((f) => f.file))}`);
      // CONTROL — no over-collapse: the distinct sub2/q page still gets its own override.
      const ctrl = po.filter((f) => /sub2\/q\/index\.json$/.test(f.file));
      eq(ctrl.length, 1, `the DISTINCT sub2/q page must STILL produce its own override (no over-collapse), got ${ctrl.length}: ${JSON.stringify(po.map((f) => f.file))}`);
      // total = 1 (deduped dup) + 1 (distinct control) = 2, all mechanical
      eq(po.length, 2, `expected 2 page_renderer_override findings total (1 deduped + 1 distinct), got ${po.length}: ${JSON.stringify(po.map((f) => f.file))}`);
      ok(po.every((f) => f.action === "mechanical"), "each override is mechanical");
      // renderer_config.page_overrides must mirror the deduped set (one per page)
      eq(r.renderer_config.page_overrides.length, 2, `renderer_config.page_overrides must also be deduped to 2, got ${r.renderer_config.page_overrides.length}`);
      const cfgDup = r.renderer_config.page_overrides.filter((p) => /sub\/p\/index\.json$/.test(p.file));
      eq(cfgDup.length, 1, "renderer_config.page_overrides must carry the duplicated page exactly once");
    }
  },

  // ── FIX 3: the cell-length cap must not leave a dangling backslash ──
  {
    id: "gen_cap_no_dangling_backslash",
    edge: "MIGRATION-MAP cell cap safety: a finding snippet whose escaped `\\|` lands EXACTLY at the cap boundary must not be severed into a lone trailing `\\` before the `…` ellipsis (the pre-fix slice(0,199) kept the `\\` and dropped the `|`, yielding `…a\\…`). After the fix the rendered §4 cell ends in `…` with NO dangling `\\` immediately before it, the row keeps the header's column (unescaped-pipe) count, and the snippet code-span backticks stay balanced (exactly 2)",
    fixture: "md-injection", // root unused; this case builds its own scan object
    kind: "gen",
    assert({ generate }) {
      // Construct the snippet so its ESCAPED form has `\|` straddling the cap:
      // 198 plain chars, then a pipe → escaped indices 0..197 plain, 198 = "\",
      // 199 = "|". slice(0, CELL_MAX-1=199) lands between the "\" and the "|".
      const snippet = "a".repeat(198) + "|" + "tail-after-the-cap";
      const synthetic = {
        ok: true, error: null, miniprogramRoot: "miniprogram/",
        renderer_config: { renderer: "skyline", componentFramework: null, style: null, navigationStyle: null, lazyCodeLoading: null, rendererOptions: null, page_overrides: [] },
        findings: [{
          category: "scroll_view_type", action: "keep", severity: "low",
          file: "miniprogram/pages/x/index.wxml", line: 7,
          snippet, note: "n"
        }],
        summary: { mechanical: 1, keep: 1, verify: 0, rewrite: 0, total: 2, already_migrated: false }
      };
      const md = generate(synthetic);
      const { header, rows } = findingsTable(md);
      const row = rows.find((x) => /scroll_view_type/.test(x));
      ok(row, `the capped finding must render exactly one §4 row, got rows=${JSON.stringify(rows)}`);
      // the rendered snippet sits inside the `...` code span of that row
      const m = row.match(/`([^`]*)`/);
      ok(m, `the row must contain a `+"`...`"+` snippet code span, got ${JSON.stringify(row)}`);
      const cell = m[1];
      // it WAS capped (the construction is non-vacuous: the source exceeds CELL_MAX)
      ok(/…$/.test(cell), `the snippet cell must end in the ellipsis (proving it was capped), got tail ${JSON.stringify(cell.slice(-6))}`);
      // THE FIX: no dangling lone backslash immediately before the ellipsis.
      const beforeEllipsis = cell.slice(0, cell.length - 1); // drop the … code unit
      const trailingBackslashes = (beforeEllipsis.match(/\\+$/) || [""])[0].length;
      eq(trailingBackslashes % 2, 0, `the char(s) before the … must NOT be an odd (severed) backslash run, got a run of ${trailingBackslashes}: tail=${JSON.stringify(cell.slice(-6))}`);
      // the row keeps the header's column (unescaped-pipe) count — no shift
      eq(unescapedPipes(row), unescapedPipes(header), `the capped row must keep the header's cell count, got ${unescapedPipes(row)} vs ${unescapedPipes(header)}: ${JSON.stringify(row)}`);
      // backticks balanced: exactly the snippet code-span pair survives
      const backticks = (row.match(/`/g) || []).length;
      eq(backticks, 2, `the row's backticks must be the snippet code-span pair only, got ${backticks}: ${JSON.stringify(row)}`);
    }
  },

  // ── B4: scale/perf sanity — ~200 pages scans cleanly with correct counts ──
  {
    id: "scan_scale_200_pages",
    edge: "scale/perf sanity: a program with ~200 pages (each a renderer:skyline page with a worklet line) scans to completion with correct aggregate counts (no O(n²) blowup, no per-file crash) within a generous time bound",
    fixture: "mixed", // unused; this case builds a tmp program
    kind: "scan",
    assert({ scan }) {
      const N = 200;
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mpgl-scale-"));
      try {
        const mp = path.join(tmp, "miniprogram");
        fs.mkdirSync(mp, { recursive: true });
        fs.writeFileSync(path.join(tmp, "project.config.json"), JSON.stringify({ miniprogramRoot: "miniprogram/", appid: "wxscale" }));
        const pages = [];
        for (let i = 0; i < N; i++) {
          const dir = path.join(mp, "pages", "p" + i);
          fs.mkdirSync(dir, { recursive: true });
          // each page: a worklet JS line (1 rewrite) + a box-shadow border (1 keep)
          fs.writeFileSync(path.join(dir, "index.js"), "Page({ onReady(){ runOnUI(()=>{ 'worklet'; })(); } });\n");
          fs.writeFileSync(path.join(dir, "index.wxml"), "<view class=\"card\">p" + i + "</view>\n");
          fs.writeFileSync(path.join(dir, "index.less"), ".card { box-shadow: 0 0 0 1px #ccc; }\n");
          pages.push("pages/p" + i + "/index");
        }
        fs.writeFileSync(path.join(mp, "app.json"), JSON.stringify({ pages, renderer: "skyline" }));

        const t0 = Date.now();
        const r = scan(tmp);
        const ms = Date.now() - t0;

        eq(r.ok, true, `scale scan must succeed, got ok=${r.ok} error=${r.error}`);
        // aggregate counts: 1 app-level flip + N worklet rewrites + N box-shadow keeps
        eq(findingsOf(r, "renderer_flip").length, 1, "exactly one app-level flip");
        eq(findingsOf(r, "worklet").length, N, `one worklet rewrite per page, got ${findingsOf(r, "worklet").length}`);
        eq(findingsOf(r, "box_shadow_border").length, N, `one box-shadow keep per page, got ${findingsOf(r, "box_shadow_border").length}`);
        eq(r.summary.rewrite, N, `summary.rewrite must equal page count, got ${r.summary.rewrite}`);
        eq(r.summary.total, findingsOf(r, "renderer_flip").length + findingsOf(r, "worklet").length + findingsOf(r, "box_shadow_border").length, "summary.total reconciles");
        // generous, non-flaky bound: 200 tiny pages must scan well under 20s.
        ok(ms < 20000, `scan of ${N} pages should complete under 20s, took ${ms}ms`);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    }
  }
];

// expose helpers for any external reuse
export { ok, eq, findingsOf, actionsOf };
