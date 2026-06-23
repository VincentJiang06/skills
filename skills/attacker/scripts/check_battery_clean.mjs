#!/usr/bin/env node
/**
 * attacker — adversarial battery ledger checker (the "hardened" gate).
 *
 * Declares the skill hardened only after >= N CONSECUTIVE clean rounds, each with
 * UNIQUE context (anti copy-paste), a non-empty attempted_breaks[], and
 * confirmed_defects[] locked to regression entries. The strict 3-clean gate is
 * ASYMPTOTIC (per the mp-cli-sup lesson) — this is a loop-until-dry checker, not a
 * fixed-N pass that copy-paste can game.
 *
 * Ledger shape (default .loop/attacker-battery.json in the TARGET project):
 *   { "rounds": [ { "round": 1, "context_hash": "...", "attempted_breaks": [...],
 *                   "confirmed_defects": [ {"regression_key": "..."} ], "clean": bool } ] }
 * "clean" = a round that attacked (non-empty attempted_breaks) and confirmed zero
 *           NEW defects (all confirmed_defects map to already-known regression keys).
 *
 * Usage:
 *   node scripts/check_battery_clean.mjs <ledger.json> [--need 3]   # exit 0 iff hardened
 *   node scripts/check_battery_clean.mjs <ledger.json> --json
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

export function checkBattery(ledger, need = 3) {
  const errors = [];
  const rounds = Array.isArray(ledger && ledger.rounds) ? ledger.rounds : [];
  if (rounds.length === 0) return { ok: false, hardened: false, clean_streak: 0, errors: ["empty ledger: no rounds"] };

  const seenContext = new Set();
  let cleanStreak = 0;
  let maxStreak = 0;

  for (const r of rounds) {
    const at = `round ${r && r.round}`;
    const attempted = Array.isArray(r.attempted_breaks) ? r.attempted_breaks : [];
    if (attempted.length === 0) errors.push(`${at}: empty attempted_breaks[] (a round that didn't attack can't be clean)`);

    // anti copy-paste: each round must carry a UNIQUE context hash
    if (!r.context_hash || typeof r.context_hash !== "string") errors.push(`${at}: missing context_hash (anti copy-paste)`);
    else if (seenContext.has(r.context_hash)) errors.push(`${at}: duplicate context_hash "${r.context_hash}" (copy-paste round does not count)`);
    seenContext.add(r.context_hash);

    // confirmed_defects must lock to regression keys
    const defects = Array.isArray(r.confirmed_defects) ? r.confirmed_defects : [];
    for (const d of defects) {
      if (!d || typeof d.regression_key !== "string" || !d.regression_key.trim())
        errors.push(`${at}: a confirmed_defect has no regression_key`);
    }

    const isClean = attempted.length > 0 && r.clean === true;
    if (isClean) { cleanStreak++; maxStreak = Math.max(maxStreak, cleanStreak); }
    else cleanStreak = 0;
  }

  const hardened = errors.length === 0 && cleanStreak >= need;
  if (!hardened && errors.length === 0)
    errors.push(`only ${cleanStreak} consecutive clean round(s); need ${need} (asymptotic — keep attacking with fresh context until dry)`);
  return { ok: hardened, hardened, clean_streak: cleanStreak, need, errors };
}

export default checkBattery;

const isMain = (() => {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
})();

if (isMain) {
  const file = process.argv[2];
  if (!file) { console.error("usage: check_battery_clean.mjs <ledger.json> [--need N]"); process.exit(2); }

  // --need must resolve to an integer >= 1: a HARDENED verdict requires at least one consecutive
  // clean round, so --need 0 / a negative / a non-numeric value would (wrongly) let a 0/NaN streak
  // declare hardened. Reject those with a graceful ERR + exit 2, never a silent green verdict.
  let need = 3;
  const ni = process.argv.indexOf("--need");
  if (ni > -1) {
    const raw = process.argv[ni + 1];
    const n = Number(raw);
    if (raw === undefined || raw.startsWith("--") || !Number.isInteger(n) || n < 1) {
      console.error(`ERR  --need must be an integer >= 1 (a HARDENED verdict requires >=1 consecutive clean round); got ${JSON.stringify(raw)}`);
      process.exit(2);
    }
    need = n;
  }

  // Graceful file read + parse: a missing / malformed / empty / directory input must produce a
  // clean "ERR <msg>" + exit 2, never a raw Node stack trace (same bar as the validator).
  let ledger;
  try {
    const raw = fs.readFileSync(file, "utf8");
    try { ledger = JSON.parse(raw); }
    catch (e) { throw new Error(`${file}: malformed/empty JSON: ${e.message}`); }
  } catch (e) {
    console.error("ERR  " + (e && e.message ? e.message : String(e)));
    process.exit(2);
  }

  const res = checkBattery(ledger, need);
  for (const e of res.errors) console.error("ERR  " + e);
  if (process.argv.includes("--json")) console.log(JSON.stringify(res, null, 2));
  else console.log(res.hardened ? `HARDENED (${res.clean_streak}/${res.need} clean)` : `NOT hardened (${res.clean_streak}/${res.need})`);
  process.exit(res.ok ? 0 : 1);
}
