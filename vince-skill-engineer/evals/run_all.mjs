#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(skillDir, "..");
const failures = [];

function check(name, predicate, detail) {
  if (predicate) {
    console.log(`PASS ${name}`);
  } else {
    failures.push(`${name}: ${detail}`);
    console.log(`FAIL ${name} -- ${detail}`);
  }
}

function runScaffold(args) {
  const proc = childProcess.spawnSync("node", [path.join(skillDir, "scripts/scaffold_skill.mjs"), ...args], {
    encoding: "utf8"
  });
  if (proc.status !== 0) {
    throw new Error(proc.stderr || proc.stdout);
  }
  return JSON.parse(proc.stdout);
}

function exists(dir, rel) {
  return fs.existsSync(path.join(dir, rel));
}

const schema = JSON.parse(fs.readFileSync(path.join(skillDir, "assets/build-report.schema.json"), "utf8"));
const checklist = schema.properties.tests.properties.checklist_coverage;

check(
  "build-report schema gates checklist coverage",
  schema.properties.tests.required.includes("checklist_coverage")
    && checklist.minItems >= 1
    && checklist.items.properties.edge.minLength >= 1
    && checklist.items.properties.case_id.minLength >= 1,
  "checklist_coverage must be required, nonempty, and mapped to nonempty edge/case_id"
);

check(
  "build-report schema records harness requirement",
  schema.properties.verification.required.includes("harness_required")
    && schema.properties.verification.properties.harness_required.type === "boolean",
  "verification must state whether the conductor should require executable harness evidence"
);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "engineer-eval-"));
const fullTarget = path.join(tmpRoot, "full-target");
const specPath = path.join(repoRoot, "vince-skill-guidance/assets/handoff-spec.example.json");

try {
  const first = runScaffold([fullTarget, "--spec", specPath]);
  check(
    "scaffold creates full-altitude skeleton from spec",
    first.altitude === "full"
      && first.name === "vince-skill-zipper"
      && ["rules", "scripts", "assets", "references", "evals"].every((d) => exists(fullTarget, d))
      && exists(fullTarget, "SKILL.md"),
    "full scaffold must create rules/scripts/assets/references/evals and seed the spec name"
  );

  const second = runScaffold([fullTarget, "--spec", specPath]);
  check(
    "scaffold is idempotent without force",
    second.skipped.includes("SKILL.md (exists; use --force to replace)")
      && second.skipped.includes("rules/"),
    "second scaffold run must skip existing content instead of overwriting"
  );
} catch (error) {
  check("scaffold creates full-altitude skeleton from spec", false, error.message);
  check("scaffold is idempotent without force", false, error.message);
}

const liteTarget = path.join(tmpRoot, "lite-target");
try {
  const lite = runScaffold([liteTarget, "--altitude", "lite"]);
  check(
    "scaffold creates minimal lite skeleton",
    lite.altitude === "lite"
      && exists(liteTarget, "rules")
      && exists(liteTarget, "evals")
      && exists(liteTarget, "SKILL.md")
      && !exists(liteTarget, "assets")
      && !exists(liteTarget, "scripts")
      && !exists(liteTarget, "references"),
    "lite scaffold without script/resource signals should avoid empty noise dirs"
  );
} catch (error) {
  check("scaffold creates minimal lite skeleton", false, error.message);
}

if (failures.length) {
  console.error(`\nRESULT: RED (${failures.length} failure${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log("\nRESULT: GREEN");
