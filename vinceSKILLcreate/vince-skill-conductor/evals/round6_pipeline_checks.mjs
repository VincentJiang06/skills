#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const failures = [];

const zipperRel = "vince-skill-zipper";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function json(rel) {
  return JSON.parse(read(rel));
}

function check(name, predicate, detail) {
  if (predicate) {
    console.log(`PASS ${name}`);
  } else {
    failures.push(`${name}: ${detail}`);
    console.log(`FAIL ${name} -- ${detail}`);
  }
}

function assertCheck(name, fn, detail) {
  try {
    check(name, Boolean(fn()), detail);
  } catch (error) {
    check(name, false, `${detail}: ${error.message}`);
  }
}

function measureAlwaysTokens(skillDir) {
  const script = path.join(root, zipperRel, "scripts/measure_tokens.py");
  const proc = childProcess.spawnSync("python3", [script, path.join(root, skillDir), "--json"], {
    encoding: "utf8"
  });
  if (proc.status !== 0) {
    throw new Error(`measure_tokens failed for ${skillDir}: ${proc.stderr || proc.stdout}`);
  }
  return JSON.parse(proc.stdout).totals.always.tokens;
}

function validChecklistEntry(entry) {
  if (typeof entry !== "string") return false;
  const [input, expected, ...extra] = entry.split("→");
  return extra.length === 0 && typeof expected === "string"
    && input.trim().length > 0
    && expected.trim().length > 0;
}

function validateChecklistCoverage(spec, report) {
  const need = spec.recommended_design?.adversarial_checklist ?? [];
  const evalPassed = new Map((report.tests?.eval_cases ?? []).map((c) => [c.id, c.passed === true]));
  const coverage = report.tests?.checklist_coverage ?? [];
  return need.every((edge) => {
    const hit = coverage.find((c) => c.edge === edge);
    return hit && hit.passed === true && evalPassed.get(hit.case_id) === true;
  });
}

function documentedEGateOutput(spec, report, targetDir = null) {
  return runDocumentedEGate(spec, report, targetDir).text;
}

function runDocumentedEGate(spec, report, targetDir = null) {
  const line = pipelineLoop.split(/\r?\n/).find((l) => (
    l.startsWith("node -e \"") && l.includes("actions_resolved")
  ));
  if (!line) throw new Error("could not find documented E gate node command");
  const code = line.match(/^node -e "([\s\S]+)" <target>/)?.[1];
  if (!code) throw new Error("could not extract documented E gate node code");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "round6-e-gate-"));
  const reportPath = path.join(tmp, "build-report.json");
  const specPath = path.join(tmp, "handoff-spec.json");
  fs.writeFileSync(reportPath, JSON.stringify(report));
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const args = ["-e", code, reportPath, specPath];
  if (targetDir) args.push(targetDir);
  const proc = childProcess.spawnSync("node", args, {
    encoding: "utf8"
  });
  return { text: `${proc.stdout}${proc.stderr}`, status: proc.status };
}

function documentedGGateOutput(spec) {
  const line = pipelineLoop.split(/\r?\n/).find((l) => (
    l.startsWith("node -e \"") && l.includes("G gate ok")
  ));
  if (!line) throw new Error("could not find documented G gate node command");
  const code = line.match(/^node -e "([\s\S]+)" <target>/)?.[1];
  if (!code) throw new Error("could not extract documented G gate node code");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "round6-g-gate-"));
  const specPath = path.join(tmp, "handoff-spec.json");
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const proc = childProcess.spawnSync("node", ["-e", code, specPath], {
    encoding: "utf8"
  });
  return `${proc.stdout}${proc.stderr}`;
}

function validRedLog(text) {
  return /^FAIL\s+\S+/m.test(text) && !/ERR_MODULE_NOT_FOUND|Cannot find module/i.test(text);
}

function validateScriptHarness(report, targetDir) {
  const v = report.verification ?? {};
  if (v.harness_ran !== true || !v.harness_path || !/^PASS\s+\S+/m.test(v.command_output ?? "")) {
    return false;
  }
  const harnessPath = path.join(targetDir, v.harness_path);
  if (!fs.existsSync(harnessPath)) return false;
  const runner = harnessPath.endsWith(".py") ? "python3" : "node";
  const proc = childProcess.spawnSync(runner, [harnessPath], { encoding: "utf8" });
  return proc.status === 0 && /^PASS\s+\S+/m.test(proc.stdout);
}

function minVerdict(...verdicts) {
  const rank = { draft: 0, candidate: 1, industrial: 2 };
  return verdicts.reduce((min, verdict) => rank[verdict] < rank[min] ? verdict : min, verdicts[0]);
}

function validQualityMin(log) {
  const q = log.quality ?? {};
  if (!q.re_audit_verdict || !q.battery_verdict || !q.effective_verdict) return false;
  return q.effective_verdict === minVerdict(q.re_audit_verdict, q.battery_verdict);
}

const buildReportSchema = json("vince-skill-engineer/assets/build-report.schema.json");
const conductorLogSchema = json("vince-skill-conductor/assets/conductor-log.schema.json");
const handoffSchema = json("vince-skill-guidance/assets/handoff-spec.schema.json");
const handoffExample = json("vince-skill-guidance/assets/handoff-spec.example.json");
const pipelineLoop = read("vince-skill-conductor/rules/pipeline-loop.md");
const finalAcceptance = read("vince-skill-conductor/rules/final-acceptance.md");
const conductorSkill = read("vince-skill-conductor/SKILL.md");
const zipperSkill = read(`${zipperRel}/SKILL.md`);
const zipperVerification = read(`${zipperRel}/rules/verification-checklist.md`);
const zipperDiffScript = `${zipperRel}/scripts/diff_lossless.py`;

check(
  "build-report requires checklist_coverage",
  buildReportSchema.properties.tests.required.includes("checklist_coverage"),
  "tests.required must include checklist_coverage so E gate coverage is not advisory"
);

check(
  "conductor-log requires quality verdict object",
  conductorLogSchema.required.includes("quality"),
  "top-level required must include quality so min(re_audit,battery) is recorded"
);

check(
  "loops_taken description includes E-to-G loopbacks",
  /Stage-E.*G|E.*G loopback|design-wrong/i.test(conductorLogSchema.properties.loops_taken.description),
  "loops_taken schema description must match pipeline-loop.md and count Stage-E to G returns"
);

check(
  "handoff checklist schema mentions expected output",
  /expected correct output|expected output/i.test(handoffSchema.properties.recommended_design.properties.adversarial_checklist.description),
  "adversarial_checklist description must require expected output to catch green-but-wrong cases"
);

const checklistSchema = handoffSchema.properties.recommended_design.properties.adversarial_checklist;
check(
  "handoff checklist schema requires entries",
  checklistSchema.minItems >= 1,
  "adversarial_checklist must have minItems >= 1"
);

check(
  "handoff checklist items require expected-output delimiter",
  checklistSchema.items?.minLength >= 8 && String(checklistSchema.items?.pattern || "").includes("→"),
  "adversarial_checklist item schema must reject generic strings without an expected-output delimiter"
);

check(
  "handoff example checklist entries include expected outputs",
  handoffExample.recommended_design.adversarial_checklist.every((entry) => /=>|→/.test(entry)),
  "example adversarial_checklist entries must show input/hazard -> expected output"
);

check(
  "bad handoff checklist fixture fails oracle check",
  !["empty key"].every(validChecklistEntry),
  "generic checklist labels without expected output must fail"
);

check(
  "good handoff checklist fixture passes oracle check",
  ["empty key → preserve the literal empty-key warning"].every(validChecklistEntry),
  "checklist entries with input/hazard and expected output should pass"
);

check(
  "build-report checklist_coverage schema requires entries",
  buildReportSchema.properties.tests.properties.checklist_coverage.minItems >= 1,
  "checklist_coverage must have minItems >= 1"
);

check(
  "build-report checklist_coverage item strings are nonempty",
  buildReportSchema.properties.tests.properties.checklist_coverage.items.properties.edge.minLength >= 1
    && buildReportSchema.properties.tests.properties.checklist_coverage.items.properties.case_id.minLength >= 1,
  "edge and case_id must reject empty strings"
);

check(
  "build-report verification records harness requirement",
  buildReportSchema.properties.verification.required.includes("harness_required")
    && buildReportSchema.properties.verification.properties.harness_required.type === "boolean",
  "verification must record whether executable harness evidence is required"
);

const syntheticSpec = {
  recommended_design: {
    adversarial_checklist: [
      "delimiter in key → preserve literal delimiter",
      "empty key → reject with explicit error"
    ]
  },
  prioritized_actions: [{ id: "P0-design", priority: "P0" }]
};
const goodReport = {
  built: { files_created: [], files_modified: [] },
  verification: { ran: true, all_required_passed: true, harness_required: false },
  tests: {
    totals: { passed: 2, failed: 0, total: 2 },
    eval_cases: [
      { id: "C1", passed: true },
      { id: "C2", passed: true }
    ],
    checklist_coverage: [
      { edge: syntheticSpec.recommended_design.adversarial_checklist[0], case_id: "C1", passed: true },
      { edge: syntheticSpec.recommended_design.adversarial_checklist[1], case_id: "C2", passed: true }
    ]
  },
  actions_resolved: [{ id: "P0-design", status: "done" }]
};

check(
  "checklist coverage mapping accepts complete passing report",
  validateChecklistCoverage(syntheticSpec, goodReport),
  "every checklist edge with a real passing eval case should pass"
);

check(
  "checklist coverage mapping rejects missing edge",
  !validateChecklistCoverage(syntheticSpec, {
    ...goodReport,
    tests: { ...goodReport.tests, checklist_coverage: goodReport.tests.checklist_coverage.slice(0, 1) }
  }),
  "missing checklist edge must fail the E gate"
);

check(
  "checklist coverage mapping rejects passed:false",
  !validateChecklistCoverage(syntheticSpec, {
    ...goodReport,
    tests: {
      ...goodReport.tests,
      checklist_coverage: [
        goodReport.tests.checklist_coverage[0],
        { ...goodReport.tests.checklist_coverage[1], passed: false }
      ]
    }
  }),
  "coverage entry with passed:false must fail even if totals are green"
);

check(
  "checklist coverage mapping rejects nonexistent case_id",
  !validateChecklistCoverage(syntheticSpec, {
    ...goodReport,
    tests: {
      ...goodReport.tests,
      checklist_coverage: [
        goodReport.tests.checklist_coverage[0],
        { ...goodReport.tests.checklist_coverage[1], case_id: "NO_SUCH_CASE" }
      ]
    }
  }),
  "coverage must point at an existing eval case id"
);

check(
  "checklist coverage mapping rejects failing eval case",
  !validateChecklistCoverage(syntheticSpec, {
    ...goodReport,
    tests: {
      ...goodReport.tests,
      eval_cases: [
        goodReport.tests.eval_cases[0],
        { ...goodReport.tests.eval_cases[1], passed: false }
      ]
    }
  }),
  "coverage must point at an eval case whose own passed flag is true"
);

check(
  "pipeline E gate says all five criteria",
  /PASS when all five hold/i.test(pipelineLoop),
  "pipeline-loop.md still has stale E-gate count wording"
);

check(
  "pipeline checklist command fails closed",
  /CHECKLIST GAP[\s\S]{0,500}process\.exit\(1\)/.test(pipelineLoop),
  "checklist coverage command must exit nonzero when entries are uncovered or failing"
);

check(
  "pipeline E gate evidence includes checklist coverage",
  /node -e "[\s\S]+E gate[\s\S]+checklist_coverage/.test(pipelineLoop),
  "main E-gate command/evidence must include checklist_coverage, not only ran/pass/P0"
);

assertCheck(
  "documented E gate rejects checklist trap fixture",
  () => /E gate FAIL/.test(documentedEGateOutput(syntheticSpec, {
    ...goodReport,
    tests: { ...goodReport.tests, checklist_coverage: [] }
  })),
  "documented E gate command must report FAIL when criteria 1-3 pass but checklist coverage fails"
);

assertCheck(
  "documented E gate exits nonzero on failure",
  () => runDocumentedEGate(syntheticSpec, {
    ...goodReport,
    tests: { ...goodReport.tests, checklist_coverage: [] }
  }).status !== 0,
  "documented E gate command should be CI-style fail closed, not only print FAIL"
);

assertCheck(
  "documented E gate rejects nonexistent checklist case_id",
  () => /E gate FAIL/.test(documentedEGateOutput(syntheticSpec, {
    ...goodReport,
    tests: {
      ...goodReport.tests,
      checklist_coverage: [
        goodReport.tests.checklist_coverage[0],
        { ...goodReport.tests.checklist_coverage[1], case_id: "NO_SUCH_CASE" }
      ]
    }
  })),
  "documented E gate command must join checklist_coverage.case_id to a real eval_cases entry"
);

assertCheck(
  "documented E gate rejects checklist mapped to failing eval case",
  () => /E gate FAIL/.test(documentedEGateOutput(syntheticSpec, {
    ...goodReport,
    tests: {
      ...goodReport.tests,
      eval_cases: [
        goodReport.tests.eval_cases[0],
        { ...goodReport.tests.eval_cases[1], passed: false }
      ]
    }
  })),
  "documented E gate command must reject checklist coverage whose eval case failed"
);

assertCheck(
  "documented E gate rejects script report without harness",
  () => /E gate FAIL/.test(documentedEGateOutput(syntheticSpec, {
    ...goodReport,
    built: { files_created: ["scripts/tool.mjs"], files_modified: [] },
    verification: { ran: true, all_required_passed: true, harness_required: true }
  })),
  "documented E gate command must fail script skills with no harness_ran/harness_path/PASS evidence"
);

assertCheck(
  "documented E gate accepts pure LLM report without harness",
  () => /E gate ok/.test(documentedEGateOutput(syntheticSpec, goodReport)),
  "pure LLM behavioral skills with harness_required:false and no scripts may be harness-exempt"
);

assertCheck(
  "documented E gate exits zero on success",
  () => runDocumentedEGate(syntheticSpec, goodReport).status === 0,
  "documented E gate command should exit 0 only when all five criteria hold"
);

assertCheck(
  "documented E gate accepts real passing harness at target path",
  () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "round6-e-target-good-"));
    fs.mkdirSync(path.join(tmp, "evals"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "evals/run_all.mjs"), "console.log('PASS C1 real harness');\n");
    return /E gate ok/.test(documentedEGateOutput(syntheticSpec, {
      ...goodReport,
      built: { files_created: ["scripts/tool.mjs"], files_modified: [] },
      verification: {
        ran: true,
        all_required_passed: true,
        harness_required: true,
        harness_ran: true,
        harness_path: "evals/run_all.mjs",
        command_output: "PASS C1 real harness\nEXIT:0"
      }
    }, tmp));
  },
  "documented E gate should re-run and accept a real target harness that exits 0 with PASS lines"
);

assertCheck(
  "documented E gate rejects harness that fails on rerun",
  () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "round6-e-target-bad-"));
    fs.mkdirSync(path.join(tmp, "evals"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "evals/run_all.mjs"), "console.log('PASS C1 stale report');\nprocess.exit(1);\n");
    return /E gate FAIL/.test(documentedEGateOutput(syntheticSpec, {
      ...goodReport,
      built: { files_created: ["scripts/tool.mjs"], files_modified: [] },
      verification: {
        ran: true,
        all_required_passed: true,
        harness_required: true,
        harness_ran: true,
        harness_path: "evals/run_all.mjs",
        command_output: "PASS C1 stale report\nEXIT:0"
      }
    }, tmp));
  },
  "documented E gate must not trust stale command_output when the real harness exits nonzero"
);

assertCheck(
  "same-target dogfood clears G/E/Z/final happy path",
  () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "round6-pipeline-happy-"));
    const target = path.join(tmp, "target-skill");
    const before = path.join(tmp, "before");
    fs.mkdirSync(path.join(target, "evals"), { recursive: true });
    fs.mkdirSync(before, { recursive: true });
    fs.writeFileSync(path.join(target, "SKILL.md"), "---\nname: target-skill\ndescription: Use when testing dogfood gates.\n---\n\n# target-skill\n");
    fs.copyFileSync(path.join(target, "SKILL.md"), path.join(before, "SKILL.md"));
    fs.writeFileSync(path.join(target, "evals/run_all.mjs"), "console.log('PASS C1 real harness');\n");

    const spec = {
      ...handoffExample,
      target: { ...handoffExample.target, path: target, name: "target-skill" },
      recommended_design: {
        ...handoffExample.recommended_design,
        adversarial_checklist: syntheticSpec.recommended_design.adversarial_checklist
      },
      prioritized_actions: syntheticSpec.prioritized_actions
    };
    const report = {
      ...goodReport,
      target: { path: target, name: "target-skill" },
      source_spec: { path: path.join(target, ".skill-guidance/handoff-spec.json") },
      altitude: "full",
      built: { files_created: ["scripts/tool.mjs"], files_modified: [] },
      verification: {
        ran: true,
        all_required_passed: true,
        harness_required: true,
        harness_ran: true,
        harness_path: "evals/run_all.mjs",
        command_output: "PASS C1 real harness\nEXIT:0"
      }
    };

    const z = childProcess.spawnSync("python3", [
      path.join(root, zipperDiffScript),
      before,
      target,
      "--json"
    ], { encoding: "utf8" });
    const zJson = JSON.parse(z.stdout);
    return /G gate ok/.test(documentedGGateOutput(spec))
      && /E gate ok/.test(documentedEGateOutput(spec, report, target))
      && z.status === 0
      && zJson.counts.lost === 0
      && zJson.counts.rewritten === 0
      && validQualityMin({
        quality: {
          re_audit_verdict: "industrial",
          battery_verdict: "industrial",
          effective_verdict: "industrial"
        }
      });
  },
  "one synthetic target should clear the documented G gate, documented E gate, zipper diff, and final quality min rule"
);

check(
  "red log rejects hollow failures",
  !validRedLog("EXIT:1\n") && !validRedLog("red by construction\n") && !validRedLog("Error [ERR_MODULE_NOT_FOUND]: missing\n"),
  "red logs without assertion-level FAIL lines must fail"
);

check(
  "red log accepts assertion-level failure",
  validRedLog("FAIL C1 expected sanitized output, got __stub\nEXIT:1\n"),
  "valid red log must include at least one FAIL <case> assertion line"
);

assertCheck(
  "script harness gate accepts executable harness with PASS lines",
  () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "round6-harness-good-"));
    fs.mkdirSync(path.join(tmp, "evals"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "evals/run_all.mjs"), "console.log('PASS C1 real case');\n");
    return validateScriptHarness({
      verification: {
        harness_ran: true,
        harness_path: "evals/run_all.mjs",
        command_output: "PASS C1 real case\nEXIT:0"
      }
    }, tmp);
  },
  "script skill reports must carry a real harness path and rerunnable PASS output"
);

assertCheck(
  "script harness gate rejects missing/nonrunning harness",
  () => !validateScriptHarness({
    verification: {
      harness_ran: true,
      harness_path: "evals/missing.mjs",
      command_output: "PASS C1 claimed\nEXIT:0"
    }
  }, fs.mkdtempSync(path.join(os.tmpdir(), "round6-harness-bad-"))),
  "claimed harness evidence is invalid if the harness file cannot be re-run"
);

check(
  "conductor SKILL Step 3 references executable harness",
  /harness_path|re-runs? the harness|executable harness/i.test(conductorSkill),
  "conductor SKILL.md must surface the executable-harness gate, not only the older three checks"
);

check(
  "conductor SKILL Step 3 references checklist coverage",
  /checklist_coverage|adversarial-checklist/i.test(conductorSkill),
  "conductor SKILL.md must surface the checklist coverage gate"
);

check(
  "final acceptance records min verdict",
  /effective_verdict = min\(re-audit, battery\)|may never exceed `battery_verdict`/i.test(finalAcceptance),
  "final acceptance must keep the anti-inflation min verdict rule"
);

check(
  "final acceptance run-log writing records quality",
  /Writing the run-log[\s\S]+quality[\s\S]+effective_verdict/i.test(finalAcceptance),
  "run-log writing instructions must include the quality object, not only the schema"
);

check(
  "quality min verdict rejects inflated effective_verdict",
  !validQualityMin({
    quality: {
      re_audit_verdict: "industrial",
      battery_verdict: "candidate",
      effective_verdict: "industrial"
    }
  }),
  "effective_verdict must never exceed battery_verdict"
);

check(
  "quality min verdict accepts true minimum",
  validQualityMin({
    quality: {
      re_audit_verdict: "industrial",
      battery_verdict: "candidate",
      effective_verdict: "candidate"
    }
  }),
  "effective_verdict should equal min(re_audit_verdict,battery_verdict)"
);

check(
  "zipper supports conductor pipeline mode",
  /Pipeline mode|vince-skill-conductor|Stage Z/i.test(zipperSkill),
  "zipper must resolve direct-user confirmation vs autonomous conductor Stage Z"
);

check(
  "zipper verification requires REWRITTEN classification",
  /REWRITTEN[\s\S]+classif/i.test(zipperVerification),
  "verification checklist must require every REWRITTEN line to be reviewed/classified, not only LOST"
);

assertCheck(
  "zipper diff_lossless scans scripts and fails unclassified rewrites",
  () => {
    const before = fs.mkdtempSync(path.join(os.tmpdir(), "round6-zip-before-"));
    const after = fs.mkdtempSync(path.join(os.tmpdir(), "round6-zip-after-"));
    fs.mkdirSync(path.join(before, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(after, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(before, "scripts/tool.py"), "def guard():\n    return 'must preserve exact script fact'\n");
    fs.writeFileSync(path.join(after, "scripts/tool.py"), "def guard():\n    return 'must preserve exact script fact, hardened'\n");
    const proc = childProcess.spawnSync("python3", [path.join(root, zipperDiffScript), before, after, "--json"], {
      encoding: "utf8"
    });
    const parsed = JSON.parse(proc.stdout);
    return proc.status === 1 && parsed.counts.rewritten >= 1;
  },
  "diff_lossless must include script files and return nonzero for unclassified REWRITTEN lines"
);

const budgets = {
  "vince-skill-guidance": 1700,
  "vince-skill-engineer": 1820,   // +trigger_eval (script+rule+schema) registration row
  "vince-skill-conductor": 1900,
  [zipperRel]: 1500
};

for (const [skillDir, budget] of Object.entries(budgets)) {
  const tokens = measureAlwaysTokens(skillDir);
  check(
    `always-loaded token budget ${skillDir}`,
    tokens <= budget,
    `${tokens} tokens > budget ${budget}`
  );
}

// --- Path-resolution gate: documented sibling/KB dependencies must exist on disk. Catches doc rot
//     like the renamed-away zipper path and the off-by-one develop-principle KB reference. ---
const documentedDeps = [
  "vince-skill-guidance/SKILL.md",
  "vince-skill-engineer/SKILL.md",
  "vince-skill-zipper/SKILL.md",
  "vince-skill-zipper/scripts/diff_lossless.py",
  "vince-skill-zipper/scripts/measure_tokens.py",
  "../develop-principle"            // KB lives at the repo root, one level above this pipeline root
];
for (const dep of documentedDeps) {
  check(
    `documented dependency resolves: ${dep}`,
    fs.existsSync(path.join(root, dep)),
    `referenced path '${dep}' is missing on disk (stale reference / doc rot)`
  );
}

// --- Anti-rot: the renamed-away zipper path must never reappear in these docs/assets ---
const staleZipperPath = ["chore-develop", "vince-skill-zipper"].join("-");
for (const [rel, text] of Object.entries({
  "vince-skill-conductor/SKILL.md": conductorSkill,
  "vince-skill-conductor/rules/pipeline-loop.md": pipelineLoop,
  "vince-skill-guidance/assets/handoff-spec.example.json": JSON.stringify(handoffExample)
})) {
  check(
    `no stale zipper path in ${rel}`,
    !text.includes(staleZipperPath),
    `${rel} still references the renamed-away '${staleZipperPath}' path`
  );
}

if (failures.length) {
  console.error(`\nRESULT: RED (${failures.length} failure${failures.length === 1 ? "" : "s"})`);
  process.exit(1);
}

console.log("\nRESULT: GREEN");
