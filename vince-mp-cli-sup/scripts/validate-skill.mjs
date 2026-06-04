import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "rules/runtime-protocol.md",
  "rules/ui-element-workflow.md",
  "references/cli-contract.md",
  "references/skyline-media.md",
  "references/evidence-and-failures.md",
  "assets/eval-cases.json",
  "assets/skill-design-record.json",
  "assets/metric-plan.json",
  "assets/release-manifest.json",
  "scripts/live-smoke-existing.mjs"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`missing required file: ${file}`);
  }
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function parseJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    errors.push(`${file} is not valid JSON: ${error.message}`);
    return null;
  }
}

if (fs.existsSync(path.join(root, "SKILL.md"))) {
  const skill = read("SKILL.md");
  const match = skill.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    errors.push("SKILL.md missing YAML frontmatter");
  } else {
    const frontmatter = match[1];
    if (!/^name:\s*vince-mp-cli-sup$/m.test(frontmatter)) {
      errors.push("SKILL.md frontmatter name must be vince-mp-cli-sup");
    }
    const descriptionMatch = frontmatter.match(/^description:\s*(?:>\s*\n([\s\S]*)|(.+))$/m);
    const descriptionText = descriptionMatch
      ? (descriptionMatch[1] || descriptionMatch[2] || "").replace(/\s+/g, " ").trim()
      : "";
    if (descriptionText.length < 80) {
      errors.push("SKILL.md frontmatter description is missing or too short");
    }
  }
  if (!skill.includes("vince-mp")) {
    errors.push("SKILL.md must point to the system vince-mp command");
  }
  for (const referencedFile of [
    "rules/runtime-protocol.md",
    "rules/ui-element-workflow.md",
    "references/cli-contract.md",
    "references/skyline-media.md",
    "references/evidence-and-failures.md",
  ]) {
    if (!skill.includes(referencedFile)) {
      errors.push(`SKILL.md must reference ${referencedFile}`);
    }
  }
  if (skill.split(/\r?\n/).length > 220) {
    errors.push("SKILL.md should stay compact under 220 lines");
  }
}

if (fs.existsSync(path.join(root, "agents/openai.yaml"))) {
  const openai = read("agents/openai.yaml");
  if (!openai.includes("$vince-mp-cli-sup")) {
    errors.push("agents/openai.yaml default_prompt must mention $vince-mp-cli-sup");
  }
}

const evalCases = parseJson("assets/eval-cases.json");
if (evalCases) {
  if (!Array.isArray(evalCases.cases) || evalCases.cases.length < 4) {
    errors.push("assets/eval-cases.json must contain at least four cases");
  } else {
    const types = new Set(evalCases.cases.map((item) => item.case_type));
    for (const requiredType of ["happy_path", "boundary_path", "negative_path", "adversarial_path"]) {
      if (!types.has(requiredType)) errors.push(`missing eval case type: ${requiredType}`);
    }
    for (const item of evalCases.cases) {
      if (!item.id || !item.task_zh || !Array.isArray(item.acceptance_criteria)) {
        errors.push(`invalid eval case shape: ${item.id || "<missing id>"}`);
      }
    }
  }
}

for (const file of ["assets/skill-design-record.json", "assets/metric-plan.json", "assets/release-manifest.json"]) {
  const parsed = parseJson(file);
  if (parsed && !String(parsed.skill_id || parsed.skill?.id || "").includes("vince-mp-cli-sup")) {
    errors.push(`${file} must identify vince-mp-cli-sup`);
  }
}

const cli = process.env.VINCE_MP_CLI_BIN || "vince-mp";
const help = spawnSync(cli, ["help", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (help.status !== 0) {
  errors.push(`system vince-mp command is not available or failed: ${help.stderr || help.stdout || help.error?.message || "unknown error"}`);
} else {
  try {
    const parsed = JSON.parse(help.stdout);
    if (parsed.command !== "help" || !Array.isArray(parsed.commands) || !parsed.commands.includes("run")) {
      errors.push("system vince-mp command did not return the expected help JSON");
    }
  } catch (error) {
    errors.push(`system vince-mp help did not return JSON: ${error.message}`);
  }
}

const smokeScript = spawnSync(process.execPath, [path.join(root, "scripts/live-smoke-existing.mjs")], {
  encoding: "utf8",
});
if (smokeScript.status !== 2 || !smokeScript.stderr.includes("missing --ws-endpoint")) {
  errors.push("scripts/live-smoke-existing.mjs must fail fast with missing --ws-endpoint");
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("skill validation passed");
