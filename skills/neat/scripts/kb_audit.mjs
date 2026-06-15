#!/usr/bin/env node
// kb_audit.mjs — deterministic anti-bloat / anti-rot linter for a knowledge base.
//
// Encodes neat-freak's prose invariants (SKILL.md 第零步/第四步) as machine-checkable
// gates so "sync complete" can block on objective evidence instead of an eyeballed
// `wc -l` / `grep` / `du`. The mechanism lives HERE and is IMPORTED by the eval
// harness (evals/run_all.mjs) — never duplicated there.
//
//   import { auditKb } from "scripts/kb_audit.mjs";
//   const { violations, hardFail, skipped, summary } = auditKb(projectDir);
//
// CLI:
//   node scripts/kb_audit.mjs <projectDir> [--json]
//   prints the JSON report and exits non-zero iff any HARD gate is violated.
//
// ── Gates ──────────────────────────────────────────────────────────────────
//   memory_index_bytes      HARD  MEMORY.md <= 25000 bytes (INCLUSIVE: 25000 PASS, 25001 FAIL)
//   memory_index_lines      HARD  MEMORY.md <= 200 lines  (INCLUSIVE: 200 PASS, 201 FAIL)
//   single_memory_lines     SOFT  any single memory .md <= 100 lines (101+ warns)
//   claude_md_size          SOFT  CLAUDE.md/AGENTS.md ~ <=300 lines / <=15000 bytes
//   claude_md_missing       SOFT  code-bearing project with no CLAUDE.md/AGENTS.md
//   relative_time_leakage   SOFT  standalone relative-time token in PROSE (code-block + substring EXEMPT)
//   memory_docs_inversion   SOFT  sum(memory bytes) STRICTLY > sum(docs bytes)  (equal is fine)
//   memory_index_broken_link HARD MEMORY.md index link to a missing file (anchor-strip + ./-normalize + unicode-safe)
//
// Whichever size ceiling trips first is reported; both can fire if both exceed.
// "Skipped" gates (no memory layer / no docs/) are recorded in `skipped`, never
// crash, never a false violation.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── tunable thresholds (INCLUSIVE upper bounds) ──────────────────────────────
export const LIMITS = {
  MEMORY_INDEX_BYTES: 25000,   // <= PASS, > FAIL  (HARD)
  MEMORY_INDEX_LINES: 200,     // <= PASS, > FAIL  (HARD)
  SINGLE_MEMORY_LINES: 100,    // <= PASS, > SOFT-warn
  CLAUDE_MD_LINES: 300,        // <= PASS, > SOFT-warn
  CLAUDE_MD_BYTES: 15000,      // <= PASS, > SOFT-warn
};

// ── relative-time tokens ─────────────────────────────────────────────────────
// English: case-insensitive WORD-BOUNDARY standalone tokens.
const EN_TIME = ["today", "yesterday", "tomorrow", "recently", "currently", "lately", "nowadays"];
// CJK: negative-lookaround so a LONGER word does not match (最近 must NOT fire in
// 最近期 / 今天天气-as-substring). Per the spec's resolved policy: a standalone
// relative-time token in prose fires, but a substring inside a longer ideographic
// word does not. We guard with (a) a negative lookbehind blocking a directly
// prefixed CJK char that would make the token a tail of a longer word, and (b) a
// curated negative lookahead of EXTENSION chars that form a known longer term
// (期/限/来/况…), so 最近期 is exempt while 最近 in flowing prose still fires.
const CJK_TIME = ["今天", "昨天", "明天", "刚刚", "刚才", "最近", "上周", "上个月", "目前"];
// chars that, appended, turn a time token into a DIFFERENT longer term -> exempt
const CJK_EXTEND = "期限来况期间内外度年代";

// ── helpers ──────────────────────────────────────────────────────────────────
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function byteLen(p) { try { return fs.statSync(p).size; } catch { return 0; } }
function read(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }

// line count: number of \n-separated lines. A file with content but no trailing
// newline still counts its last line. Matches `awk END{print NR}` semantics.
function lineCount(content) {
  if (content.length === 0) return 0;
  const n = content.split("\n").length;
  // a trailing newline produces a final empty element we should not count
  return content.endsWith("\n") ? n - 1 : n;
}

// recursively list files under dir (skip node_modules/.git), returns absolute paths
function listFiles(dir, acc = []) {
  if (!isDir(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) listFiles(full, acc);
    else if (ent.isFile()) acc.push(full);
  }
  return acc;
}

// sum of byte sizes of every .md under a dir (0 if dir absent)
function sumMdBytes(dir) {
  if (!isDir(dir)) return 0;
  return listFiles(dir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .reduce((s, f) => s + byteLen(f), 0);
}

// ── memory-layer resolution ──────────────────────────────────────────────────
// A project "has a memory layer" iff a memory/ dir with a MEMORY.md exists, OR a
// top-level MEMORY.md exists. Returns { memDir, memoryIndex } or null.
function resolveMemory(projectDir) {
  const candidates = [
    path.join(projectDir, "memory"),
    projectDir, // some layouts keep MEMORY.md at root
  ];
  for (const dir of candidates) {
    const idx = path.join(dir, "MEMORY.md");
    if (isFile(idx)) return { memDir: dir, memoryIndex: idx };
  }
  return null;
}

// ── relative-time leakage scan (prose-only; code-block + substring exempt) ────
// Returns an array of { token, line, snippet } prose hits.
export function scanRelativeTimeLeakage(content) {
  const hits = [];
  const lines = content.split("\n");
  let inFence = false;
  // build EN regex: word boundaries, case-insensitive, global
  const enRe = new RegExp(`\\b(${EN_TIME.join("|")})\\b`, "gi");
  // CJK: a token matches when it is NOT the tail of a longer word (no CACHED CJK
  // prefix that forms a known longer term) and NOT immediately followed by an
  // EXTENSION char that forms a different longer term (最近期 -> exempt). Bare
  // prose 最近 (followed by a verb/space/punct) still fires.
  const cjkRes = CJK_TIME.map((t) => ({
    token: t,
    re: new RegExp(`${t}(?![${CJK_EXTEND}])`, "g"),
  }));

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    // fenced code block toggle (``` or ~~~ at line start, allowing indentation)
    if (/^\s*(```|~~~)/.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue; // EXEMPT: inside fenced code block

    // EN word-boundary matches
    let m;
    enRe.lastIndex = 0;
    while ((m = enRe.exec(raw)) !== null) {
      hits.push({ token: m[1].toLowerCase(), line: i + 1, snippet: raw.trim().slice(0, 80) });
    }
    // CJK lookaround matches
    for (const { token, re } of cjkRes) {
      re.lastIndex = 0;
      if (re.test(raw)) {
        hits.push({ token, line: i + 1, snippet: raw.trim().slice(0, 80) });
      }
    }
  }
  return hits;
}

// ── MEMORY.md index link extraction + resolution ─────────────────────────────
// Pull markdown links [text](target). Normalize: strip #anchor, strip leading ./,
// decodeURI for unicode-safe paths. Skip external (http(s)://, mailto:) links.
export function extractIndexLinks(content) {
  const links = [];
  const re = /\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let target = m[1].trim();
    if (/^(https?:|mailto:|#)/i.test(target)) continue; // external or pure anchor
    // strip #anchor and ?query
    target = target.split("#")[0].split("?")[0];
    if (!target) continue;
    // strip leading ./
    target = target.replace(/^\.\//, "");
    let decoded = target;
    try { decoded = decodeURIComponent(target); } catch { /* keep raw */ }
    links.push({ raw: m[1].trim(), target: decoded });
  }
  return links;
}

// ── the audit ────────────────────────────────────────────────────────────────
export function auditKb(projectDir) {
  const violations = [];
  const skipped = [];
  const add = (gate, severity, file, detail) => violations.push({ gate, severity, file, detail });
  const skip = (gate, reason) => skipped.push({ gate, reason });

  const root = path.resolve(projectDir);

  // ---- memory layer gates ----
  const mem = resolveMemory(root);
  if (!mem) {
    skip("memory_index_bytes", "skipped: no memory layer");
    skip("memory_index_lines", "skipped: no memory layer");
    skip("single_memory_lines", "skipped: no memory layer");
    skip("memory_index_broken_link", "skipped: no memory layer");
    skip("relative_time_leakage", "skipped: no memory layer");
  } else {
    const { memDir, memoryIndex } = mem;
    const idxRel = path.relative(root, memoryIndex) || "MEMORY.md";

    // size gates on MEMORY.md (whichever-first reported; both fire if both over)
    const bytes = byteLen(memoryIndex);
    if (bytes > LIMITS.MEMORY_INDEX_BYTES) {
      add("memory_index_bytes", "HARD", idxRel,
        `MEMORY.md is ${bytes} bytes (> ${LIMITS.MEMORY_INDEX_BYTES} HARD ceiling; the overflow is silently dropped from context)`);
    }
    const lc = lineCount(read(memoryIndex));
    if (lc > LIMITS.MEMORY_INDEX_LINES) {
      add("memory_index_lines", "HARD", idxRel,
        `MEMORY.md is ${lc} lines (> ${LIMITS.MEMORY_INDEX_LINES} HARD ceiling)`);
    }

    // single memory file line ceiling (soft) — every .md in memDir except MEMORY.md
    const memFiles = listFiles(memDir).filter((f) =>
      f.toLowerCase().endsWith(".md") && path.basename(f) !== "MEMORY.md");
    for (const f of memFiles) {
      const flc = lineCount(read(f));
      if (flc > LIMITS.SINGLE_MEMORY_LINES) {
        add("single_memory_lines", "SOFT", path.relative(root, f),
          `memory file is ${flc} lines (> ${LIMITS.SINGLE_MEMORY_LINES} soft advisory; split/promote)`);
      }
    }

    // relative-time leakage across all memory .md (index + linked + loose)
    for (const f of [memoryIndex, ...memFiles]) {
      const hits = scanRelativeTimeLeakage(read(f));
      for (const h of hits) {
        add("relative_time_leakage", "SOFT", path.relative(root, f),
          `relative-time token "${h.token}" in prose (line ${h.line}): ${h.snippet}`);
      }
    }

    // broken index links (HARD) — anchor/./-normalized + unicode-safe
    const links = extractIndexLinks(read(memoryIndex));
    for (const link of links) {
      const resolved = path.resolve(memDir, link.target);
      if (!exists(resolved)) {
        add("memory_index_broken_link", "HARD", idxRel,
          `dangling index link: ${link.target} (raw "${link.raw}") does not resolve`);
      }
    }
  }

  // ---- CLAUDE.md / AGENTS.md gates ----
  const claudePaths = ["CLAUDE.md", "AGENTS.md"].map((n) => path.join(root, n));
  const presentClaude = claudePaths.filter(isFile);
  if (presentClaude.length === 0) {
    // advisory missing only if the project is "code-bearing"
    if (isCodeBearing(root)) {
      add("claude_md_missing", "SOFT", null,
        "no CLAUDE.md/AGENTS.md in a code-bearing project — missing, consider creating (advisory)");
    } else {
      skip("claude_md_size", "skipped: no CLAUDE.md/AGENTS.md and project not code-bearing");
    }
  } else {
    for (const cp of presentClaude) {
      const cb = byteLen(cp);
      const cl = lineCount(read(cp));
      if (cb > LIMITS.CLAUDE_MD_BYTES || cl > LIMITS.CLAUDE_MD_LINES) {
        add("claude_md_size", "SOFT", path.relative(root, cp),
          `${path.basename(cp)} is ${cl} lines / ${cb} bytes (> ~${LIMITS.CLAUDE_MD_LINES} lines / ${LIMITS.CLAUDE_MD_BYTES} bytes soft advisory; trim history/narrative)`);
      }
    }
  }

  // ---- memory-vs-docs size inversion (SOFT, strictly-greater only) ----
  const docsDir = path.join(root, "docs");
  if (!isDir(docsDir)) {
    skip("memory_docs_inversion", "skipped: no docs/");
  } else if (!mem) {
    skip("memory_docs_inversion", "skipped: no memory layer");
  } else {
    const memBytes = sumMdBytes(mem.memDir);
    const docsBytes = sumMdBytes(docsDir);
    if (memBytes > docsBytes) {
      add("memory_docs_inversion", "SOFT", null,
        `memory bytes (${memBytes}) strictly exceed docs bytes (${docsBytes}) — promote stable knowledge into docs/`);
    }
  }

  const hardFail = violations.some((v) => v.severity === "HARD");
  const summary = aggregate(violations, skipped, hardFail);
  return { violations, hardFail, skipped, summary };
}

// project is "code-bearing" if it has source files (not just markdown/config)
function isCodeBearing(root) {
  const codeExt = new Set([".js", ".mjs", ".ts", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".rb", ".php", ".c", ".cpp", ".cs", ".swift", ".kt"]);
  const files = listFiles(root).slice(0, 2000);
  return files.some((f) => codeExt.has(path.extname(f).toLowerCase()));
}

// ── metrics aggregate (for the metrics pillar) ───────────────────────────────
export function aggregate(violations, skipped, hardFail) {
  const hardCount = violations.filter((v) => v.severity === "HARD").length;
  const softCount = violations.filter((v) => v.severity === "SOFT").length;
  const leakageCount = violations.filter((v) => v.gate === "relative_time_leakage").length;
  // HARD gates we evaluate (excludes skipped). A gate "passes" if no HARD vio for it.
  const HARD_GATES = ["memory_index_bytes", "memory_index_lines", "memory_index_broken_link"];
  const skippedGates = new Set((skipped || []).map((s) => s.gate));
  const evaluatedHard = HARD_GATES.filter((g) => !skippedGates.has(g));
  const failedHard = new Set(violations.filter((v) => v.severity === "HARD").map((v) => v.gate));
  const hardPassed = evaluatedHard.filter((g) => !failedHard.has(g)).length;
  const hardPassRate = evaluatedHard.length === 0 ? 1 : hardPassed / evaluatedHard.length;
  return {
    hardFail,
    hardViolations: hardCount,
    softViolations: softCount,
    leakageCount,
    hardGatesEvaluated: evaluatedHard.length,
    hardGatesPassed: hardPassed,
    hardGatePassRate: Math.round(hardPassRate * 1000) / 1000,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) {
    console.error("Usage: node scripts/kb_audit.mjs <projectDir> [--json]");
    process.exit(2);
  }
  const report = auditKb(dir);
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(report.hardFail ? 1 : 0);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
