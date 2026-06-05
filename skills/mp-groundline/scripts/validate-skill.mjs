// Structural-completeness gate for mp-groundline.
//
// Mirrors sibling mp-cli-sup/scripts/validate-skill.mjs: required files exist,
// JSON parses, SKILL.md frontmatter + references are correct, assets identify the
// skill. It ALSO re-runs the deterministic eval harness (evals/run_all.mjs) so
// "validation" means "structure ok AND the tests are green" — not file-presence
// alone. Exits 0 on pass, 1 on any error.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

const requiredFiles = [
  "SKILL.md",
  "scripts/scan.mjs",
  "scripts/gen_migration_map.mjs",
  "scripts/validate-skill.mjs",
  "evals/run_all.mjs",
  "evals/cases.mjs",
  "rules/scan-protocol.md",
  "rules/verify-with-vince-mp.md",
  "rules/minimal-fix-protocol.md",
  "references/skyline-to-webview.md",
  "references/scanner-contract.md",
  "references/example-migration-map.md",
  "assets/eval-cases.json",
  "assets/metric-plan.json",
  "assets/release-manifest.json",
  "assets/skill-design-record.json"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`missing required file: ${file}`);
  }
}

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function parseJson(file) {
  try { return JSON.parse(read(file)); }
  catch (e) { errors.push(`${file} is not valid JSON: ${e.message}`); return null; }
}

// ── SKILL.md frontmatter + references ──
if (fs.existsSync(path.join(root, "SKILL.md"))) {
  const skill = read("SKILL.md");
  const fm = skill.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) {
    errors.push("SKILL.md missing YAML frontmatter");
  } else {
    if (!/^name:\s*mp-groundline\s*$/m.test(fm[1])) {
      errors.push("SKILL.md frontmatter name must be mp-groundline");
    }
    const dm = fm[1].match(/^description:\s*(?:>\s*\n([\s\S]*)|(.+))$/m);
    const desc = dm ? (dm[1] || dm[2] || "").replace(/\s+/g, " ").trim() : "";
    if (desc.length < 80) errors.push("SKILL.md description is missing or too short");
    // trigger surface must mention both directions of disambiguation
    if (!/webview/i.test(desc) || !/skyline/i.test(desc)) {
      errors.push("SKILL.md description must mention both Skyline and WebView");
    }
  }
  for (const ref of [
    "rules/scan-protocol.md",
    "rules/verify-with-vince-mp.md",
    "rules/minimal-fix-protocol.md",
    "references/skyline-to-webview.md",
    "references/scanner-contract.md",
    "scripts/scan.mjs",
    "scripts/gen_migration_map.mjs"
  ]) {
    if (!skill.includes(ref)) errors.push(`SKILL.md must reference ${ref}`);
  }
  if (!/vince-mp/.test(skill)) {
    errors.push("SKILL.md must mention the system vince-mp CLI (verify step)");
  }
  // do-not-use disambiguation against the 4 adjacent skills
  for (const sib of ["vince-mp-cli-sup", "skyline-"]) {
    if (!skill.includes(sib)) errors.push(`SKILL.md must disambiguate from ${sib}`);
  }
  if (skill.split(/\r?\n/).length > 260) {
    errors.push("SKILL.md should stay compact (< 260 lines)");
  }
}

// ── eval-cases.json: 4 must_activate + 4 must_not_activate ──
const evalCases = parseJson("assets/eval-cases.json");
if (evalCases) {
  if (!Array.isArray(evalCases.cases) || evalCases.cases.length < 8) {
    errors.push("assets/eval-cases.json must contain at least 8 trigger cases (4 + 4)");
  } else {
    const act = evalCases.cases.filter((c) => c.expected_activation === "must_activate").length;
    const neg = evalCases.cases.filter((c) => c.expected_activation === "must_not_activate").length;
    if (act < 4) errors.push(`expected >=4 must_activate cases, got ${act}`);
    if (neg < 4) errors.push(`expected >=4 must_not_activate cases, got ${neg}`);
    for (const c of evalCases.cases) {
      if (!c.id || !c.task_zh || !Array.isArray(c.acceptance_criteria)) {
        errors.push(`invalid trigger case shape: ${c.id || "<missing id>"}`);
      }
    }
  }
}

// ── asset identity ──
for (const file of ["assets/skill-design-record.json", "assets/metric-plan.json", "assets/release-manifest.json"]) {
  const parsed = parseJson(file);
  if (parsed) {
    const id = String(parsed.skill_id || parsed.skill?.id || "");
    if (!id.includes("mp-groundline")) errors.push(`${file} must identify mp-groundline`);
  }
}

// ── re-run the deterministic eval harness (the real gate) ──
const harness = spawnSync(process.execPath, [path.join(root, "evals/run_all.mjs")], { encoding: "utf8" });
if (harness.status !== 0) {
  errors.push(`deterministic eval harness (evals/run_all.mjs) did not pass: exit ${harness.status}`);
} else {
  const passLines = (harness.stdout.match(/^PASS /gm) || []).length;
  const failLines = (harness.stdout.match(/^FAIL /gm) || []).length;
  if (failLines > 0) errors.push(`eval harness reported ${failLines} FAIL line(s)`);
  if (passLines < 16) errors.push(`eval harness produced only ${passLines} PASS lines (expected >=16)`);
}

// ── sanity: scanner detects the worklet fixture as a rewrite (smoke) ──
try {
  const { scan } = await import(path.join(root, "scripts/scan.mjs"));
  const r = scan(path.join(root, "tests/fixtures/worklet"));
  const hasRewrite = (r.findings || []).some((f) => f.category === "worklet" && f.action === "rewrite");
  if (!hasRewrite) errors.push("scanner smoke failed: worklet fixture did not yield a worklet rewrite finding");
  const clean = scan(path.join(root, "tests/fixtures/clean-workaround"));
  if (clean.summary.rewrite !== 0) errors.push("scanner smoke failed: clean-workaround fixture produced a false rewrite");
} catch (e) {
  errors.push(`scanner smoke threw: ${e.message}`);
}

if (errors.length > 0) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log("skill validation passed");
