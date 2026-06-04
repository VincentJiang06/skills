#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(__dirname, "..");
const failures = [];

function pass(name) {
  console.log(`PASS ${name}`);
}

function fail(name, detail) {
  failures.push(`${name}: ${detail}`);
  console.log(`FAIL ${name} -- ${detail}`);
}

function check(name, predicate, detail) {
  if (predicate) pass(name);
  else fail(name, detail);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(skillDir, rel), "utf8"));
}

function score(target) {
  const proc = childProcess.spawnSync("node", [path.join(skillDir, "scripts/score_skill.mjs"), target], {
    encoding: "utf8"
  });
  if (proc.status !== 0) {
    throw new Error(proc.stderr || proc.stdout);
  }
  return JSON.parse(proc.stdout);
}

const schema = readJson("assets/handoff-spec.schema.json");
const example = readJson("assets/handoff-spec.example.json");
const checklistSchema = schema.properties.recommended_design.properties.adversarial_checklist;

check(
  "handoff schema requires at least one adversarial checklist entry",
  checklistSchema.minItems >= 1,
  "adversarial_checklist must not be empty"
);

check(
  "handoff schema requires expected-output delimiter",
  checklistSchema.items?.pattern === "→",
  "checklist entries must use input/hazard -> expected output format"
);

check(
  "handoff example includes expected outputs",
  example.recommended_design.adversarial_checklist.every((entry) => /→/.test(entry)),
  "example checklist entries must include an expected output/invariant"
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guidance-score-"));
fs.writeFileSync(path.join(tmp, "SKILL.md"), `---
name: whenever-trigger
description: Use this whenever the user asks to normalize a custom config file.
---

# whenever-trigger

1. Read the file.
2. Normalize it.
`);

try {
  check(
    "score_skill detects use-when style trigger descriptions",
    score(tmp).signals.description_has_use_when === true,
    "description_has_use_when should accept 'Use this whenever ...' as a trigger phrase"
  );
} catch (error) {
  fail("score_skill detects use-when style trigger descriptions", error.message);
}

if (failures.length) {
  console.error(`\nRESULT: RED (${failures.length} failure${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log("\nRESULT: GREEN");
