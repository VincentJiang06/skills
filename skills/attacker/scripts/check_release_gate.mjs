#!/usr/bin/env node
/**
 * attacker — release gate. Binds "industrial" to objective re-runnable evidence:
 *   (1) evals/run_all.mjs is GREEN (validator unit cases + non-vacuity self-test), and
 *   (2) the non-vacuity self-test specifically passed (planted bug caught + clean
 *       control zero findings), and
 *   (3) [optional, for "hardened"] >= N consecutive clean adversarial-battery rounds
 *       if a ledger is supplied (--battery <ledger.json>).
 *
 * Usage:
 *   node scripts/check_release_gate.mjs                       # gate this skill dir
 *   node scripts/check_release_gate.mjs --battery <ledger>    # also require hardened
 *   node scripts/check_release_gate.mjs --json
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { checkBattery } from "./check_battery_clean.mjs";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);

// runHarness() is the ONLY place that spawns the real harness. It is deliberately separate from the
// decision logic (evaluateReleaseGate) so the decision can be unit-tested IN-PROCESS without spawning
// — that is what breaks the harness→gate→harness recursion STRUCTURALLY. There is no env var that can
// make the CLI skip this: the CLI entry always calls runHarness() then evaluateReleaseGate(). A
// release verdict therefore can NEVER be forged by ambient environment.
export function runHarness() {
  const r = spawnSync(process.execPath, [path.join(ROOT, "evals", "run_all.mjs")], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  const nonVacuity =
    /PASS NV_planted_bug_caught/.test(out) && /PASS NV_clean_control_zero_findings/.test(out);
  return { green: r.status === 0, nonVacuity, output: out };
}

// PURE decision function: it does NOT spawn anything. It takes the harness result as INPUT
// (harnessGreen / nonVacuity) plus an optional battery ledger path, and returns {ok, checks}. Because
// it is pure, the harness can import and call it directly with a stubbed/known harness result to test
// the gate's flag/battery logic — no recursion, no env, no forgeable bypass. The CLI feeds it the
// result of a REAL runHarness().
export function evaluateReleaseGate({ harnessGreen, nonVacuity, batteryLedgerPath } = {}) {
  const checks = [];
  checks.push({ name: "run_all_green", pass: harnessGreen === true });
  checks.push({ name: "non_vacuity_self_test", pass: nonVacuity === true });
  if (batteryLedgerPath) {
    let bat;
    try { bat = checkBattery(JSON.parse(fs.readFileSync(batteryLedgerPath, "utf8"))); }
    catch (e) { bat = { hardened: false, errors: [e.message] }; }
    checks.push({ name: "battery_hardened", pass: !!bat.hardened, detail: (bat.errors || []).join("; ") });
  }
  const ok = checks.every((c) => c.pass);
  return { ok, checks };
}

// Convenience wrapper used by the CLI entry: ALWAYS runs the real harness, then evaluates. Kept as a
// named export so a direct programmatic caller still gets the full (un-skippable) gate.
export function checkReleaseGate({ battery } = {}) {
  const h = runHarness();
  const res = evaluateReleaseGate({ harnessGreen: h.green, nonVacuity: h.nonVacuity, batteryLedgerPath: battery });
  return { ...res, harness_output: h.output };
}

export default checkReleaseGate;

// PURE arg parser for --battery, extracted so the harness can test the flag-validation logic
// in-process (no subprocess). Returns { battery } on success, or { err } describing the graceful
// rejection. --battery is present but its value is OMITTED (flag is the last arg) or looks like
// another flag (startsWith "--") → the hardened battery check would be silently SKIPPED and the gate
// would print "PASS (industrial)" — a green false positive. Reject; the hardened gate is not droppable.
export function parseBatteryArg(argv) {
  const bi = argv.indexOf("--battery");
  if (bi === -1) return { battery: null };
  const val = argv[bi + 1];
  if (val === undefined || val.startsWith("--")) {
    return { err: `ERR  --battery requires a ledger path (got ${val === undefined ? "no value" : JSON.stringify(val)}); refusing to report a silent green industrial with the hardened battery check skipped` };
  }
  return { battery: val };
}

const isMain = (() => {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
})();

if (isMain) {
  const parsed = parseBatteryArg(process.argv);
  if (parsed.err) {
    console.error(parsed.err);
    console.log("\nRELEASE GATE: FAIL");
    process.exit(2);
  }
  const battery = parsed.battery;
  const res = checkReleaseGate({ battery });
  for (const c of res.checks) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}${c.detail ? "  -- " + c.detail : ""}`);
  if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: res.ok, checks: res.checks }, null, 2));
  console.log(res.ok ? "\nRELEASE GATE: PASS (industrial)" : "\nRELEASE GATE: FAIL");
  process.exit(res.ok ? 0 : 1);
}
