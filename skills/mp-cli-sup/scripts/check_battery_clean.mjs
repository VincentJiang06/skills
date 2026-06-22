#!/usr/bin/env node
/**
 * Battery-ledger checker for the stage-3 adversarial-hardening gate.
 *
 * Reads the defect ledger (default <repo>/.loop/mp-cli-sup-battery.json) and asserts:
 *   1. the trailing run of CONSECUTIVE clean rounds (clean === true AND no
 *      confirmed_defects) is >= --consecutive N (loop-until-dry, not first-N).
 *   2. every defect confirmed in ANY round has a regressions[] entry naming an
 *      added_check, and that check id is GREEN in `node evals/run_all.mjs --json`.
 *
 * Designed to be RED when the ledger is absent / has < N clean rounds (i.e. now,
 * with zero rounds). Exit 0 iff the battery is genuinely clean and every prior
 * defect is locked in by a passing regression check.
 *
 * The ledger records, per round: a fresh context id + a distinct attack lens +
 * concrete attempted breaks. This checker enforces COUNT and regression-greenness;
 * it cannot judge whether an attack was REAL — that is the maker/checker's job
 * (see the design's stage-3 passing_but_wrong + maker_checker scope).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SKILL_DIR = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(SKILL_DIR, "..", "..");

const argv = process.argv.slice(2);
const ci = argv.indexOf("--consecutive");
const NEED = ci >= 0 ? Number(argv[ci + 1]) : 3;
const li = argv.indexOf("--ledger");
const LEDGER = li >= 0 ? path.resolve(argv[li + 1]) : path.join(REPO_ROOT, ".loop", "mp-cli-sup-battery.json");

function loadLedger() {
  try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); } catch { return null; }
}

const ledger = loadLedger();
if (!ledger || !Array.isArray(ledger.rounds)) {
  console.log(`FAIL battery: no ledger with rounds[] at ${LEDGER} (0 clean rounds < ${NEED})`);
  process.exit(1);
}

const rounds = ledger.rounds;
// trailing consecutive clean
let consec = 0;
for (let i = rounds.length - 1; i >= 0; i--) {
  const r = rounds[i];
  const clean = r.clean === true && Array.isArray(r.confirmed_defects) && r.confirmed_defects.length === 0;
  if (clean) consec++; else break;
}

const fail = [];
if (consec >= NEED) console.log(`PASS consecutive clean rounds: ${consec} >= ${NEED}`);
else fail.push(`only ${consec} trailing consecutive clean rounds (need ${NEED}); total rounds=${rounds.length}`);

// every confirmed defect locked in by a green regression check
const confirmed = rounds.flatMap((r) => (Array.isArray(r.confirmed_defects) ? r.confirmed_defects : []));
const regressions = Array.isArray(ledger.regressions) ? ledger.regressions : [];
const regById = new Map(regressions.map((x) => [x.defect_id, x]));

let passSet = null;
if (confirmed.length > 0) {
  const r = spawnSync(process.execPath, ["scripts/run_all.mjs", "--json"], { cwd: SKILL_DIR, encoding: "utf8" });
  try { passSet = new Set(JSON.parse(r.stdout).results.filter((x) => x.ok).map((x) => x.id)); }
  catch { passSet = new Set(); }
}
for (const d of confirmed) {
  const id = typeof d === "string" ? d : d.id;
  const reg = regById.get(id);
  if (!reg || !reg.added_check) { fail.push(`confirmed defect "${id}" has no regression check`); continue; }
  if (!passSet.has(reg.added_check)) fail.push(`regression check "${reg.added_check}" for defect "${id}" is not green in run_all`);
  else console.log(`PASS regression locked: ${id} -> ${reg.added_check} (green)`);
}

console.log(`\nbattery: ${fail.length === 0 ? "CLEAN" : "NOT CLEAN"} (${consec} consecutive clean, ${confirmed.length} prior defects)`);
for (const f of fail) console.log(`FAIL ${f}`);
process.exit(fail.length === 0 ? 0 : 1);
