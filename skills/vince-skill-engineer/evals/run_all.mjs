#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";
import { computeMetrics, runTriggerEval, mockJudge, parseFrontmatter } from "../scripts/trigger_eval.mjs";

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

function conformsToTriggerSchema(report, schema) {
  const top = schema.required.every((k) => k in report);
  const conf = ["tp", "fp", "fn", "tn"].every((k) => Number.isInteger(report.confusion?.[k]));
  const met = ["precision", "recall", "accuracy"].every((k) => typeof report.metrics?.[k] === "number");
  const judgeOk = schema.properties.judge.enum.includes(report.judge);
  const cases = Array.isArray(report.cases) && report.cases.length >= 1
    && report.cases.every((c) => typeof c.id === "string" && typeof c.should_trigger === "boolean"
      && typeof c.triggered === "boolean" && ["TP", "FP", "FN", "TN"].includes(c.outcome));
  return top && conf && met && judgeOk && cases;
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

// --- trigger_eval self-test: verify the empirical trigger runner's math deterministically with
//     the mock judge (no tokens, no CLI). A green self-test proves the HARNESS works; only a real
//     `--judge cli` run proves a DESCRIPTION works. ---
const triggerSchema = JSON.parse(fs.readFileSync(path.join(skillDir, "assets/trigger-eval.schema.json"), "utf8"));
const mixedCases = [
  { id: "t1", prompt: "this is YES one",  should_trigger: true },
  { id: "t2", prompt: "no sentinel here", should_trigger: true },
  { id: "f1", prompt: "has YES word",     should_trigger: false },
  { id: "f2", prompt: "clean prompt",     should_trigger: false }
];
const mixedMetrics = computeMetrics(mixedCases, mixedCases.map((c) => mockJudge("YES")(null, null, c.prompt)));
check(
  "trigger_eval builds a confusion matrix from labels",
  mixedMetrics.confusion.tp === 1 && mixedMetrics.confusion.fp === 1
    && mixedMetrics.confusion.fn === 1 && mixedMetrics.confusion.tn === 1
    && mixedMetrics.precision === 0.5 && mixedMetrics.recall === 0.5,
  `expected 1/1/1/1 @ 0.5/0.5, got ${JSON.stringify(mixedMetrics)}`
);

const mixedReport = runTriggerEval({ name: "x", description: "x", cases: mixedCases, judge: mockJudge("YES"), threshold: 0.9 });
check(
  "trigger_eval fails a set below threshold",
  mixedReport.passed === false && mixedReport.total === 4
    && mixedReport.cases.filter((c) => c.outcome === "TP").length === 1,
  "0.5 precision/recall must not pass a 0.9 threshold"
);

const cleanReport = runTriggerEval({
  name: "x", description: "x", threshold: 0.9, judge: mockJudge("YES"),
  cases: [
    { id: "t1", prompt: "YES please", should_trigger: true },
    { id: "f1", prompt: "nope",       should_trigger: false }
  ]
});
check(
  "trigger_eval passes a perfectly-separated set",
  cleanReport.passed === true && cleanReport.metrics.precision === 1 && cleanReport.metrics.recall === 1,
  "perfect separation at threshold 0.9 must pass"
);

check(
  "trigger_eval report conforms to its schema",
  conformsToTriggerSchema(mixedReport, triggerSchema),
  "report must match assets/trigger-eval.schema.json structure"
);

const fm = parseFrontmatter("---\nname: demo-skill\ndescription: >\n  Do a thing. Use when X.\n---\n# body\n");
check(
  "trigger_eval parses name + folded description from frontmatter",
  fm.name === "demo-skill" && /Do a thing\. Use when X\./.test(fm.description),
  `frontmatter parse got ${JSON.stringify(fm)}`
);

if (failures.length) {
  console.error(`\nRESULT: RED (${failures.length} failure${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log("\nRESULT: GREEN");
