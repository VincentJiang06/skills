#!/usr/bin/env node
/**
 * Release-gate checker for mp-cli-sup. Closes the gate ONLY on real evidence:
 *
 *   1. assets/release-manifest.json release_gate.passed === true
 *   2. release_gate.evidence is a non-empty array of shell commands, and EACH
 *      exits 0 (run from the skill dir). The boolean above is NOT trusted on its
 *      own — a flipped flag with failing evidence does not close the gate.
 *   3. `node evals/run_all.mjs --self-test` still passes — a gutted/weakened
 *      harness cannot be used to close the gate.
 *
 * Designed to be RED on the untouched skill (release_gate.passed is false today),
 * GREEN only once the upgrade is real. Exit 0 iff the gate is genuinely met.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SKILL_DIR = path.resolve(import.meta.dirname, "..");
const fail = [];
const ok = [];

function readManifest() {
  try { return JSON.parse(fs.readFileSync(path.join(SKILL_DIR, "assets/release-manifest.json"), "utf8")); }
  catch (e) { return null; }
}

const manifest = readManifest();
if (!manifest) {
  console.error("FAIL release-manifest: assets/release-manifest.json missing or not JSON");
  process.exit(1);
}
const gate = manifest.release_gate || {};

// 1. passed flag
if (gate.passed === true) ok.push("release_gate.passed === true");
else fail.push(`release_gate.passed is ${JSON.stringify(gate.passed)} (gate not declared met)`);

// 2. executable evidence
const evidence = Array.isArray(gate.evidence) ? gate.evidence.filter((c) => typeof c === "string" && c.trim()) : [];
if (evidence.length === 0) {
  fail.push("release_gate.evidence must be a non-empty array of runnable shell commands");
} else {
  for (const cmd of evidence) {
    const r = spawnSync(cmd, { shell: true, cwd: SKILL_DIR, encoding: "utf8" });
    if (r.status === 0) ok.push(`evidence ok: ${cmd}`);
    else fail.push(`evidence FAILED (exit ${r.status ?? "?"}): ${cmd}${r.stderr ? " :: " + r.stderr.trim().split("\n").pop() : ""}`);
  }
}

// 3. harness still non-vacuous (anti-weakening)
const self = spawnSync(process.execPath, ["scripts/run_all.mjs", "--self-test"], { cwd: SKILL_DIR, encoding: "utf8" });
if (self.status === 0) ok.push("harness --self-test still discriminates (not weakened)");
else fail.push("harness --self-test FAILED — evals/run_all.mjs was weakened/gutted; cannot close the gate");

for (const o of ok) console.log(`PASS ${o}`);
for (const f of fail) console.log(`FAIL ${f}`);
console.log(`\nrelease gate: ${fail.length === 0 ? "MET" : "NOT MET"} (${ok.length} ok, ${fail.length} failing)`);
process.exit(fail.length === 0 ? 0 : 1);
