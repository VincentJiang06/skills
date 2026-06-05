// MIGRATION-MAP generator — pure transform: scan JSON → MIGRATION-MAP.md.
//
// generate(scanResult) returns a deterministic Markdown string (the headline
// user deliverable). It adds NO judgment beyond the scan: every row comes from a
// finding. Golden-snapshot testable. CLI: `node scripts/gen_migration_map.mjs
// [<root>]` scans <root> (or reads scan JSON from stdin) and prints the doc.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { scan } from "./scan.mjs";

const ACTION_LABEL = {
  mechanical: "MECHANICAL — applied automatically by the migration",
  keep: "KEEP — workaround still renders under WebView; leave as-is",
  verify: "VERIFY — may differ under WebView; confirm before/after with vince-mp",
  rewrite: "REWRITE — Skyline-exclusive, no WebView equivalent; manual rewrite"
};

// The general Skyline↔WebView correspondence (distilled from the on-disk
// skyline-* skills; see references/skyline-to-webview.md for citations).
const MAPPING_ROWS = [
  ["`renderer: \"skyline\"`", "`renderer: \"webview\"`", "mechanical", "skyline-config app-config.md"],
  ["worklet animation (`wx.worklet`, `applyAnimatedStyle`, `runOnUI`)", "`wx.createAnimation` / CSS animation / `this.animate()`", "rewrite", "skyline-overview compatibility.md (animate→worklet)"],
  ["custom route (`routeBuilder`, `wx.router`, `wx://`, `open-container`)", "default page transitions", "rewrite", "skyline-route"],
  ["`span` (inline mix)", "`flex` / `rich-text`", "rewrite", "skyline component-support.md"],
  ["`grid-view`", "`display: grid`", "rewrite", "skyline component-support.md / compatibility 速查表"],
  ["`sticky-header` / `sticky-section`", "`position: sticky`", "rewrite", "skyline component-support.md / compatibility 速查表"],
  ["`list-view`", "plain children in `scroll-view`", "rewrite", "skyline component-support.md"],
  ["`nested-scroll-*`, `draggable-sheet`, `snapshot`, `*-gesture-handler`", "movable-view / page-container / canvas / touch events", "rewrite", "skyline component-support.md"],
  ["`scroll-view type=\"list\"/\"custom\"`", "`type` ignored; still scrolls (`enhanced` available)", "keep", "skyline component-support.md"],
  ["`box-shadow: 0 0 0 Npx` as border", "`border` works", "keep", "skyline-wxss"],
  ["`word-break: break-all`", "`overflow-wrap: anywhere` works", "keep", "skyline-wxss"],
  ["`backdrop-filter`", "supported", "keep", "skyline-wxss"],
  ["`componentFramework: \"glass-easel\"`", "supported on WebView", "keep", "skyline-config app-config.md"],
  ["`rendererOptions.skyline`", "ignored by WebView", "keep/strip", "skyline-config app-config.md"],
  ["camera tap-mask", "taps may bubble", "verify", "field workaround"]
];

// Sort order for findings. Every category here is one the scanner actually
// emits (see references/scanner-contract.md). `template_precompute` is NOT
// listed: precomputed wx:if flags are kept as-is but cannot be reliably detected
// statically, so the scanner never emits that category (the contract says so too).
export const CATEGORY_ORDER = [
  "renderer_flip", "page_renderer_override", "component_framework", "renderer_options",
  "worklet", "custom_route", "skyline_component",
  "camera_mask",
  "box_shadow_border", "word_break", "backdrop_filter", "flex_grid_workaround",
  "scroll_view_type"
];

// Make any string safe to drop into a single Markdown TABLE cell. A finding's
// snippet/note is arbitrary source text, so it can carry the three characters
// that break a table row:
//   - a pipe `|`        → cell shift / extra columns   ⇒ escape to `\|`
//   - a CR/LF newline   → the row splits into two rows  ⇒ collapse to a space
//   - a backtick `` ` ``→ closes the inline-code span    ⇒ neutralize to `'`
// and unbounded length, which we cap. Order matters: collapse newlines first,
// escape pipes, neutralize backticks, THEN cap (so a cap never severs a `\|`).
const CELL_MAX = 200;
function esc(s) {
  let out = String(s == null ? "" : s)
    .replace(/[\r\n]+/g, " ")   // collapse CR / LF / CRLF to one space (row stays single-line)
    .replace(/\s{2,}/g, " ")     // squeeze runs of whitespace introduced by the above
    .replace(/\|/g, "\\|")       // escape cell-delimiter pipes
    .replace(/`/g, "'");          // neutralize backticks (would close the code span)
  if (out.length > CELL_MAX) {
    let cut = out.slice(0, CELL_MAX - 1);
    // The cap can land in the MIDDLE of an escaped `\|`, keeping the lone `\` and
    // dropping the `|` → a dangling `…\…` that would escape the following cell
    // delimiter. An ODD run of trailing backslashes means the last `\` is a
    // severed escape lead — drop it (one char) so the cell never ends in a lone
    // `\` before the ellipsis. An even run is fully-paired literal backslashes;
    // leave them intact.
    const trail = (cut.match(/\\+$/) || [""])[0].length;
    if (trail % 2 === 1) cut = cut.slice(0, -1);
    out = cut + "…";
  }
  return out;
}

function sortFindings(findings) {
  return findings.slice().sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    return (a.line || 0) - (b.line || 0);
  });
}

export function generate(scanResult) {
  const r = scanResult || {};
  const lines = [];
  const push = (s = "") => lines.push(s);

  push("# MIGRATION-MAP — Skyline → WebView");
  push("");

  if (r.ok === false) {
    push("> **BLOCKER — cannot scan this program.**");
    push("");
    push("```");
    push(String(r.error || "unknown error"));
    push("```");
    push("");
    push("Resolve the blocker (usually a missing or malformed `app.json`, or an unresolved `miniprogramRoot`) and re-run the scan.");
    push("");
    return lines.join("\n");
  }

  const rc = r.renderer_config || {};
  const summary = r.summary || {};

  // ── header / status ──
  push(`- **miniprogramRoot:** \`${esc(rc && r.miniprogramRoot)}\``);
  push(`- **Current renderer:** \`${esc(rc.renderer || "(unset → webview)")}\``);
  if (summary.already_migrated) {
    push("- **Status:** ALREADY ON WEBVIEW — no renderer flip needed. The protocol STOPS before editing; the rows below are inventory only.");
  } else {
    push("- **Status:** on Skyline — migration flips the renderer to WebView, keeps workarounds, and surfaces rewrite items below.");
  }
  push("");
  push(`- **Summary:** mechanical ${summary.mechanical || 0} · keep ${summary.keep || 0} · verify ${summary.verify || 0} · **rewrite ${summary.rewrite || 0}** · total ${summary.total || 0}`);
  push("");

  // ── config diff ──
  push("## 1. Config diff (`app.json`)");
  push("");
  push("| Field | Current (Skyline) | After (WebView) | Action |");
  push("|---|---|---|---|");
  push(`| renderer | \`${esc(rc.renderer || "(unset)")}\` | \`webview\` | ${summary.already_migrated ? "already webview" : "**flip**"} |`);
  push(`| componentFramework | \`${esc(rc.componentFramework || "(unset)")}\` | \`${esc(rc.componentFramework || "(unset)")}\` | keep (glass-easel ok on WebView) |`);
  push(`| rendererOptions.skyline | ${rc.rendererOptions && rc.rendererOptions.skyline ? "present" : "—"} | ignored | keep or strip |`);
  push(`| window.navigationStyle | \`${esc(rc.navigationStyle || "(unset)")}\` | \`${esc(rc.navigationStyle || "(unset)")}\` | keep |`);
  push(`| style | \`${esc(rc.style || "(unset)")}\` | \`${esc(rc.style || "(unset)")}\` | keep |`);
  push(`| lazyCodeLoading | \`${esc(rc.lazyCodeLoading || "(unset)")}\` | \`${esc(rc.lazyCodeLoading || "(unset)")}\` | keep |`);
  push("");
  if (Array.isArray(rc.page_overrides) && rc.page_overrides.length) {
    push("**Page-level renderer overrides (reconcile each distinctly):**");
    push("");
    for (const po of rc.page_overrides) {
      push(`- \`${esc(po.file)}\` → renderer \`${esc(po.renderer)}\` (differs from app-level)`);
    }
    push("");
  }

  // ── general mapping table ──
  push("## 2. Skyline ↔ WebView correspondence (general)");
  push("");
  push("| Skyline feature / workaround | Under WebView | Action | Source |");
  push("|---|---|---|---|");
  for (const [a, b, act, src] of MAPPING_ROWS) {
    push(`| ${a} | ${b} | ${act} | ${esc(src)} |`);
  }
  push("");

  // ── rewrite manual-review gate (up front) ──
  const rewrites = (r.findings || []).filter((f) => f.action === "rewrite");
  push("## 3. Manual-review gate — REWRITE items");
  push("");
  if (rewrites.length === 0) {
    push("None. This program has **zero** hard Skyline-only features — a clean mechanical migration.");
  } else {
    push(`${rewrites.length} Skyline-exclusive usage(s) need a manual rewrite (no WebView equivalent). Resolve these before relying on the migrated pages:`);
    push("");
    for (const f of sortFindings(rewrites)) {
      push(`- **${esc(f.file)}:${f.line}** \`${esc(f.snippet)}\` — ${esc(f.note)}`);
    }
  }
  push("");

  // ── per-finding table ──
  push("## 4. Findings (one row per detected usage)");
  push("");
  push("| File:Line | Category | Action | Snippet | Debug note |");
  push("|---|---|---|---|---|");
  for (const f of sortFindings(r.findings || [])) {
    push(`| ${esc(f.file)}:${f.line} | ${esc(f.category)} | ${esc(f.action)} | \`${esc(f.snippet)}\` | ${esc(f.note)} |`);
  }
  push("");

  // ── legend + rollback ──
  push("## 5. Legend & rollback");
  push("");
  for (const k of ["mechanical", "keep", "verify", "rewrite"]) {
    push(`- **${k}** — ${ACTION_LABEL[k]}`);
  }
  push("");
  push("**Rollback:** the migration edits a git working tree. Revert = `git checkout` of `app.json` and any touched page `.json`.");
  push("");

  return lines.join("\n");
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
  let result;
  if (root) {
    result = scan(root);
  } else {
    // read scan JSON from stdin
    const raw = fs.readFileSync(0, "utf8");
    try {
      result = JSON.parse(raw);
    } catch (e) {
      process.stderr.write(`could not parse scan JSON from stdin: ${e.message}\n`);
      process.exit(2);
    }
  }
  process.stdout.write(generate(result) + "\n");
}
