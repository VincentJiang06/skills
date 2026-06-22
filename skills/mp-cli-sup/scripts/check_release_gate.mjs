#!/usr/bin/env node
/**
 * Release-gate checker for mp-cli-sup. Closes the gate ONLY on real evidence:
 *
 *   1. assets/release-manifest.json release_gate.passed === true (necessary, not sufficient)
 *   2. the checker itself RUNS a required core — validate-skill, scripts/run_all.mjs, and
 *      scripts/run_all.mjs --self-test — regardless of what the manifest lists, so a tampered
 *      evidence array cannot bypass the real checks, and a gutted harness (failing self-test)
 *      cannot close the gate.
 *   3. every author-declared release_gate.evidence entry is a non-empty string that is NOT
 *      trivially always-green (`true`, `:`, `... || true`, `echo ...`) and exits 0.
 *
 * RED on the untouched skill (passed:false today); GREEN only once the upgrade is real.
 * Exit 0 iff the gate is genuinely met.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SKILL_DIR = path.resolve(import.meta.dirname, "..");
const ok = [];
const fail = [];

function readManifest() {
  try { return JSON.parse(fs.readFileSync(path.join(SKILL_DIR, "assets/release-manifest.json"), "utf8")); }
  catch { return null; }
}
function runCmd(cmd) {
  return spawnSync(cmd, { shell: true, cwd: SKILL_DIR, encoding: "utf8" }).status === 0;
}
// reject evidence that can never fail (would close the gate for free)
function alwaysGreen(cmd) {
  const c = cmd.trim();
  return /^(true|:)$/.test(c) || /(\|\||;|&&)\s*(true|:)\s*$/.test(c) || /^echo(\s|$)/.test(c);
}

const manifest = readManifest();
if (!manifest) { console.log("FAIL release-manifest: missing or not JSON"); process.exit(1); }
const gate = manifest.release_gate || {};

// 1. passed flag
if (gate.passed === true) ok.push("release_gate.passed === true");
else fail.push(`release_gate.passed is ${JSON.stringify(gate.passed)} (gate not declared met)`);

// 2. required core, run by the checker itself (never trust the manifest to include it)
const REQUIRED = [
  "node scripts/validate-skill.mjs",
  "node scripts/run_all.mjs",
  "node scripts/run_all.mjs --self-test",
];
for (const cmd of REQUIRED) {
  if (runCmd(cmd)) ok.push(`required ok: ${cmd}`);
  else fail.push(`required FAILED: ${cmd}` + (cmd.includes("--self-test") ? " — harness weakened/gutted; cannot close the gate" : ""));
}

// 3. author-declared evidence — validated, then executed (skip ones already run as required)
const evidence = Array.isArray(gate.evidence) ? gate.evidence : [];
if (evidence.length === 0) fail.push("release_gate.evidence must be a non-empty array of runnable shell commands");
for (const cmd of evidence) {
  if (typeof cmd !== "string" || !cmd.trim()) { fail.push(`evidence entry is not a non-empty string: ${JSON.stringify(cmd)}`); continue; }
  if (REQUIRED.includes(cmd.trim())) { ok.push(`evidence ok (run as required): ${cmd}`); continue; }
  if (alwaysGreen(cmd)) { fail.push(`evidence entry can never fail (rejected): ${cmd}`); continue; }
  if (runCmd(cmd)) ok.push(`evidence ok: ${cmd}`);
  else fail.push(`evidence FAILED: ${cmd}`);
}

for (const o of ok) console.log(`PASS ${o}`);
for (const f of fail) console.log(`FAIL ${f}`);
console.log(`\nrelease gate: ${fail.length === 0 ? "MET" : "NOT MET"} (${ok.length} ok, ${fail.length} failing)`);
process.exit(fail.length === 0 ? 0 : 1);
