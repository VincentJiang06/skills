#!/usr/bin/env node
// Deterministic structural signals for a target skill. This does NOT judge
// quality — it gives the agent cheap, objective facts (what exists, how big,
// what's wired) so the 7-pillar scorecard starts from evidence instead of a
// cold read. Output is JSON on stdout.
//
// Usage: node scripts/score_skill.mjs <skill-dir | SKILL.md path>

import fs from "node:fs";
import path from "node:path";

function fail(msg) {
  console.error(msg);
  process.exit(2);
}

const arg = process.argv[2];
if (!arg) fail("Usage: node scripts/score_skill.mjs <skill-dir | SKILL.md path>");

const target = path.resolve(arg);
if (!fs.existsSync(target)) fail(`Path does not exist: ${target}`);

const stat = fs.statSync(target);
let skillDir;
let skillMdPath;
if (stat.isDirectory()) {
  skillDir = target;
  skillMdPath = path.join(target, "SKILL.md");
} else {
  skillMdPath = target;
  skillDir = path.dirname(target);
}
if (!fs.existsSync(skillMdPath)) fail(`No SKILL.md found at: ${skillMdPath}`);

const raw = fs.readFileSync(skillMdPath, "utf8");
const lines = raw.split(/\r?\n/);

// --- frontmatter ---
let fmName = null;
let fmDescription = "";
let hasFrontmatter = false;
if (raw.startsWith("---")) {
  const end = raw.indexOf("\n---", 3);
  if (end !== -1) {
    hasFrontmatter = true;
    const fm = raw.slice(3, end);
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    if (nameMatch) fmName = nameMatch[1].trim();
    // description may be a folded block (description: > ... ) or inline
    const descBlock = fm.match(/description:\s*>([\s\S]*?)(?:\n[a-z_]+:|$)/i);
    const descInline = fm.match(/^description:\s*(.+)$/m);
    fmDescription = (descBlock ? descBlock[1] : descInline ? descInline[1] : "")
      .replace(/\s+/g, " ").trim();
  }
}

function countWords(s) {
  return (s.match(/\S+/g) ?? []).length;
}

function dirInfo(name) {
  const p = path.join(skillDir, name);
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) return { present: false, files: 0 };
  const files = fs.readdirSync(p).filter((f) => f !== ".DS_Store");
  return { present: true, files: files.length, names: files };
}

const lower = raw.toLowerCase();
function mentions(...terms) {
  return terms.some((t) => lower.includes(t));
}

const dirs = {
  rules: dirInfo("rules"),
  scripts: dirInfo("scripts"),
  references: dirInfo("references"),
  assets: dirInfo("assets"),
  evals: dirInfo("evals"),
  tests: dirInfo("tests")
};

// --- structural signals ---
const signals = {
  has_frontmatter: hasFrontmatter,
  name: fmName,
  description_words: countWords(fmDescription),
  description_has_use_when: /\buse\s+(?:this\s+)?(?:skill\s+)?(?:when|whenever)\b/i.test(fmDescription),
  description_has_donot: /do not use|don't use|not for\b/i.test(fmDescription),
  skill_md_lines: lines.length,
  body_has_numbered_steps: /^#{1,4}\s*step\s*\d|^\s*\d+\.\s/im.test(raw),
  body_has_modules_table: /\|\s*file\s*\|.*when|\|.*when to load/i.test(raw),
  mentions_triggers: mentions("trigger", "activation", "should trigger"),
  mentions_tests_or_eval: mentions("eval", "test case", "assertion", "regression", "acceptance", "trajectory") || dirs.evals.present || dirs.tests.present,
  mentions_metrics: mentions("metric", "success rate", "cost per", "pass@", "pass^"),
  mentions_controls: mentions("allowed tool", "forbidden", "permission", "human gate", "sandbox", "guardrail", "## control", "## guardrail", "halt", "decline", "must not"),
  mentions_lifecycle: mentions("version", "changelog", "deprecat", "rollback", "release gate"),
  mentions_evidence: mentions("source", "evidence", "reference", "citation", "traceab")
};

// --- cheap per-pillar structural hint (present/partial/absent). The agent
// refines these against skill-principle's rubric; they are only a seed. ---
function hint(present, partial) {
  if (present) return "present";
  if (partial) return "partial";
  return "absent";
}

const pillar_hints = {
  design: hint(
    hasFrontmatter && signals.body_has_numbered_steps && signals.description_words > 20,
    hasFrontmatter && fmDescription.length > 0
  ),
  research: hint(
    signals.mentions_evidence && dirs.references.present,
    signals.mentions_evidence
  ),
  testing: hint(
    dirs.evals.present || dirs.tests.present,
    signals.mentions_tests_or_eval
  ),
  tdd: hint(
    (dirs.evals.present || dirs.tests.present) && signals.mentions_tests_or_eval,
    signals.mentions_tests_or_eval
  ),
  metrics: hint(signals.mentions_metrics && (dirs.evals.present), signals.mentions_metrics),
  low_context_kb: hint(
    dirs.rules.present && signals.skill_md_lines <= 500,
    signals.skill_md_lines <= 500 || dirs.rules.present
  ),
  lifecycle: hint(signals.mentions_lifecycle, false)
};

const maturity = (() => {
  // stub: barely more than frontmatter. draft: real body, no test assets.
  // mature: body + at least tests/evals or rules modules.
  if (signals.skill_md_lines < 25 && !dirs.rules.present && !dirs.scripts.present) return "stub";
  const hasTestAssets = dirs.evals.present || dirs.tests.present;
  const hasModules = dirs.rules.present || dirs.references.present || dirs.scripts.present;
  if (hasTestAssets && hasModules) return "mature";
  if (hasModules || signals.skill_md_lines > 80) return "draft";
  return "draft";
})();

console.log(JSON.stringify({
  target: skillMdPath,
  skill_dir: skillDir,
  maturity_hint: maturity,
  dirs,
  signals,
  pillar_hints
}, null, 2));
