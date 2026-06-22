#!/usr/bin/env node
/**
 * Battery-ledger checker for the stage-3 adversarial-hardening gate.
 *
 * Reads the defect ledger (default <repo>/.loop/mp-cli-sup-battery.json) and asserts:
 *   1. each round has the required shape: a non-empty `context` (unique across rounds, so
 *      copy-pasted/rubber-stamp rounds are rejected), a non-empty `lens`, a non-empty
 *      `attempted_breaks[]`, a boolean `clean`, and a `confirmed_defects[]`.
 *   2. the trailing run of CONSECUTIVE clean rounds (clean===true AND no confirmed_defects)
 *      is >= --consecutive N (loop-until-dry, not first-N).
 *   3. every defect confirmed in ANY round has a regressions[] entry with a note; if
 *      kind:"check" it names an added_check that is GREEN in `node scripts/run_all.mjs --json`;
 *      if kind:"doc-fix" it is accepted as battery-verified (the maker/checker audits that a
 *      machine check wasn't skipped where one was feasible).
 *
 * RED when the ledger is absent / has < N clean rounds. Exit 0 iff genuinely clean.
 * It enforces COUNT, round-shape, and regression-greenness; it cannot judge whether an
 * attack was REAL — that is the maker/checker's job.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SKILL_DIR = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(SKILL_DIR, "..", "..");

const argv = process.argv.slice(2);
const ci = argv.indexOf("--consecutive");
if (ci >= 0 && argv[ci + 1] === undefined) { console.log("FAIL --consecutive requires a positive integer"); process.exit(1); }
const NEED = ci >= 0 ? Number(argv[ci + 1]) : 3;
if (!Number.isInteger(NEED) || NEED < 1) { console.log(`FAIL --consecutive must be a positive integer (got "${argv[ci + 1]}")`); process.exit(1); }
const li = argv.indexOf("--ledger");
if (li >= 0 && argv[li + 1] === undefined) { console.log("FAIL --ledger requires a path"); process.exit(1); }
const LEDGER = li >= 0 ? path.resolve(argv[li + 1]) : path.join(REPO_ROOT, ".loop", "mp-cli-sup-battery.json");

function loadLedger() { try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); } catch { return null; } }

const ledger = loadLedger();
if (!ledger || !Array.isArray(ledger.rounds)) {
  console.log(`FAIL battery: no ledger with rounds[] at ${LEDGER} (0 clean rounds < ${NEED})`);
  process.exit(1);
}
const rounds = ledger.rounds;
const fail = [];

// 1. round shape + cross-round distinctness (anti rubber-stamp / copy-paste)
const ctxKey = (c) => String(c).replace(/[​-‍﻿­]/g, "").trim().toLowerCase();
const seen = new Set();
rounds.forEach((r, i) => {
  if (!r || typeof r !== "object") { fail.push(`round ${i}: not an object`); return; }
  if (typeof r.context !== "string" || !r.context.trim()) fail.push(`round ${i}: missing non-empty "context"`);
  else if (seen.has(ctxKey(r.context))) fail.push(`round ${i}: duplicate context "${r.context}" (rounds must be independent)`);
  else seen.add(ctxKey(r.context));
  if (typeof r.lens !== "string" || !r.lens.trim()) fail.push(`round ${i}: missing non-empty "lens"`);
  if (!Array.isArray(r.attempted_breaks) || r.attempted_breaks.length === 0) fail.push(`round ${i}: missing non-empty "attempted_breaks[]"`);
  if (typeof r.clean !== "boolean") fail.push(`round ${i}: missing boolean "clean"`);
  if (!Array.isArray(r.confirmed_defects)) fail.push(`round ${i}: missing "confirmed_defects[]"`);
});

// 2. trailing consecutive clean
let consec = 0;
for (let i = rounds.length - 1; i >= 0; i--) {
  const r = rounds[i];
  if (r && r.clean === true && Array.isArray(r.confirmed_defects) && r.confirmed_defects.length === 0) consec++;
  else break;
}
if (consec >= NEED) console.log(`PASS consecutive clean rounds: ${consec} >= ${NEED}`);
else fail.push(`only ${consec} trailing consecutive clean rounds (need ${NEED}); total rounds=${rounds.length}`);

// 3. every confirmed defect locked by a documented regression
const confirmed = rounds.flatMap((r) => (r && Array.isArray(r.confirmed_defects) ? r.confirmed_defects : []));
const regById = new Map((Array.isArray(ledger.regressions) ? ledger.regressions : []).map((x) => [x.defect_id, x]));
const newChecks = new Set(Array.isArray(ledger.new_checks) ? ledger.new_checks : []);
let passSet = null;
if (confirmed.length > 0) {
  const r = spawnSync(process.execPath, ["scripts/run_all.mjs", "--json"], { cwd: SKILL_DIR, encoding: "utf8" });
  try { passSet = new Set(JSON.parse(r.stdout).results.filter((x) => x.ok).map((x) => x.id)); } catch { passSet = new Set(); }
}
for (const d of confirmed) {
  const id = typeof d === "string" ? d : d.id;
  const reg = regById.get(id);
  if (!reg) { fail.push(`confirmed defect "${id}" has no regression entry`); continue; }
  if (!reg.note || !String(reg.note).trim()) { fail.push(`regression for "${id}" lacks a note`); continue; }
  if (reg.kind === "check") {
    if (!reg.added_check) fail.push(`regression for "${id}" is kind:check but names no added_check`);
    else if (newChecks.size === 0) fail.push(`ledger.new_checks must list the hardening-introduced checks for kind:check regressions to be verifiable`);
    else if (!newChecks.has(reg.added_check)) fail.push(`regression for "${id}" names "${reg.added_check}", not a hardening-introduced check (ledger.new_checks) — a pre-existing unrelated check cannot lock a defect`);
    else if (!passSet.has(reg.added_check)) fail.push(`regression check "${reg.added_check}" for "${id}" is not green in run_all`);
    else console.log(`PASS regression locked (check): ${id} -> ${reg.added_check}`);
  } else if (typeof reg.kind === "string" && reg.kind.trim()) {
    // non-run_all-lockable fix (doc-fix / script-fix), spot-check-verified; the maker/checker
    // audits that a machine check wasn't feasible-but-skipped, and that the fix is real.
    console.log(`PASS regression noted (${reg.kind}, maker-checker-audited): ${id}`);
  } else {
    fail.push(`regression for "${id}" needs kind:"check" (run_all-locked) or a descriptive kind + note`);
  }
}

console.log(`\nbattery: ${fail.length === 0 ? "CLEAN" : "NOT CLEAN"} (${consec} consecutive clean, ${rounds.length} rounds, ${confirmed.length} prior defects)`);
for (const f of fail) console.log(`FAIL ${f}`);
process.exit(fail.length === 0 ? 0 : 1);
