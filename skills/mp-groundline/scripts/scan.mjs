// mp-groundline migration scanner.
//
// scan(root) reads a WeChat Mini Program tree READ-ONLY and returns the
// migration inventory frozen in references/scanner-contract.md:
//   { ok, error, miniprogramRoot, renderer_config, findings[], summary }
// `action ∈ {mechanical|keep|verify|rewrite}`. A category is `rewrite` ONLY for
// Skyline-EXCLUSIVE features (evidence: references/skyline-to-webview.md, sourced
// from the on-disk skyline-* skills). Everything else keeps/verifies/flips.
//
// CLI: `node scripts/scan.mjs <root>` prints the JSON and exits non-zero on a
// structured error. The import path (used by evals) never runs the CLI.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

// ───────────────────────── detection tables ─────────────────────────

// Skyline-EXCLUSIVE element tags (component-support.md → "Skyline 新增组件").
// Matched ONLY as a real opening tag: `<tag` followed by whitespace, `/`, or `>`.
const SKYLINE_TAGS = [
  "span", "grid-view", "list-view", "sticky-header", "sticky-section",
  "nested-scroll-header", "nested-scroll-body", "draggable-sheet", "snapshot"
];
// gesture handlers: the CLOSED Skyline set only. A project's own custom
// `<app-swipe-gesture-handler>` / `<my-custom-gesture-handler>` is NOT Skyline and
// must not be flagged. Same `<tag` + `(?=[\s/>])` boundary discipline as the tags
// above (so `<my-snapshot>` / `<grid-view-x>` stay non-matches).
const SKYLINE_GESTURE_PREFIXES = [
  "tap", "double-tap", "long-press", "pan", "scale", "force-press",
  "horizontal-drag", "vertical-drag"
];
const SKYLINE_TAG_RE = new RegExp(
  `<(${SKYLINE_TAGS.join("|")}|(?:${SKYLINE_GESTURE_PREFIXES.join("|")})-gesture-handler)(?=[\\s/>])`,
  "g"
);

// worklet animation API / directive (→ rewrite, high). compatibility.md: animate
// 接口 → worklet 动画; worklet is Skyline-exclusive.
const WORKLET_RE = /\bwx\.worklet\b|(['"])worklet\1|\bapplyAnimatedStyle\b|\brunOnUI\b|\brunOnJS\b|\buseSharedValue\b|\bEasing\b|\b(?:timing|spring|decay)\s*\(/;

// custom route (→ rewrite). skyline-route: routeBuilder / wx.router / wx:// /
// open-container / customRoute — no WebView equivalent.
const CUSTOM_ROUTE_RE = /\brouteBuilder\b|\bwx\.router\b|wx:\/\/|\bopenContainer\b|\bcustomRoute\b/;
const OPEN_CONTAINER_TAG_RE = /<open-container(?=[\s/>])/g;

// workaround style patterns (→ keep). All still render under WebView.
const BOX_SHADOW_BORDER_RE = /box-shadow:\s*0\s+0\s+0\s+\d/;       // 0 0 0 Npx used as a border
const WORD_BREAK_RE = /word-break:\s*break-all/;
const BACKDROP_FILTER_RE = /backdrop-filter\s*:/;

// scroll-view type=list/custom (→ keep). Note whether `enhanced` is already set.
const SCROLL_VIEW_RE = /<scroll-view\b[^>]*\btype\s*=\s*("|')(list|custom)\1[^>]*>/g;

const SKIP_DIRS = new Set(["node_modules", "miniprogram_npm", ".git"]);

// ───────────────────────── fs helpers ─────────────────────────

function readJsonSafe(file) {
  try {
    // strip a leading UTF-8 BOM (WeChat-DevTools / Windows-saved JSON) before
    // parse — otherwise JSON.parse throws and a real file is wrongly "malformed".
    const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
    return { json: JSON.parse(raw), error: null };
  } catch (e) {
    return { json: null, error: e.message };
  }
}

function walk(dir, exts, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(full, exts, out);
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

// strip <!-- ... --> comments but PRESERVE newlines so line numbers stay accurate.
function stripWxmlComments(src) {
  return src.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}

// strip JS/TS comments (// line and /* block */), preserving newlines, so a code
// COMMENT that merely mentions `wx.worklet` / `routeBuilder` produces no finding —
// only real code (incl. string literals like 'wx://…', which ARE real usage)
// does. A `"` / `'` / `` ` `` is skipped over so a `//` inside a string is not
// mistaken for a comment.
function stripJsComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  const blank = (s) => s.replace(/[^\n]/g, " ");
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === "/" && c2 === "/") {
      let j = src.indexOf("\n", i);
      if (j === -1) j = n;
      out += blank(src.slice(i, j));
      i = j;
      continue;
    }
    if (c === "/" && c2 === "*") {
      let j = src.indexOf("*/", i + 2);
      if (j === -1) j = n; else j += 2;
      out += blank(src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < n) {
        if (src[i] === "\\") { out += src[i]; if (i + 1 < n) out += src[i + 1]; i += 2; continue; }
        out += src[i];
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function lineOfIndex(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) {
    if (src[i] === "\n") line++;
  }
  return line;
}

function snippetAt(src, index, len = 60) {
  const lineStart = src.lastIndexOf("\n", index) + 1;
  let lineEnd = src.indexOf("\n", index);
  if (lineEnd === -1) lineEnd = src.length;
  return src.slice(lineStart, lineEnd).trim().slice(0, len);
}

// ───────────────────────── the scan ─────────────────────────

export function scan(root) {
  const empty = { mechanical: 0, keep: 0, verify: 0, rewrite: 0, total: 0, already_migrated: false };
  const fail = (error, miniprogramRoot = ".") => ({
    ok: false, error, miniprogramRoot,
    renderer_config: null, findings: [], summary: { ...empty }
  });

  let absRoot;
  try {
    absRoot = path.resolve(root);
    if (!fs.existsSync(absRoot)) return fail(`root path does not exist: ${root}`);
  } catch (e) {
    return fail(`invalid root path: ${e.message}`);
  }

  // resolve miniprogramRoot from project.config.json (if present)
  let miniprogramRoot = ".";
  const pcfgPath = path.join(absRoot, "project.config.json");
  if (fs.existsSync(pcfgPath)) {
    const { json } = readJsonSafe(pcfgPath);
    if (json && typeof json.miniprogramRoot === "string" && json.miniprogramRoot.trim()) {
      miniprogramRoot = json.miniprogramRoot.replace(/^\.\//, "");
    }
  }
  const mpAbs = path.resolve(absRoot, miniprogramRoot);

  // locate app.json under the resolved root
  const appJsonPath = path.join(mpAbs, "app.json");
  if (!fs.existsSync(appJsonPath)) {
    return fail(`app.json not found under ${miniprogramRoot} (looked at ${path.relative(absRoot, appJsonPath)})`, miniprogramRoot);
  }
  const { json: appJson, error: appErr } = readJsonSafe(appJsonPath);
  if (appErr || !appJson || typeof appJson !== "object") {
    return fail(`app.json is malformed (invalid JSON): ${appErr || "not an object"}`, miniprogramRoot);
  }

  const rel = (abs) => path.relative(absRoot, abs).split(path.sep).join("/");
  const findings = [];
  const add = (f) => findings.push(f);

  // ── config: renderer_config ──
  const appRenderer = typeof appJson.renderer === "string" ? appJson.renderer : null;
  const componentFramework = typeof appJson.componentFramework === "string" ? appJson.componentFramework : null;
  const style = typeof appJson.style === "string" ? appJson.style : null;
  const navigationStyle = appJson.window && typeof appJson.window.navigationStyle === "string"
    ? appJson.window.navigationStyle : null;
  const lazyCodeLoading = typeof appJson.lazyCodeLoading === "string" ? appJson.lazyCodeLoading : null;
  const rendererOptions = appJson.rendererOptions && typeof appJson.rendererOptions === "object"
    ? appJson.rendererOptions : null;

  // effective app renderer for diffing page overrides ("webview" is the default)
  const effectiveAppRenderer = appRenderer || "webview";
  const isSkyline = appRenderer === "skyline";

  // app.json source for line numbers
  const appSrc = fs.readFileSync(appJsonPath, "utf8");
  const lineOfKey = (src, key) => {
    const m = src.match(new RegExp(`"${key}"\\s*:`));
    return m ? lineOfIndex(src, m.index) : 0;
  };

  // ── renderer flip (app-level) ──
  if (isSkyline) {
    add({
      category: "renderer_flip", action: "mechanical", severity: "info",
      file: rel(appJsonPath), line: lineOfKey(appSrc, "renderer"),
      snippet: '"renderer": "skyline"',
      note: 'Flip app-level renderer "skyline" → "webview" (the core migration). Revert = git checkout app.json.'
    });
  }

  // ── componentFramework note ──
  if (componentFramework === "glass-easel") {
    add({
      category: "component_framework", action: "keep", severity: "info",
      file: rel(appJsonPath), line: lineOfKey(appSrc, "componentFramework"),
      snippet: '"componentFramework": "glass-easel"',
      note: "Keep glass-easel (supported on WebView, maximizes consistency). Do not switch to exparser."
    });
  }

  // ── rendererOptions.skyline note ──
  if (rendererOptions && rendererOptions.skyline) {
    add({
      category: "renderer_options", action: "keep", severity: "info",
      file: rel(appJsonPath), line: lineOfKey(appSrc, "rendererOptions"),
      snippet: '"rendererOptions": { "skyline": { ... } }',
      note: "Ignored by WebView; safe to keep or strip. Never a rewrite."
    });
  }

  // ── page-level renderer overrides + collect page sources ──
  const page_overrides = [];
  const pages = Array.isArray(appJson.pages) ? appJson.pages.slice() : [];
  // also include subpackage pages if declared
  for (const sp of appJson.subPackages || appJson.subpackages || []) {
    if (sp && Array.isArray(sp.pages)) {
      for (const p of sp.pages) pages.push((sp.root ? sp.root.replace(/\/$/, "") + "/" : "") + p);
    }
  }
  for (const page of pages) {
    const pj = path.join(mpAbs, `${page}.json`);
    if (!fs.existsSync(pj)) continue;
    const { json: pjJson } = readJsonSafe(pj);
    if (!pjJson || typeof pjJson !== "object") continue; // malformed page json → skip, no crash
    const pageRenderer = typeof pjJson.renderer === "string" ? pjJson.renderer : null;
    if (pageRenderer && pageRenderer !== effectiveAppRenderer) {
      page_overrides.push({ page, file: rel(pj), renderer: pageRenderer });
      const pjSrc = fs.readFileSync(pj, "utf8");
      // Only a page that stays/forces skyline needs a mechanical flip; a page
      // pinned to webview under a skyline app is ALSO a distinct mechanical
      // delta the migration must reconcile. Either way it is its own finding.
      add({
        category: "page_renderer_override", action: "mechanical", severity: "low",
        file: rel(pj), line: lineOfKey(pjSrc, "renderer"),
        snippet: `"renderer": "${pageRenderer}"`,
        note: `Page-level renderer "${pageRenderer}" differs from app-level "${effectiveAppRenderer}"; reconcile this page distinctly from the app flip.`
      });
    }
  }

  // ── scan source files ──
  const files = walk(mpAbs, [".wxml", ".wxss", ".less", ".js", ".ts"], []);
  // ignore .d.ts and test files lightly
  for (const file of files) {
    const name = path.basename(file);
    const src = fs.readFileSync(file, "utf8");
    const relFile = rel(file);

    if (file.endsWith(".wxml")) {
      const clean = stripWxmlComments(src);

      // Skyline-only element tags — one finding per real opening tag.
      let m;
      SKYLINE_TAG_RE.lastIndex = 0;
      while ((m = SKYLINE_TAG_RE.exec(clean)) !== null) {
        const tag = m[1];
        add({
          category: "skyline_component", action: "rewrite", severity: "high",
          file: relFile, line: lineOfIndex(clean, m.index),
          snippet: `<${tag}>`,
          note: `<${tag}> is Skyline-exclusive (no WebView equivalent) — manual rewrite required. See references/skyline-to-webview.md.`
        });
      }

      // open-container (custom-route container element) — one finding per
      // occurrence. skyline-to-webview.md: "flags every occurrence; the
      // migration must not silently drop one."
      OPEN_CONTAINER_TAG_RE.lastIndex = 0;
      while ((m = OPEN_CONTAINER_TAG_RE.exec(clean)) !== null) {
        add({
          category: "custom_route", action: "rewrite", severity: "high",
          file: relFile, line: lineOfIndex(clean, m.index),
          snippet: "<open-container>",
          note: "open-container is a Skyline custom-route container (no WebView equivalent) — rewrite to default navigation."
        });
      }

      // scroll-view type=list/custom → keep; record whether enhanced is present
      SCROLL_VIEW_RE.lastIndex = 0;
      while ((m = SCROLL_VIEW_RE.exec(clean)) !== null) {
        const tagText = m[0];
        const hasEnhanced = /\benhanced\b/.test(tagText);
        add({
          category: "scroll_view_type", action: "keep", severity: "low",
          file: relFile, line: lineOfIndex(clean, m.index),
          snippet: tagText.slice(0, 80),
          note: hasEnhanced
            ? 'scroll-view already carries `enhanced`; `type` is ignored under WebView — keep as-is (no redundant suggestion needed).'
            : 'scroll-view type="list"/"custom" still scrolls under WebView; `type` is ignored — keep unchanged.'
        });
      }

      // camera tap-mask: a <camera> plus a sibling mask element marked as a tap mask
      if (/<camera(?=[\s/>])/.test(clean) && /class\s*=\s*("|')[^"']*(tap-mask|camera-mask|mask)[^"']*\1/.test(clean)) {
        const idx = clean.search(/class\s*=\s*("|')[^"']*(tap-mask|camera-mask|mask)/);
        add({
          category: "camera_mask", action: "verify", severity: "medium",
          file: relFile, line: lineOfIndex(clean, idx < 0 ? 0 : idx),
          snippet: snippetAt(clean, idx < 0 ? 0 : idx),
          note: "camera tap-mask: taps may bubble differently under WebView — verify before/after with vince-mp; adjust only if the mask stops working."
        });
      }
    }

    if (file.endsWith(".wxss") || file.endsWith(".less")) {
      // strip CSS/LESS comments (`/* */` and, for .less, `//`) so a comment that
      // merely mentions a workaround does not create a phantom inventory row.
      const styleSrc = stripJsComments(src); // reuses //, /* */ and string-skip logic
      const lines = styleSrc.split("\n");
      lines.forEach((ln, i) => {
        if (BOX_SHADOW_BORDER_RE.test(ln)) {
          add({
            category: "box_shadow_border", action: "keep", severity: "low",
            file: relFile, line: i + 1, snippet: ln.trim().slice(0, 80),
            note: "box-shadow used as a border (Skyline border-style workaround); `border` works under WebView but keep for visual consistency."
          });
        }
        if (WORD_BREAK_RE.test(ln)) {
          add({
            category: "word_break", action: "keep", severity: "low",
            file: relFile, line: i + 1, snippet: ln.trim().slice(0, 80),
            note: "word-break: break-all (overflow-wrap:anywhere workaround); still renders under WebView — keep."
          });
        }
        if (BACKDROP_FILTER_RE.test(ln)) {
          add({
            category: "backdrop_filter", action: "keep", severity: "low",
            file: relFile, line: i + 1, snippet: ln.trim().slice(0, 80),
            note: "backdrop-filter works under WebView — keep."
          });
        }
      });
      // flex-grid workaround: a .less/.wxss using display:flex + flex-wrap is a
      // common grid substitute. Flag once per file as keep (heuristic, low).
      if (/display:\s*flex/.test(styleSrc) && /flex-wrap:\s*wrap/.test(styleSrc)) {
        const idx = styleSrc.search(/flex-wrap:\s*wrap/);
        add({
          category: "flex_grid_workaround", action: "keep", severity: "low",
          file: relFile, line: lineOfIndex(styleSrc, idx), snippet: snippetAt(styleSrc, idx),
          note: "flex + wrap used instead of display:grid (grid-view workaround); still renders under WebView — keep."
        });
      }
    }

    if ((file.endsWith(".js") || file.endsWith(".ts")) && !name.endsWith(".d.ts")) {
      // One finding per DISTINCT matching source line (mirrors the per-occurrence
      // WXML tag loop and the per-line CSS-workaround detections). The finding
      // identity is file:line, so per-line granularity gives the migrator the
      // complete, de-duplicated site list — the skill's "flag every occurrence,
      // never silently drop one" guarantee (references/skyline-to-webview.md).
      // Dedupe is WITHIN a line only: a line matching both patterns yields one
      // worklet + one custom_route finding for that line; matching the same
      // pattern twice on one line still yields a single finding for that line.
      const lines = stripJsComments(src).split("\n");
      lines.forEach((ln, i) => {
        if (WORKLET_RE.test(ln)) {
          add({
            category: "worklet", action: "rewrite", severity: "high",
            file: relFile, line: i + 1, snippet: ln.trim().slice(0, 80),
            note: "Skyline worklet animation (no WebView equivalent) — rewrite with wx.createAnimation / CSS animation / this.animate(). See references/skyline-to-webview.md."
          });
        }
        if (CUSTOM_ROUTE_RE.test(ln)) {
          add({
            category: "custom_route", action: "rewrite", severity: "high",
            file: relFile, line: i + 1, snippet: ln.trim().slice(0, 80),
            note: "Skyline custom route (routeBuilder/wx.router/wx://) — no WebView equivalent; rewrite to default transitions."
          });
        }
      });
    }
  }

  // ── summary ──
  const summary = { mechanical: 0, keep: 0, verify: 0, rewrite: 0, total: findings.length, already_migrated: false };
  for (const f of findings) {
    if (Object.prototype.hasOwnProperty.call(summary, f.action)) summary[f.action]++;
  }
  summary.already_migrated = !isSkyline; // renderer already webview (or unset → webview default)

  return {
    ok: true,
    error: null,
    miniprogramRoot,
    renderer_config: {
      renderer: appRenderer,
      componentFramework,
      style,
      navigationStyle,
      lazyCodeLoading,
      rendererOptions,
      page_overrides
    },
    findings,
    summary
  };
}

// ───────────────────────── CLI wrapper ─────────────────────────

const isMain = (() => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] || "");
  } catch {
    return false;
  }
})();

if (isMain) {
  const root = process.argv[2];
  if (!root) {
    process.stderr.write("usage: node scripts/scan.mjs <program-root>\n");
    process.exit(2);
  }
  const result = scan(root);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.ok ? 0 : 1);
}
