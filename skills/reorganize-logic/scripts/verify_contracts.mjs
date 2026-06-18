#!/usr/bin/env node
// verify_contracts.mjs — the deterministic gate for reorganize-logic.
//
// Cross-checks a gate-parseable interfaces.md (the documented design contract)
// against the code's grep-extracted PUBLIC SURFACE, and decides PASS / FAIL /
// FLAG. It is the load-bearing mechanism: every contract the skill emits must
// PASS this before the legacy is touched.
//
// THE ANCHOR: a pure grep/heuristic gate CANNOT prove semantic faithfulness, so
// it never rubber-stamps. It does three things only a deterministic check does
// well — tie each documented symbol to a real definition (ORPHAN / BAD_SOURCE_REF),
// prove no exported symbol was silently dropped (COVERAGE_HOLE), and refuse to be
// gamed (CONTRADICTION / EXCESSIVE_EXCLUSIONS) — and for everything ambiguous it
// raises a NEEDS_RECONCILE *flag* that BLOCKS the gate until the agent fixes the
// contract. Flags are the "agent must reconcile" handoff; they are never an
// auto-pass. (develop-principle: principle.executable_acceptance,
// principle.claim_evidence_traceability, anti_pattern.reward_hacking.)
//
// Usage:
//   node scripts/verify_contracts.mjs <project-root> [--scope <subdir>] [--contract <path>]
//   cat interfaces.md | node scripts/verify_contracts.mjs <project-root> --stdin
//
// Programmatic (what evals/run_all.mjs imports — the SAME logic, not a copy):
//   import { validate } from "./verify_contracts.mjs"
//   validate({ contractText, files, scope, exclusions }) ->
//     { ok, fails:[{tag,symbol,detail}], flags:[{tag,symbol,detail}], coverage:{documented,excluded,extracted,ratio} }
//
// Deterministic & idempotent: a pure function of its inputs — no clock, no
// random, no hidden state, sorted outputs. Never throws on bad input; malformed
// input yields a graceful ok:false with a named fail.

// ---- surface extraction ---------------------------------------------------
// Coverage and matching use EXACT symbol-name equality (Set membership over the
// names the matchers capture), so `id` can never be "covered" by `uuid`/`idx`/
// `valid` — the word boundary is the regex capture itself, not a substring scan.

const NAME = "[A-Za-z_$][\\w$]*";

// Each entry: a per-line matcher returning { names:[...], confidence }.
// Order matters only for readability; we collect from every matcher that hits.
const SURFACE_MATCHERS = [
  // --- JS / TS strong exports ---
  { re: new RegExp(`^\\s*export\\s+default\\s+(?:async\\s+)?function\\s+(${NAME})`), conf: "strong" },
  { re: new RegExp(`^\\s*export\\s+(?:async\\s+)?function\\*?\\s+(${NAME})`), conf: "strong" },
  { re: new RegExp(`^\\s*export\\s+(?:const|let|var)\\s+(${NAME})`), conf: "strong" },
  { re: new RegExp(`^\\s*export\\s+(?:abstract\\s+)?class\\s+(${NAME})`), conf: "strong" },
  { re: new RegExp(`^\\s*export\\s+(?:type|interface|enum)\\s+(${NAME})`), conf: "strong" },
  { re: new RegExp(`^\\s*module\\.exports\\.(${NAME})\\s*=`), conf: "strong" },
  { re: new RegExp(`^\\s*exports\\.(${NAME})\\s*=`), conf: "strong" },
  // computed string-key assignment: exports['x'] = / module.exports["x"] =
  { re: new RegExp(`^\\s*(?:module\\.)?exports\\[['"](${NAME})['"]\\]\\s*=`), conf: "strong" },
  // Object.defineProperty(exports|module.exports, 'x', …)
  { re: new RegExp(`Object\\.defineProperty\\(\\s*(?:module\\.)?exports\\s*,\\s*['"](${NAME})['"]`), conf: "strong" },
  // --- Python top-level (col 0, public = no leading underscore) ---
  { re: new RegExp(`^(?:async\\s+)?def\\s+(${NAME})`), conf: "strong" },
  { re: new RegExp(`^class\\s+(${NAME})`), conf: "strong" },
  // --- Go exported (uppercase first letter) ---
  { re: new RegExp(`^func\\s+(?:\\([^)]*\\)\\s+)?([A-Z]\\w*)`), conf: "strong" },
  // --- Java / C# members ---
  { re: new RegExp(`^\\s*(?:public|protected)\\s+(?:static\\s+)?(?:[\\w<>\\[\\],?.]+\\s+)+(${NAME})\\s*\\(`), conf: "strong" },
  // --- weak: top-level function declaration with no export keyword (CommonJS) ---
  { re: new RegExp(`^(?:async\\s+)?function\\*?\\s+(${NAME})`), conf: "weak" },
];

// Split on `sep` only at bracket depth 0 (so commas inside (), [], {} don't split).
function splitTopLevel(s, sep) {
  const out = [];
  let depth = 0,
    cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// Names bound by `export const|let|var <decls>` — handles MULTI-declarator
// (`export const a = 1, b = 2`) and simple destructuring (`export const {a, b} = x`).
function exportDeclNames(line) {
  const m = line.match(/^\s*export\s+(?:const|let|var)\s+(.+)$/);
  if (!m) return [];
  const out = [];
  for (let seg of splitTopLevel(m[1], ",")) {
    seg = seg.trim();
    if (!seg) continue;
    if (seg[0] === "{" || seg[0] === "[") {
      const inner = seg.replace(/^[[{]/, "").replace(/[\]}].*$/, "");
      for (const piece of inner.split(",")) {
        const p = piece.trim();
        if (!p) continue;
        const rn = p.split(":");
        const name = (rn[1] || rn[0]).trim().replace(/[^A-Za-z_$\w].*$/, "");
        if (/^[A-Za-z_$][\w$]*$/.test(name)) out.push(name);
      }
    } else {
      const idm = seg.match(/^([A-Za-z_$][\w$]*)/);
      if (idm) out.push(idm[1]);
    }
  }
  return out;
}

// Return the inner text of the brace block whose `{` is at openIdx, scanning
// (possibly across newlines) to the matching `}`. Unbalanced → take the rest.
function balancedBraceBody(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(openIdx + 1, i);
    }
  }
  return s.slice(openIdx + 1);
}

// Split a brace/list body into top-level (depth-0) comma segments, each with its
// offset back into `body`. Nested (), [], {} never cause a split.
function topLevelSegments(body) {
  const segs = [];
  let depth = 0,
    segStart = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (i === body.length || (ch === "," && depth === 0)) {
      segs.push({ text: body.slice(segStart, i), off: segStart });
      segStart = i + 1;
    } else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
  }
  return segs;
}

function lineOf(content, absIdx) {
  return content.slice(0, absIdx).split("\n").length;
}

// Whole-content (multi-line-aware) extraction of object-literal CommonJS exports:
//   module.exports = { a, b: ..., c }     and     Object.assign(module.exports|exports, { ... })
// Brace-BALANCED capture + depth-aware split, so a nested `{}`/`[]`/`()` value never
// truncates or hides keys that follow it. Each key is attributed to its real line.
function objectMemberName(segText) {
  const lead = segText.match(/^\s*['"]?/)[0].length;
  const rest = segText.slice(lead);
  if (!rest.trim()) return null; // empty / trailing comma — nothing to drop
  // Spread (`...x`) re-exports an unenumerable surface, and a computed key (`[k]`)
  // has a runtime-determined name — neither is statically knowable, so FAIL-CLOSED:
  // flag (block), never silently skip (which would let an undocumented export pass).
  if (rest.startsWith("...")) return { flag: true, detail: "object spread '...' — unenumerable re-export" };
  if (rest.startsWith("[")) return { flag: true, detail: "computed key '[…]' — runtime-determined name" };
  const stripped = rest.replace(/^(?:(?:async|get|set|static)\s+)+/, "").replace(/^\*\s*/, "");
  const idm = stripped.match(/^([A-Za-z_$][\w$]*)/);
  if (idm) return { name: idm[1] };
  return { flag: true, detail: rest.trim().slice(0, 40) };
}

function objectExportKeys(content) {
  const keys = [];
  const flags = [];
  const re = /(?:module\.exports\s*=\s*|Object\.assign\(\s*(?:module\.)?exports\s*,\s*)\{/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const open = m.index + m[0].length - 1; // index of the '{'
    const body = balancedBraceBody(content, open);
    for (const seg of topLevelSegments(body)) {
      const mn = objectMemberName(seg.text);
      if (!mn) continue;
      const lead = seg.text.length - seg.text.replace(/^\s*/, "").length;
      const line = lineOf(content, open + 1 + seg.off + lead);
      if (mn.flag) flags.push({ tag: "UNPARSED_EXPORT", symbol: null, line, detail: `object export member not resolvable to a name: '${mn.detail}'` });
      else if (!mn.name.startsWith("_")) keys.push({ name: mn.name, line });
    }
  }
  return { keys, flags };
}

// Whole-content (multi-line-aware) named export lists: `export { a, b as c }`,
// `export type { T }`, and re-exports `export { a } from './x'`. The exported
// name is the binding after `as` when present. Cannot nest braces, but CAN span
// lines, so a per-line regex would silently drop multi-line members.
function namedExportLists(content) {
  const out = [];
  const re = /\bexport\s+(?:type\s+)?\{/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const open = m.index + m[0].length - 1;
    const body = balancedBraceBody(content, open);
    for (const seg of topLevelSegments(body)) {
      const t = seg.text.trim();
      if (!t) continue;
      const as = t.split(/\s+as\s+/);
      const idm = (as[1] || as[0]).trim().match(/^([A-Za-z_$][\w$]*)/);
      if (!idm) continue;
      const name = idm[1];
      if (name === "default" || name.startsWith("_")) continue;
      const lead = seg.text.length - seg.text.replace(/^\s*/, "").length;
      out.push({ name, line: lineOf(content, open + 1 + seg.off + lead) });
    }
  }
  return out;
}

// ES module-namespace re-exports:
//   export * as ns from './m'   -> the namespace object `ns` is itself a public name
//   export * from './m'         -> re-exports every NAME of './m' (resolved in phase 2)
function starExports(content) {
  const named = [];
  const stars = [];
  let m;
  const asRe = /\bexport\s*\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"][^'"]+['"]/g;
  while ((m = asRe.exec(content)) !== null) named.push({ name: m[1], line: lineOf(content, m.index) });
  const bareRe = /\bexport\s*\*\s+from\s*['"]([^'"]+)['"]/g;
  while ((m = bareRe.exec(content)) !== null) stars.push({ spec: m[1], line: lineOf(content, m.index) });
  return { named, stars };
}

function inScope(path, scope) {
  if (!scope) return true;
  const s = String(scope).replace(/\/+$/, "");
  return path === s || path.startsWith(s + "/");
}


// Resolve a RELATIVE module specifier against `fromPath` to a key in `files`.
// External (non-`.`) specs return null (surface unknowable here -> flagged).
function resolveSpec(fromPath, spec, files) {
  if (!spec.startsWith(".")) return null;
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const stack = [];
  for (const p of (dir + "/" + spec).split("/")) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  const base = stack.join("/");
  for (const e of ["", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"]) if (base + e in files) return base + e;
  for (const e of [".js", ".mjs", ".cjs", ".ts"]) if (base + "/index" + e in files) return base + "/index" + e;
  return null;
}

// The DIRECT public surface a single file declares (no cross-file resolution yet).
function directSurface(content) {
  const entries = [];
  const flags = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const names = [];
    let confidence = "weak";
    for (const mm of SURFACE_MATCHERS) {
      const hit = line.match(mm.re);
      if (hit && hit[1]) {
        names.push(hit[1]);
        if (mm.conf === "strong") confidence = "strong";
      }
    }
    const decls = exportDeclNames(line);
    if (decls.length) {
      for (const n of decls) names.push(n);
      confidence = "strong";
    }
    for (const name of names) if (!name.startsWith("_")) entries.push({ name, line: i + 1, confidence });
  }
  const obj = objectExportKeys(content);
  for (const k of obj.keys) entries.push({ name: k.name, line: k.line, confidence: "strong" });
  for (const f of obj.flags) flags.push(f);
  for (const k of namedExportLists(content)) entries.push({ name: k.name, line: k.line, confidence: "strong" });
  const star = starExports(content);
  for (const k of star.named) entries.push({ name: k.name, line: k.line, confidence: "strong" });
  return { entries, flags, stars: star.stars };
}

// Extract the public surface from a {path: content} file map, within scope, with
// `export * from` re-exports RESOLVED across files. Returns { surface, flags }.
// FAIL-CLOSED: any export construct we cannot resolve to a concrete name (an
// unresolvable `export * from`, an unparseable object member) becomes a blocking
// FLAG -- never a silent drop, so an undocumented export can never quietly pass.
function extractSurface(files, scope) {
  const paths = Object.keys(files).sort();
  const direct = {};
  for (const path of paths) {
    const content = files[path];
    if (typeof content === "string") direct[path] = directSurface(content);
  }
  const surface = [];
  const flags = [];
  const seen = new Set();
  const addEntry = (name, file, line, confidence) => {
    const key = name + " " + file + " " + line;
    if (seen.has(key)) return;
    seen.add(key);
    surface.push({ name, file, line, confidence });
  };
  const collectStars = (originPath, edges, visited, depth) => {
    for (const edge of edges) {
      const target = resolveSpec(originPath, edge.spec, files);
      if (!target || !direct[target]) {
        flags.push({ tag: "STAR_REEXPORT", symbol: null, detail: "cannot enumerate 'export * from \"" + edge.spec + "\"' at " + originPath + ":" + edge.line + " -- external/missing module; document its re-exported surface explicitly" });
        continue;
      }
      if (visited.has(target) || depth > 12) continue;
      visited.add(target);
      for (const e of direct[target].entries) addEntry(e.name, target, e.line, e.confidence);
      collectStars(target, direct[target].stars, visited, depth + 1);
    }
  };
  for (const path of paths) {
    if (!inScope(path, scope) || !direct[path]) continue;
    for (const e of direct[path].entries) addEntry(e.name, path, e.line, e.confidence);
    for (const f of direct[path].flags) flags.push({ tag: f.tag, symbol: f.symbol, detail: path + ":" + f.line + " -- " + f.detail });
    collectStars(path, direct[path].stars, new Set([path]), 1);
  }
  return { surface, flags };
}

// ---- contract parsing -----------------------------------------------------

// Parse a gate-parseable interfaces.md:
//  - documented rows:  | `name` | `signature` | `path:line` |
//  - exclusions:       under a "## Intentionally internal" heading, `- `name` — reason`
function parseContract(contractText) {
  const documented = [];
  const exclusions = [];
  const lines = String(contractText).split("\n");
  let section = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#")) {
      section = line.replace(/^#+\s*/, "").toLowerCase();
      continue;
    }
    // table row: split on | and look for a source-ref cell `path:line`
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.length < 2) continue;
      // skip header / separator rows
      if (cells.every((c) => /^[-:\s]*$/.test(c))) continue;
      if (/^symbol$/i.test(cells[0].replace(/`/g, "").trim())) continue;
      const name = cells[0].replace(/`/g, "").trim();
      const srcCell = cells[cells.length - 1].replace(/`/g, "").trim();
      const srm = srcCell.match(/^(.+):(\d+)$/);
      if (/^[A-Za-z_$][\w$]*$/.test(name) && srm) {
        documented.push({ name, file: srm[1].trim(), line: parseInt(srm[2], 10) });
      }
      continue;
    }
    // exclusions list item under an "internal" section
    if (section.includes("internal") && /^[-*]\s+/.test(line)) {
      const m = line.match(/`([A-Za-z_$][\w$]*)`/);
      if (m) exclusions.push({ name: m[1] });
    }
  }
  return { documented, exclusions };
}

// ---- the gate -------------------------------------------------------------

const EXCLUSION_RATIO_CEILING = 0.5;

function sortIssues(arr) {
  return arr
    .slice()
    .sort((a, b) =>
      (a.tag + " " + (a.symbol || "")).localeCompare(b.tag + " " + (b.symbol || ""))
    );
}

export function validate(input) {
  const fails = [];
  const flags = [];
  let coverage = { documented: 0, excluded: 0, extracted: 0, ratio: 1 };
  try {
    const obj = input && typeof input === "object" ? input : {};
    const { contractText, scope } = obj;
    const files = obj.files && typeof obj.files === "object" ? obj.files : {};

    if (typeof contractText !== "string") {
      fails.push({ tag: "MALFORMED", symbol: null, detail: "contractText must be a string" });
      return { ok: false, fails: sortIssues(fails), flags, coverage };
    }

    const parsed = parseContract(contractText);
    // allow caller to override/augment exclusions (spec contract), else use parsed
    const exclusions =
      Array.isArray(obj.exclusions) && obj.exclusions.length
        ? obj.exclusions.map((x) => (typeof x === "string" ? { name: x } : x)).filter((x) => x && x.name)
        : parsed.exclusions;
    const documented = parsed.documented;

    if (documented.length === 0 && exclusions.length === 0) {
      fails.push({ tag: "EMPTY_CONTRACT", symbol: null, detail: "no documented interfaces and no exclusions parsed" });
      return { ok: false, fails: sortIssues(fails), flags, coverage };
    }

    const { surface, flags: extractionFlags } = extractSurface(files, scope);
    for (const f of extractionFlags) flags.push(f); // fail-closed: STAR_REEXPORT / UNPARSED_EXPORT block
    const surfaceByName = new Map();
    for (const s of surface) {
      if (!surfaceByName.has(s.name)) surfaceByName.set(s.name, []);
      surfaceByName.get(s.name).push(s);
    }
    const surfaceNames = [...surfaceByName.keys()].sort();
    const documentedNames = new Set(documented.map((d) => d.name));
    const exclusionNames = new Set(exclusions.map((x) => x.name));

    // 1) resolve each documented entry against the surface
    for (const d of documented) {
      if (!(d.file in files)) {
        fails.push({ tag: "BAD_SOURCE_REF", symbol: d.name, detail: `cited file '${d.file}' not found in scope` });
        continue;
      }
      const locs = surfaceByName.get(d.name);
      if (locs && locs.length) {
        const match = locs.some((l) => l.file === d.file && l.line === d.line);
        if (!match) {
          const at = locs.map((l) => `${l.file}:${l.line}`).join(", ");
          fails.push({ tag: "BAD_SOURCE_REF", symbol: d.name, detail: `cited ${d.file}:${d.line}, but defined at ${at}` });
        }
      } else {
        // not in the extracted surface — orphan, or a near-name typo to reconcile
        const near = surfaceNames.find(
          (s) => s !== d.name && (s.includes(d.name) || d.name.includes(s)) && Math.min(s.length, d.name.length) >= 3
        );
        if (near) {
          flags.push({ tag: "NEEDS_RECONCILE", symbol: d.name, detail: `no exact definition; near-name '${near}' present — typo or wrong symbol?` });
        } else {
          fails.push({ tag: "ORPHAN", symbol: d.name, detail: "documented but no matching definition in scope" });
        }
      }
    }

    // 2) coverage: every surface symbol must be documented or excluded (exact name)
    let covered = 0;
    for (const name of surfaceNames) {
      if (documentedNames.has(name) || exclusionNames.has(name)) {
        covered++;
      } else {
        fails.push({ tag: "COVERAGE_HOLE", symbol: name, detail: "exported in code but neither documented nor marked intentionally-internal" });
      }
    }

    // 3) anti-gaming on the exclusions
    for (const x of exclusions) {
      const locs = surfaceByName.get(x.name);
      if (locs && locs.some((l) => l.confidence === "strong")) {
        fails.push({ tag: "CONTRADICTION", symbol: x.name, detail: "listed intentionally-internal but the code clearly exports it" });
      }
    }
    const excludedInSurface = [...exclusionNames].filter((n) => surfaceByName.has(n)).length;
    if (surfaceNames.length > 0 && excludedInSurface / surfaceNames.length > EXCLUSION_RATIO_CEILING) {
      fails.push({
        tag: "EXCESSIVE_EXCLUSIONS",
        symbol: null,
        detail: `${excludedInSurface}/${surfaceNames.length} of the public surface is marked intentionally-internal (> ${EXCLUSION_RATIO_CEILING}) — the contract is gaming coverage`,
      });
    }

    coverage = {
      documented: documentedNames.size,
      excluded: exclusionNames.size,
      extracted: surfaceNames.length,
      ratio: surfaceNames.length === 0 ? 1 : covered / surfaceNames.length,
    };
  } catch (e) {
    return {
      ok: false,
      fails: sortIssues([{ tag: "MALFORMED", symbol: null, detail: "unexpected: " + (e && e.message) }].concat(fails)),
      flags: sortIssues(flags),
      coverage,
    };
  }

  const sFails = sortIssues(fails);
  const sFlags = sortIssues(flags);
  return { ok: sFails.length === 0 && sFlags.length === 0, fails: sFails, flags: sFlags, coverage };
}

// ---- CLI ------------------------------------------------------------------

const CODE_EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".go", ".java", ".cs", ".rb", ".php", ".rs"]);
const SKIP_DIR = new Set(["node_modules", ".git", "dist", "build", "coverage", ".loop", ".cache", "vendor", "__pycache__"]);

async function readTree(root, rel, files, fs, path) {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name) || e.name.startsWith(".skill-") || r === "docs/contracts") continue;
      await readTree(root, r, files, fs, path);
    } else if (e.isFile() && CODE_EXT.has(path.extname(e.name))) {
      try {
        files[r] = await fs.readFile(path.join(root, r), "utf8");
      } catch { /* skip unreadable */ }
    }
  }
}

async function main() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes("-h") || argv.includes("--help")) {
    console.log("usage: node scripts/verify_contracts.mjs <project-root> [--scope <subdir>] [--contract <path>] [--stdin]");
    process.exit(2);
  }
  const root = argv[0];
  const scope = argReadVal(argv, "--scope");
  const contractPath = argReadVal(argv, "--contract") || path.join(root, "docs/contracts/interfaces.md");

  let contractText;
  if (argv.includes("--stdin")) {
    contractText = await readStdin();
  } else {
    try {
      contractText = await fs.readFile(contractPath, "utf8");
    } catch {
      console.error(`FAIL — cannot read contract: ${contractPath}`);
      process.exit(1);
    }
  }

  const files = {};
  await readTree(root, scope || "", files, fs, path);

  const r = validate({ contractText, files, scope });
  for (const f of r.fails) console.log(`FAIL  [${f.tag}] ${f.symbol || ""} — ${f.detail}`);
  for (const f of r.flags) console.log(`FLAG  [${f.tag}] ${f.symbol || ""} — ${f.detail} (agent must reconcile)`);
  const cov = r.coverage;
  console.log(`\ncoverage: ${cov.documented} documented / ${cov.excluded} excluded / ${cov.extracted} extracted — ratio ${cov.ratio.toFixed(3)}`);
  if (r.ok) {
    console.log("PASS — contract matches the code surface (0 fails, 0 unreconciled flags)");
    process.exit(0);
  }
  console.log(`\nNOT PASSING — ${r.fails.length} fail(s), ${r.flags.length} flag(s) to reconcile`);
  process.exit(1);
}

function argReadVal(argv, key) {
  const i = argv.indexOf(key);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}
function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
  });
}

// run as CLI only when invoked directly (not when imported by the harness)
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
