#!/usr/bin/env node
// validate_report.mjs — the executable E gate for a build report.
//
// Why a script: the E gate's criteria (verification ran, all green, every spec
// P0 done, every adversarial-checklist edge covered by a real passing case, an
// executable harness that still passes on RE-RUN, a genuine red log) used to
// live as a 2,000-character node -e one-liner inside conductor prose — easy to
// copy wrong, impossible to selftest. This script IS the gate: skill-engineer
// runs it before reporting done; skill-conductor runs it AS Stage E's gate.
//
// Usage:
//   node scripts/validate_report.mjs <target-dir> [--spec <path>] [--report <path>]
//        [--no-rerun] [--json]
//   node scripts/validate_report.mjs --selftest
//
// Exit 0 = report is schema-valid, consistent with the spec, and its harness
// re-runs green; 1 = gate fails; 2 = usage/IO error.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(HERE, "..", "assets", "build-report.schema.json");

// --- minimal JSON-schema subset validator (same subset as guidance's validate_spec) ---
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

export function validateSchema(schema, value, at = "$", errs = []) {
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length) {
    const actual = typeOf(value);
    const ok = types.some((t) => t === actual || (t === "number" && actual === "integer"));
    if (!ok) { errs.push(`${at}: expected ${types.join("|")}, got ${actual}`); return errs; }
  }
  if ("const" in schema && value !== schema.const) errs.push(`${at}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${at}: must be one of ${schema.enum.join("|")}`);
  if (typeof value === "string" && schema.minLength && value.length < schema.minLength) errs.push(`${at}: shorter than minLength ${schema.minLength}`);
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${at}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${at}: above maximum ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${at}: fewer than minItems ${schema.minItems}`);
    if (schema.items) value.forEach((v, i) => validateSchema(schema.items, v, `${at}[${i}]`, errs));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const k of schema.required ?? []) if (!(k in value)) errs.push(`${at}: missing required '${k}'`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) validateSchema(schema.properties[k], v, `${at}.${k}`, errs);
      else if (schema.additionalProperties === false && schema.properties) errs.push(`${at}: unknown property '${k}'`);
    }
  }
  return errs;
}

// A genuine red log shows assertion-level failure against an importable stub —
// not a missing-file crash, which only proves the file didn't exist yet.
export function validRedLog(text) {
  return /^FAIL\s+\S+/m.test(String(text)) && !/ERR_MODULE_NOT_FOUND|Cannot find module/i.test(String(text));
}

const SCRIPT_RE = /(^|\/)scripts\/.+\.(mjs|js|py|sh|ts|tsx|jsx)$/;

function runnerFor(p) {
  if (p.endsWith(".py")) return "python3";
  if (p.endsWith(".sh")) return "bash";
  return "node";
}

// --- the gate ---
export function validateReport(spec, report, targetDir, { rerun = true } = {}) {
  const errs = [];
  const warns = [];
  const t = report.tests?.totals ?? {};
  const v = report.verification ?? {};

  // 1. verification actually ran, and everything required passed
  if (v.ran !== true) errs.push("verification.ran must be true — a build whose evals never executed is a draft, not a build");
  if (v.all_required_passed !== true) errs.push("verification.all_required_passed must be true");
  if (!(t.total > 0)) errs.push("tests.totals.total must be > 0 — zero cases means nothing was verified");
  if (t.failed !== 0) errs.push(`tests.totals.failed must be 0, got ${t.failed}`);
  const cases = report.tests?.eval_cases ?? [];
  if ((t.passed ?? 0) + (t.failed ?? 0) !== (t.total ?? 0)) errs.push(`tests.totals inconsistent: ${t.passed}+${t.failed} != ${t.total}`);
  const passedCount = cases.filter((c) => c.passed === true).length;
  if (cases.length && passedCount !== t.passed) errs.push(`tests.totals.passed ${t.passed} != ${passedCount} passing eval_cases`);

  // 2. every spec P0 is done (join by id against the SPEC — the report carries no priority)
  const p0 = (spec.prioritized_actions ?? []).filter((a) => a.priority === "P0").map((a) => a.id);
  const done = new Set((report.actions_resolved ?? []).filter((a) => a.status === "done").map((a) => a.id));
  const p0done = p0.filter((id) => done.has(id));
  for (const id of p0) if (!done.has(id)) errs.push(`spec P0 action '${id}' is not done — a blocked/deferred P0 fails the gate`);

  // 3. every adversarial-checklist edge maps to an existing, passing case
  const need = spec.recommended_design?.adversarial_checklist ?? [];
  const casePassed = new Map(cases.map((c) => [c.id, c.passed === true]));
  const cov = new Map((report.tests?.checklist_coverage ?? []).map((c) => [c.edge, c]));
  let covered = 0;
  for (const edge of need) {
    const hit = cov.get(edge);
    if (!hit) errs.push(`checklist edge uncovered: '${edge}'`);
    else if (hit.passed !== true) errs.push(`checklist edge covered by a failing mapping: '${edge}'`);
    else if (casePassed.get(hit.case_id) !== true) errs.push(`checklist edge '${edge}' maps to case '${hit.case_id}' which does not exist or did not pass`);
    else covered += 1;
  }

  // 4. executable harness for any skill that ships scripts — re-run it, never
  //    trust a self-reported pass count (stale evidence is exactly the fraud
  //    this gate exists to stop)
  const touched = [...(report.built?.files_created ?? []), ...(report.built?.files_modified ?? [])];
  const scriptTouched = touched.some((f) => SCRIPT_RE.test(f));
  const hreq = v.harness_required === true || scriptTouched;
  let harness = hreq ? "FAIL" : "exempt";
  if (hreq) {
    const hp = v.harness_path || "";
    if (v.harness_ran !== true || !hp) {
      errs.push("script skill without an executable harness (verification.harness_ran/harness_path) — fail closed");
    } else if (!/^PASS\s+\S+/m.test(v.command_output ?? "")) {
      errs.push("verification.command_output has no 'PASS <case>' line — pass counts must come from a real run");
    } else {
      const full = path.join(targetDir ?? ".", hp);
      if (!fs.existsSync(full)) {
        errs.push(`harness_path '${hp}' does not exist under the target`);
      } else if (rerun) {
        const proc = childProcess.spawnSync(runnerFor(hp), [full], { encoding: "utf8", cwd: targetDir });
        if (proc.status === 0 && /^PASS\s+\S+/m.test(proc.stdout ?? "")) harness = "ok";
        else errs.push(`harness re-run failed (exit ${proc.status}) — the report's command_output is stale`);
      } else {
        harness = "ok(not-rerun)";
        warns.push("harness not re-run (--no-rerun) — the conductor's gate must re-run it");
      }
    }
  }

  // 5. a genuine red artifact. Hard for script skills; advisory for pure
  //    LLM-behavioral skills (their red is a baseline-without-skill transcript).
  let red = "n/a";
  if (targetDir) {
    const redLog = path.join(targetDir, ".skill-engineer", "red", "red.log");
    const baseline = path.join(targetDir, ".skill-engineer", "red", "baseline.md");
    if (fs.existsSync(redLog) && validRedLog(fs.readFileSync(redLog, "utf8"))) red = "ok";
    else if (fs.existsSync(baseline) && fs.readFileSync(baseline, "utf8").length >= 200) red = "baseline";
    else red = "thin";
    if (hreq && red !== "ok") {
      errs.push("no genuine red log (.skill-engineer/red/red.log with a 'FAIL <case>' line against an importable stub) — score tdd as partial at most and do not claim tests-first");
    } else if (red === "thin") {
      warns.push("red evidence thin: no red.log FAIL lines and no baseline-without-skill transcript — tdd caps at partial");
    }
  }

  const ok = errs.length === 0;
  const evidence = `ran ${v.ran === true} | pass ${t.passed ?? 0}/${t.total ?? 0} | P0 ${p0done.length}/${p0.length} | checklist ${covered}/${need.length} | harness ${harness} | red ${red}`;
  return { ok, errs, warns, evidence };
}

// --- selftest: one good build passes; each known fraud/trap fails ---
function selftest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "validate-report-"));
  const spec = {
    recommended_design: {
      adversarial_checklist: [
        "delimiter in key → preserve literal delimiter",
        "empty key → reject with explicit error",
      ],
    },
    prioritized_actions: [{ id: "A1", priority: "P0" }, { id: "A2", priority: "P1" }],
  };
  const goodReport = () => ({
    schema_version: "1.0.0",
    generated_by: "skill-engineer",
    target: { path: tmp, name: "fixture-skill" },
    source_spec: { path: "spec.json" },
    altitude: "full",
    built: { design_units: [{ unit: "tests", status: "implemented" }], files_created: ["scripts/tool.mjs"], files_modified: [] },
    tests: {
      eval_cases: [
        { id: "C1", name: "delimiter", passed: true },
        { id: "C2", name: "empty key", passed: true },
      ],
      totals: { passed: 2, failed: 0, total: 2 },
      regression_cases: [],
      trajectory_checked: true,
      checklist_coverage: [
        { edge: spec.recommended_design.adversarial_checklist[0], case_id: "C1", passed: true },
        { edge: spec.recommended_design.adversarial_checklist[1], case_id: "C2", passed: true },
      ],
    },
    actions_resolved: [{ id: "A1", status: "done" }, { id: "A2", status: "done" }],
    verification: {
      ran: true,
      all_required_passed: true,
      evidence: "2/2 from harness run",
      harness_required: true,
      harness_ran: true,
      harness_path: "evals/run_all.mjs",
      command_output: "PASS C1\nPASS C2\nEXIT:0",
    },
    handoff: { next_skill: "skill-zipper", notes: [], blocking: [] },
  });

  // real target: passing harness + genuine red log
  fs.mkdirSync(path.join(tmp, "evals"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".skill-engineer", "red"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "evals", "run_all.mjs"), "console.log('PASS C1');console.log('PASS C2');\n");
  fs.writeFileSync(path.join(tmp, ".skill-engineer", "red", "red.log"), "FAIL C1 expected x, got __stub\nFAIL C2 expected y, got __stub\nEXIT:1\n");

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  let fails = 0;
  const expect = (name, spec_, report, wantOk, errLike) => {
    const schemaErrs = validateSchema(schema, report);
    const r = validateReport(spec_, report, tmp, { rerun: true });
    const allErrs = [...schemaErrs, ...r.errs].join(" | ");
    const gotOk = schemaErrs.length === 0 && r.ok;
    const matched = errLike ? allErrs.includes(errLike) : true;
    if (gotOk === wantOk && matched) console.log(`PASS ${name}`);
    else { console.log(`FAIL ${name} -- ok=${gotOk} want=${wantOk}${errLike ? ` errLike='${errLike}' in '${allErrs}'` : ""}`); fails++; }
  };

  expect("good build passes", spec, goodReport(), true);

  const r1 = goodReport(); r1.tests.checklist_coverage = [r1.tests.checklist_coverage[0]];
  expect("trap: uncovered checklist edge fails", spec, r1, false, "uncovered");

  const r2 = goodReport(); r2.tests.checklist_coverage[1].case_id = "NO_SUCH";
  expect("trap: coverage pointing at nonexistent case fails", spec, r2, false, "does not exist");

  const r3 = goodReport();
  r3.tests.eval_cases[1].passed = false; r3.tests.totals = { passed: 1, failed: 1, total: 2 };
  expect("trap: failing eval case fails", spec, r3, false, "failed must be 0");

  const r4 = goodReport(); r4.actions_resolved[0].status = "blocked";
  expect("trap: blocked P0 fails", spec, r4, false, "P0 action 'A1'");

  const r5 = goodReport();
  delete r5.verification.harness_ran; delete r5.verification.harness_path; delete r5.verification.command_output;
  expect("trap: script skill without harness fails", spec, r5, false, "without an executable harness");

  // stale command_output: harness that now exits 1
  const staleDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-report-stale-"));
  fs.mkdirSync(path.join(staleDir, "evals"), { recursive: true });
  fs.mkdirSync(path.join(staleDir, ".skill-engineer", "red"), { recursive: true });
  fs.writeFileSync(path.join(staleDir, "evals", "run_all.mjs"), "console.log('PASS C1 stale');process.exit(1);\n");
  fs.writeFileSync(path.join(staleDir, ".skill-engineer", "red", "red.log"), "FAIL C1 stub\n");
  const r6 = goodReport();
  const r6res = validateReport(spec, r6, staleDir, { rerun: true });
  if (!r6res.ok && r6res.errs.join(" ").includes("stale")) console.log("PASS trap: stale command_output fails on re-run");
  else { console.log(`FAIL trap: stale command_output fails on re-run -- ${JSON.stringify(r6res)}`); fails++; }

  // hollow red log with harness required
  const hollowDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-report-hollow-"));
  fs.mkdirSync(path.join(hollowDir, "evals"), { recursive: true });
  fs.mkdirSync(path.join(hollowDir, ".skill-engineer", "red"), { recursive: true });
  fs.writeFileSync(path.join(hollowDir, "evals", "run_all.mjs"), "console.log('PASS C1');console.log('PASS C2');\n");
  fs.writeFileSync(path.join(hollowDir, ".skill-engineer", "red", "red.log"), "EXIT:1\n");
  const r7res = validateReport(spec, goodReport(), hollowDir, { rerun: true });
  if (!r7res.ok && r7res.errs.join(" ").includes("red log")) console.log("PASS trap: hollow red log fails for script skill");
  else { console.log(`FAIL trap: hollow red log fails for script skill -- ${JSON.stringify(r7res.errs)}`); fails++; }

  const r8 = goodReport(); r8.tests.totals = { passed: 0, failed: 0, total: 0 }; r8.tests.eval_cases = [];
  expect("trap: zero cases fails", spec, r8, false, "total must be > 0");

  console.log("");
  console.log(fails === 0 ? "PASS validate_report selftest" : `FAIL ${fails} assertion(s)`);
  process.exit(fails === 0 ? 0 : 1);
}

// --- CLI ---
function main() {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) return selftest();
  const asJson = args.includes("--json");
  const rerun = !args.includes("--no-rerun");
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const target = args.find((a) => !a.startsWith("--") && a !== get("--spec") && a !== get("--report"));
  if (!target) {
    console.error("Usage: node scripts/validate_report.mjs <target-dir> [--spec <path>] [--report <path>] [--no-rerun] [--json] | --selftest");
    process.exit(2);
  }
  const targetDir = path.resolve(target);
  const specPath = path.resolve(get("--spec") ?? path.join(targetDir, ".skill-guidance", "handoff-spec.json"));
  const reportPath = path.resolve(get("--report") ?? path.join(targetDir, ".skill-engineer", "build-report.json"));
  for (const [label, p] of [["spec", specPath], ["report", reportPath]]) {
    if (!fs.existsSync(p)) { console.error(`No ${label} at ${p}`); process.exit(2); }
  }
  let spec, report;
  try { spec = JSON.parse(fs.readFileSync(specPath, "utf8")); }
  catch (e) { console.error(`FAIL spec does not parse -- ${e.message}`); process.exit(1); }
  try { report = JSON.parse(fs.readFileSync(reportPath, "utf8")); }
  catch (e) { console.log(`FAIL report does not parse -- ${e.message}\nRESULT: RED`); process.exit(1); }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const schemaErrs = validateSchema(schema, report);
  const r = validateReport(spec, report, targetDir, { rerun });
  if (asJson) { console.log(JSON.stringify({ schemaErrs, ...r }, null, 2)); process.exit(schemaErrs.length === 0 && r.ok ? 0 : 1); }
  for (const e of schemaErrs) console.log(`FAIL schema -- ${e}`);
  for (const e of r.errs) console.log(`FAIL gate -- ${e}`);
  for (const w of r.warns) console.log(`warn ${w}`);
  const ok = schemaErrs.length === 0 && r.ok;
  console.log(`${ok ? "E gate ok" : "E gate FAIL"}: ${report.target?.name ?? targetDir} | ${r.evidence}`);
  console.log(ok ? "RESULT: GREEN" : "RESULT: RED");
  process.exit(ok ? 0 : 1);
}

const invokedDirectly = process.argv[1] && fs.existsSync(process.argv[1])
  && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
