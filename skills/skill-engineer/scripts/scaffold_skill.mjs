#!/usr/bin/env node
// Deterministically scaffold a skill's directory skeleton from a guidance
// handoff-spec, so the engineer doesn't fumble boilerplate. It creates dirs and
// a SKILL.md stub seeded from the spec's intent + recommended trigger; it never
// overwrites existing content without --force. The engineer fills the real
// content — this only removes the mechanical setup.
//
// Usage:
//   node scripts/scaffold_skill.mjs <target-dir> [--spec <handoff-spec.json>] [--altitude lite|full] [--force]

import fs from "node:fs";
import path from "node:path";

function fail(m) { console.error(m); process.exit(2); }

const args = process.argv.slice(2);
let targetArg = null, specPath = null, altitude = null, force = false;
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--spec") specPath = args[++i];
  else if (a === "--altitude") altitude = args[++i];
  else if (a === "--force") force = true;
  else targetArg = a;
}
if (!targetArg) fail("Usage: node scripts/scaffold_skill.mjs <target-dir> [--spec <spec.json>] [--altitude lite|full] [--force]");

const targetDir = path.resolve(targetArg);
let spec = null;
if (specPath) {
  try { spec = JSON.parse(fs.readFileSync(path.resolve(specPath), "utf8")); }
  catch (e) { fail(`Could not read spec ${specPath}: ${e.message}`); }
}
altitude = altitude ?? spec?.altitude ?? "full";
if (!["lite", "full"].includes(altitude)) fail(`--altitude must be lite|full, got ${altitude}`);

const name = spec?.target?.name ?? path.basename(targetDir);
const intent = spec?.intent?.summary ?? "<one sentence: what this skill lets an agent do>";
const triggers = (spec?.intent?.triggers_observed ?? []).filter(Boolean);
const triggerLine = triggers.length
  ? `Use this when ${triggers.map((t) => `"${t}"`).join(", ")}.`
  : `Use this when <add explicit trigger phrases here>.`;
const protocol = spec?.recommended_design?.protocol ?? "<preflight -> steps -> verify -> report>";

// Directory skeleton. rules/ + evals/ always. At lite, only add scripts/ when a
// control actually needs one, and references/ only when the design has resources
// or an evidence base — so a small skill doesn't get empty noise dirs.
const resources = (spec?.recommended_design?.resources ?? []).filter(Boolean);
const evidence = String(spec?.recommended_design?.evidence_base ?? "");
const wantsReferences = resources.length > 0 || (evidence && !/^\s*n\/?a/i.test(evidence));
// A skill whose mechanism is deterministic needs scripts/ even at lite and even
// when the controls are phrased behaviorally ("deterministic", "read-only") —
// verification-harness mandates the mechanism live in scripts/. Look at the
// tests/protocol wording too, not just controls (found by the v2 live battery).
const mechanismText = [
  ...(spec?.recommended_design?.controls ?? []),
  ...(spec?.recommended_design?.tests ?? []),
  spec?.recommended_design?.protocol ?? "",
].join(" ").toLowerCase();
const wantsScripts = altitude === "full" || /script|validator|schema|hook|determinis|\bcli\b|parser|harness/.test(mechanismText);
const dirs = altitude === "lite"
  ? ["rules", "evals", ...(wantsScripts ? ["scripts"] : []), ...(wantsReferences ? ["references"] : [])]
  : ["rules", "scripts", "assets", "references", "evals"];

const created = [];
const skipped = [];

fs.mkdirSync(targetDir, { recursive: true });
for (const d of dirs) {
  const p = path.join(targetDir, d);
  if (fs.existsSync(p)) skipped.push(`${d}/`);
  else { fs.mkdirSync(p, { recursive: true }); created.push(`${d}/`); }
}

const skillMd = path.join(targetDir, "SKILL.md");
const stub = `---
name: ${name}
description: >
  ${intent} ${triggerLine}
  Do NOT use for <adjacent tasks that should route elsewhere>.
---

# ${name}

<!-- ENGINEER: replace placeholders. Keep SKILL.md a thin orchestrator;
     push detail into rules/*.md and load on demand. Altitude: ${altitude}. -->

${intent}

## Steps

1. <preflight / scope check>
2. ${protocol}
3. <verify: run evals / checks>
4. <report>

## Modules

| File | When to load |
|------|--------------|
| \`rules/<name>.md\` | <when> |
`;

if (fs.existsSync(skillMd) && !force) {
  skipped.push("SKILL.md (exists; use --force to replace)");
} else {
  fs.writeFileSync(skillMd, stub);
  created.push("SKILL.md");
}

console.log(JSON.stringify({
  target: targetDir,
  altitude,
  name,
  created,
  skipped,
  next: "Engineer fills SKILL.md + rules/, writes failing eval cases under evals/, then implements to green."
}, null, 2));
