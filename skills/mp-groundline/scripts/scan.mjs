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
//
// Worklet detection is split into STRONG standalone signals and WEAK tokens to
// kill a rewrite-class FALSE POSITIVE: a generic charting/animation lib
// (`import { Easing } from 'chart-lib'`, `function spring(){}`, `timing(300)`)
// shares the bare names `Easing`/`timing(`/`spring(`/`decay(` with the Skyline
// worklet API but is NOT worklet. So the WEAK tokens only count when the SAME
// file ALSO carries at least one STRONG, Skyline-exclusive signal.
//
// STRONG (always fire, per matching line — unchanged behavior): `wx.worklet`, a
// `'worklet'`/`"worklet"` directive, `applyAnimatedStyle`, `runOnUI`, `runOnJS`,
// `useSharedValue` (`wx.worklet.shared(` is covered by the `\bwx\.worklet\b`
// alternative). These have no non-Skyline meaning, so each is dispositive alone.
const WORKLET_STRONG_RE = /\bwx\.worklet\b|(['"])worklet\1|\bapplyAnimatedStyle\b|\brunOnUI\b|\brunOnJS\b|\buseSharedValue\b/;
// WEAK (Easing / bare timing( / spring( / decay() — count ONLY in a file that
// also matches WORKLET_STRONG_RE. File-level gating (NOT a `wx.worklet.` prefix
// requirement) is deliberate: the existing per-occurrence fixture has a bare
// `spring()` line in a file that also uses `wx.worklet`/`applyAnimatedStyle`, and
// that line MUST still count — a prefix requirement would drop it (regression).
const WORKLET_WEAK_RE = /\bEasing\b|\b(?:timing|spring|decay)\s*\(/;

// custom route (→ rewrite). skyline-route: routeBuilder / wx.router / wx:// /
// open-container / customRoute — no WebView equivalent.
const CUSTOM_ROUTE_RE = /\brouteBuilder\b|\bwx\.router\b|wx:\/\/|\bopenContainer\b|\bcustomRoute\b/;
const OPEN_CONTAINER_TAG_RE = /<open-container(?=[\s/>])/g;

// workaround style patterns (→ keep). All still render under WebView.
// box-shadow as a 1-side hairline border: a hairline CLAUSE `(inset )?0 0 0 Npx`
// where the spread carries a length UNIT (px/rpx/em/rem/%, case-insensitive) may
// appear ANYWHERE in the value — flush after the colon, OR with a leading `inset`,
// OR as a 2nd+ comma clause (`0 2px 8px rgba(), 0 0 0 1px #ccc`). The clause's
// leading `0` must sit on a clause boundary (line start, `:`, `,`, or whitespace)
// so a stray `10 0 0 1px` does not match. Because a UNIT is required, the no-op
// resets (`0 0 0 0`, `none`, `0 0 0 transparent`) and a normal multi-shadow with
// NO hairline clause (`0 2px 8px rgba(), 0 4px 16px rgba()`) still do NOT fire.
// `\d*\.?\d+` also catches `.5px`. (Eval: scan_box_shadow_border_precision +
// scan_box_shadow_border_inset_multishadow.)
const BOX_SHADOW_BORDER_RE = /box-shadow:\s*(?:[^;{}]*?[,\s])?(?:inset\s+)?0\s+0\s+0\s+\d*\.?\d+(?:px|rpx|em|rem|%)/i;
// CSS property names are case-INSENSITIVE per spec, so `WORD-BREAK: BREAK-ALL`
// and `BACKDROP-FILTER: BLUR(4px)` (uppercase/mixed-case) are valid CSS and must
// still match — parity with BOX_SHADOW_BORDER_RE above (which already carries the
// `i` flag). The `i` flag also makes the VALUE part case-insensitive, so both
// `break-all` and `BREAK-ALL` match. Token shape is otherwise unchanged.
const WORD_BREAK_RE = /word-break:\s*break-all/i;
const BACKDROP_FILTER_RE = /backdrop-filter\s*:/i;

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

// strip CSS / LESS comments, preserving newlines (so line numbers stay accurate)
// and WITHOUT eating real declarations. The JS stripper is wrong for CSS: it
// treats `//` as a line comment, so the `//` inside `url(https://cdn/x.png)`
// blanks the rest of the line — silently dropping a real `box-shadow:0 0 0 1px`
// that shares that line (and `//` is not even valid `.wxss` comment syntax).
//
// Robust approach: first MASK what `//` must never split — `url(...)` (with or
// without quotes) and standalone quoted-string literals — by replacing each with
// a same-length run of spaces (length/columns preserved so later trim/snippet
// offsets are unaffected; the masked content is never needed, only the
// non-comment tokens + line/col). THEN strip genuine `/* */` block comments
// (both .wxss and .less) and genuine `//` LESS line comments on the masked text.
// A `//` that was only the scheme separator inside a now-masked url() is gone, so
// it cannot be mistaken for a comment; a genuinely commented-out workaround
// (`/* box-shadow:... */`, `// box-shadow:...`) is still blanked and never fires.
function stripCssComments(src) {
  const blank = (s) => s.replace(/[^\n]/g, " ");
  // 1. mask url(...) — quoted or bare — so its `//` and contents can't be parsed
  //    as a comment or a declaration. [^)\n] keeps the mask within one line/paren.
  let masked = src.replace(/url\(\s*(['"]?)[^)\n]*\1\s*\)/gi, (m) => blank(m));
  // 2. mask remaining quoted-string literals (e.g. content:"a//b") the same way.
  masked = masked.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m) => blank(m));
  // 3. now strip genuine comments on the masked text (no url()/string can be hit).
  let out = "";
  let i = 0;
  const n = masked.length;
  while (i < n) {
    const c = masked[i];
    const c2 = masked[i + 1];
    if (c === "/" && c2 === "*") {            // /* block */ (.wxss + .less)
      let j = masked.indexOf("*/", i + 2);
      if (j === -1) j = n; else j += 2;
      out += blank(masked.slice(i, j));
      i = j;
      continue;
    }
    if (c === "/" && c2 === "/") {            // // line comment (.less)
      let j = masked.indexOf("\n", i);
      if (j === -1) j = n;
      out += blank(masked.slice(i, j));
      i = j;
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
  // A valid-JSON ARRAY (or any non-plain-object) passes `typeof === "object"` yet
  // is not a config object — `app.json = [1,2,3]` would otherwise degrade to a
  // silent `ok:true, already_migrated:true, total:0` empty scan. Reject it with
  // the SAME structured malformed blocker the invalid-JSON path returns.
  if (appErr || !appJson || typeof appJson !== "object" || Array.isArray(appJson)) {
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
  // also include subpackage pages if declared. MERGE both spellings rather than
  // short-circuit (`subPackages || subpackages`): a config can legitimately carry
  // both keys, and a `||` would silently drop the lowercase set's overrides. Each
  // subpackage page is rooted at its own `root`.
  const subPkgs = [
    ...(Array.isArray(appJson.subPackages) ? appJson.subPackages : []),
    ...(Array.isArray(appJson.subpackages) ? appJson.subpackages : [])
  ];
  for (const sp of subPkgs) {
    if (sp && Array.isArray(sp.pages)) {
      for (const p of sp.pages) pages.push((sp.root ? sp.root.replace(/\/$/, "") + "/" : "") + p);
    }
  }
  // Dedupe the resolved page set by RESOLVED page-json PATH (not by the page
  // string), so the SAME physical page listed in both `subPackages` and
  // `subpackages` (or in `pages[]` and a subpackage) yields at most ONE override
  // finding — the contract's "one finding per page" granularity. Keyed on the
  // resolved path ONLY: legitimately-distinct pages in different subpackage roots
  // still each produce their own override (no over-collapse).
  const seenPageJson = new Set();
  for (const page of pages) {
    const pj = path.join(mpAbs, `${page}.json`);
    if (seenPageJson.has(pj)) continue;  // same resolved file already handled
    seenPageJson.add(pj);
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
  // `.wxs` is a JS-subset module language (WeChat). It is scanned with the same
  // worklet/custom_route detectors as `.js`/`.ts` so a `'worklet'` directive or a
  // `wx.worklet` / route token inside a `.wxs` is never silently dropped (the
  // rewrite-class guarantee). The CSS and WXML branches do not apply to it.
  const files = walk(mpAbs, [".wxml", ".wxss", ".less", ".js", ".ts", ".wxs"], []);
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
      // merely mentions a workaround does not create a phantom inventory row —
      // via a CSS-AWARE stripper that masks `url(...)` and string literals first,
      // so a `//` inside `url(https://…)` does NOT blank the rest of a real line.
      const styleSrc = stripCssComments(src);
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
      // flex-grid workaround: the documented flex-instead-of-grid signature is
      // `flex-wrap: wrap` PLUS an explicit `width: calc(...)` COLUMN-TRACK width (a
      // fixed-track grid forced with flex). The width MUST be a `calc(` value AND
      // must be a real column track, i.e. NOT `calc(100% - …)` — a `100%` calc is
      // a full-width container, not a grid column, and an unrelated tag-cloud
      // (`flex-wrap:wrap`) sharing a file with such a full-width container was a
      // false positive (BUG-3). A bare `calc(` anywhere (e.g.
      // `height: calc(... + env(safe-area...))`) and a plain `width: 100%` remain
      // NON-triggers; `display:flex` alone never fires. This is file-scoped (NOT
      // block-scoped): on real trees the column-width `calc(…)` is frequently a
      // SIBLING rule of the flex container (confirmed on the demo's
      // home/index.less — `.intro-sheet__features{flex-wrap:wrap}` and the column
      // `.intro-feat-card{width:calc(50% - 6rpx)}` are adjacent sibling blocks),
      // so a same-block requirement would false-NEGATIVE the genuine grid. The
      // non-100% guard kills the BUG-3 false positive without that regression.
      // Once per file (low-confidence presence heuristic — NOT rewrite-class). See
      // references/scanner-contract.md (flex_grid_workaround granularity + signature).
      const hasColumnCalcWidth = /width:\s*calc\(\s*(?!100%)/i.test(styleSrc);
      if (/flex-wrap:\s*wrap/.test(styleSrc) && hasColumnCalcWidth) {
        const idx = styleSrc.search(/flex-wrap:\s*wrap/);
        add({
          category: "flex_grid_workaround", action: "keep", severity: "low",
          file: relFile, line: lineOfIndex(styleSrc, idx), snippet: snippetAt(styleSrc, idx),
          note: "flex-wrap + calc() width used instead of display:grid (grid-view workaround); still renders under WebView — keep."
        });
      }
    }

    if ((file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".wxs")) && !name.endsWith(".d.ts")) {
      // One finding per DISTINCT matching source line (mirrors the per-occurrence
      // WXML tag loop and the per-line CSS-workaround detections). The finding
      // identity is file:line, so per-line granularity gives the migrator the
      // complete, de-duplicated site list — the skill's "flag every occurrence,
      // never silently drop one" guarantee (references/skyline-to-webview.md).
      // Dedupe is WITHIN a line only: a line matching both patterns yields one
      // worklet + one custom_route finding for that line; matching the same
      // pattern twice on one line still yields a single finding for that line.
      const cleanJs = stripJsComments(src);
      const lines = cleanJs.split("\n");
      // FILE-LEVEL worklet gate: the WEAK tokens (Easing/timing(/spring(/decay()
      // count only when the file ALSO carries a STRONG, Skyline-exclusive worklet
      // signal — otherwise a generic charting/animation lib that merely reuses
      // those bare names produces ZERO worklet findings (no phantom rewrite). The
      // STRONG signals always fire per line. Computed once per file over the
      // comment-stripped source so a strong token inside a comment does not arm
      // the weak tokens.
      const fileHasStrongWorklet = WORKLET_STRONG_RE.test(cleanJs);
      lines.forEach((ln, i) => {
        const workletHit = WORKLET_STRONG_RE.test(ln)
          || (fileHasStrongWorklet && WORKLET_WEAK_RE.test(ln));
        if (workletHit) {
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
