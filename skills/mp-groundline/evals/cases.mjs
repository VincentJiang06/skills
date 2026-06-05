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
import { fileURLToPath } from "node:url";
import { CATEGORY_ORDER } from "../scripts/gen_migration_map.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.join(HERE, "..", "tests", "fixtures");
const fx = (name) => path.join(FIXTURES, name);

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
        "js-rewrite-per-occurrence"
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
  }
];

// expose helpers for any external reuse
export { ok, eq, findingsOf, actionsOf };
