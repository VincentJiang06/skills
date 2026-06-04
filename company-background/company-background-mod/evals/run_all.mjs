#!/usr/bin/env node
// run_all.mjs — re-runnable eval harness for company-background-mod.
//
// Two layers:
//   (A) FILE-SCANNABLE invariants (adversarial_checklist 1-8, 11): runs the
//       linter MECHANISM imported from ../scripts/fact_lint.mjs against the
//       skill's own SKILL.md + references. One PASS/FAIL line per linter check.
//   (B) BEHAVIORAL routing edges (checklist 9, 10) + a positive generation case:
//       graded against recorded agent-response fixtures + written acceptance
//       (these are NOT file-scannable, so they live as behavioral cases).
//
// Prints `PASS <case>` / `FAIL <case>` lines; exits non-zero on any failure.
// The conductor re-runs THIS file; the linter is imported, never reimplemented.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lintSkill } from "../scripts/fact_lint.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(HERE, "..");

const results = []; // { id, passed, evidence }

function record(id, passed, evidence) {
  results.push({ id, passed, evidence });
}

function normalize(text) {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/[ \t 　]+/g, "");
}

// ---- (A) file-scannable linter checks -----------------------------------

const lint = lintSkill(SKILL_ROOT);
for (const c of lint.checks) {
  // Each linter check is one eval case; case id = lint:<checkId>.
  record(`lint:${c.id}`, c.ok, c.detail.split("\n")[0]);
}

// ---- (B) behavioral cases ------------------------------------------------

const casesPath = path.join(HERE, "eval-cases.json");
const casesDoc = JSON.parse(fs.readFileSync(casesPath, "utf8"));

function gradeBehavioral(tc) {
  const fixtureAbs = path.join(HERE, tc.response_fixture);
  let resp;
  try {
    resp = fs.readFileSync(fixtureAbs, "utf8");
  } catch {
    return { passed: false, evidence: `response fixture missing: ${tc.response_fixture}` };
  }
  const a = tc.acceptance;
  const fails = [];

  if (a.must_decline) {
    // a decline signal: 不/无法/不能/抱歉/属于…功能 + a routing handoff
    const declines = /(不(生成|输出|提供)|无法|不属于|属于(具体)?功能|这不是|超出|请前往|请查阅|建议(前往|查阅|使用))/.test(
      resp
    );
    if (!declines) fails.push("no decline signal");
  }
  if (Array.isArray(a.must_route_to)) {
    const routed = a.must_route_to.some((t) => resp.includes(t));
    if (!routed) fails.push(`does not route to any of [${a.must_route_to.join(", ")}]`);
  }
  if (Array.isArray(a.must_contain_all)) {
    for (const s of a.must_contain_all) {
      if (!normalize(resp).includes(normalize(s))) fails.push(`missing required: "${s}"`);
    }
  }
  if (Array.isArray(a.must_not_contain_any)) {
    for (const s of a.must_not_contain_any) {
      if (normalize(resp).includes(normalize(s))) fails.push(`contains forbidden: "${s}"`);
    }
  }
  if (typeof a.max_chars === "number") {
    if (resp.trim().length > a.max_chars)
      fails.push(`too long: ${resp.trim().length} > ${a.max_chars} chars`);
  }

  return {
    passed: fails.length === 0,
    evidence: fails.length === 0 ? "all acceptance predicates hold" : fails.join("; "),
  };
}

for (const tc of casesDoc.behavioral_cases) {
  const r = gradeBehavioral(tc);
  record(tc.id, r.passed, r.evidence);
}

// ---- (C) mutation cases (red-first regression locks) ---------------------
//
// Each case copies the WHOLE skill to a throwaway temp dir (`cp -r`), applies
// the EXACT mutation a battery used, lints the COPY, and asserts the named
// linter check went FAIL on the copy. The real skill content is never touched.
// A case PASSES iff the linter CAUGHT the mutation (named check === FAIL on the
// copy). If the buggy linter wrongly stayed PASS, the case reports FAIL with a
// "MUTATION NOT CAUGHT" message — the genuine red-first signal.

function applyEdits(rootDir, edits) {
  for (const e of edits) {
    const abs = path.join(rootDir, e.file);
    const before = fs.readFileSync(abs, "utf8");
    if (!before.includes(e.find)) {
      throw new Error(`edit anchor not found in ${e.file}: ${JSON.stringify(e.find)}`);
    }
    // Replace ALL occurrences of the literal anchor (no regex semantics).
    const after = before.split(e.find).join(e.replace);
    fs.writeFileSync(abs, after, "utf8");
  }
}

function gradeMutation(mc) {
  let tmp;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fact-lint-mut-"));
    const copyRoot = path.join(tmp, "skill");
    // `cp -r` the whole skill into the temp dir, then mutate ONLY the copy.
    execFileSync("cp", ["-r", SKILL_ROOT, copyRoot]);
    try {
      applyEdits(copyRoot, mc.edits);
    } catch (err) {
      return { passed: false, evidence: `SETUP ERROR: ${err.message}` };
    }
    const lintRes = lintSkill(copyRoot);
    const target = lintRes.checks.find((c) => c.id === mc.expects_check);
    if (!target) {
      return { passed: false, evidence: `SETUP ERROR: no linter check "${mc.expects_check}"` };
    }
    // Caught == the named check FAILED on the mutated copy.
    const caught = target.ok === false;
    return {
      passed: caught,
      evidence: caught
        ? `mutation caught: lint check ${mc.expects_check} FAIL on copy — ${target.detail.split("\n")[0]}`
        : `MUTATION NOT CAUGHT: lint check ${mc.expects_check} stayed PASS on mutated copy (expected FAIL)`,
    };
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  }
}

for (const mc of casesDoc.mutation_cases || []) {
  const r = gradeMutation(mc);
  record(mc.id, r.passed, r.evidence);
}

// ---- (D) green-guard cases (false-positive locks) ------------------------
//
// The dual of a mutation case: copy the skill, apply an edit that adds VALID
// content (or no edit), lint the COPY, and assert the named check(s) STAY
// PASS (ok === true). A green-guard PASSES iff the linter did NOT false-positive
// on legitimate content. This pins the MUST-GREEN set (e.g. the since-founding
// idiom "自成立以来…2020 年", as-of "截至约 2025 年", cue-less timeline bullets)
// so a future over-eager regex that re-introduces a false positive turns it red.

function gradeGreenGuard(gc) {
  let tmp;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fact-lint-green-"));
    const copyRoot = path.join(tmp, "skill");
    execFileSync("cp", ["-r", SKILL_ROOT, copyRoot]);
    try {
      applyEdits(copyRoot, gc.edits || []);
    } catch (err) {
      return { passed: false, evidence: `SETUP ERROR: ${err.message}` };
    }
    const lintRes = lintSkill(copyRoot);
    const checkIds = [gc.expects_check, ...(gc.also_green_checks || [])];
    const fired = [];
    for (const id of checkIds) {
      const target = lintRes.checks.find((c) => c.id === id);
      if (!target) {
        return { passed: false, evidence: `SETUP ERROR: no linter check "${id}"` };
      }
      if (target.ok !== true) fired.push(`${id}: ${target.detail.split("\n")[0]}`);
    }
    const passed = fired.length === 0;
    return {
      passed,
      evidence: passed
        ? `no false positive: ${checkIds.join(", ")} stayed PASS on valid content`
        : `FALSE POSITIVE: check(s) wrongly FAILED on valid content → ${fired.join(" | ")}`,
    };
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  }
}

for (const gc of casesDoc.green_guard_cases || []) {
  const r = gradeGreenGuard(gc);
  record(gc.id, r.passed, r.evidence);
}

// ---- report --------------------------------------------------------------

let failed = 0;
for (const r of results) {
  if (!r.passed) failed += 1;
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.id} — ${r.evidence}`);
}
const total = results.length;
console.log(`\nrun_all: ${total - failed}/${total} cases passed`);
process.exit(failed === 0 ? 0 : 1);
