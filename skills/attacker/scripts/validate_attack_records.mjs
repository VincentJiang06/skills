#!/usr/bin/env node
/**
 * attacker — DETERMINISTIC attack-record validator (the §5 gate).
 *
 * EXPORTS validate(doc) so evals/run_all.mjs imports it (never re-implements).
 * It enforces STRUCTURE + reproducibility-SHAPE only — NOT semantics. Whether an
 * attack is *semantically* real (the repro truly discriminates a broken impl, the
 * independence attestation is honest) is the maker/checker + fresh-reader's job
 * (assets/fresh-reader-checklist.md). Division of labor, per research-brief §5.
 *
 * For every record with status:"confirmed" / proven:true it asserts:
 *   - schema-shaped (required fields present, enums in range);
 *   - non-empty repro (command OR steps) PLUS a minimized_input;
 *   - observed and expected present and observed != expected;
 *   - oracle in the enum and a non-empty invariant;
 *   - a non-empty non_tautology_check;
 *   - independence_attestation.withheld includes BOTH implementation_source + tdd_suite;
 *   - repro.replayed_ok === true (checklist 13: proven requires the repro to re-fire);
 *   - real_collaborator_at_seam === true (checklist 14: no mocked-seam tautology);
 *   - for flaky targets, repro.replays_total is a positive integer and 0 <= replays_passed <=
 *     replays_total (impossible >100% or negative/NaN denominators are REJECTED, not skipped),
 *     and replays_passed/replays_total >= REPLAY_THRESHOLD;
 *   - a regression_key (duplicates collapse → unique_finding_count);
 *   - anti-vacuity: a record whose invariant/observed==expected is a "correctly rejected
 *     malformed input" is not a finding.
 * And roll-up consistency: attempts_used <= budget_n, by_severity present with ONLY
 * {critical,major,minor} keys (unknown keys like "blocker" REJECTED — the validator authors the
 * histogram contract).
 *
 * .jsonl POSITIVE ROLL-UP CONTRACT (see isRollupSummaryLine): the roll-up line is detected by
 * positive evidence (a roll-up key or type:"summary") AND the ABSENCE of every record-only field;
 * any line carrying a record-only field is a RECORD (so a no-id / dup-id-empty / malformed record
 * reaches the gate, never silently dropped), and >1 roll-up line is REJECTED.
 *
 * Usage:
 *   node scripts/validate_attack_records.mjs <doc.json|doc.jsonl>   # exit 0 iff ok
 *   import { validate } from './validate_attack_records.mjs'
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

const ORACLE_ENUM = ["implicit", "differential", "metamorphic", "control_vs_experiment", "specified"];
const SURFACE_ENUM = ["boundary", "unicode", "sequence", "concurrency", "resource", "integration", "time", "state"];
const STATUS_ENUM = ["confirmed", "needs_judgment", "suspected", "fixed", "wont_fix"];
const SEVERITY_ENUM = ["critical", "major", "minor"];
const NJ_REASON_ENUM = [
  "no_baseline", "needs_instrumentation", "below_replay_threshold", "ambiguous_oracle",
  "unresolved_expected", "no_real_seam", "anti_vacuity_correctly_rejected", "self_review_compromised", "other",
];
const ATTACK_CLASS_FAMILY = new RegExp(
  "^(boundary|unicode|sequence|concurrency|resource|integration|time|state|business_logic|" +
  "spoofing|tampering|repudiation|info_disclosure|dos|elevation)([.][a-z0-9_]+)*$"
);
const REPLAY_THRESHOLD = 1.0; // deterministic default; flaky targets set replays_total>0 to opt into k/n

const isStr = (v) => typeof v === "string";
const nonEmptyStr = (v) => isStr(v) && v.trim().length > 0;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const has = (o, k) => isObj(o) && Object.prototype.hasOwnProperty.call(o, k);

// Deep value-equality (handles strings, numbers, objects, arrays) for observed vs expected.
function deepEq(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEq(a[k], b[k]));
  }
  return false;
}

function validateConfirmedRecord(rec, i, errors) {
  const at = `records[${i}](${(rec && rec.id) || "?"})`;
  const E = (m) => errors.push(`${at}: ${m}`);

  // required scalar fields
  for (const f of ["id", "invariant", "non_tautology_check", "regression_key"]) {
    if (!nonEmptyStr(rec[f])) E(`missing/empty ${f}`);
  }
  if (!isObj(rec.target) || !nonEmptyStr(rec.target.name)) E("missing target.name");

  // enums
  if (!ORACLE_ENUM.includes(rec.oracle)) E(`oracle "${rec.oracle}" not in enum [${ORACLE_ENUM.join("|")}]`);
  if (!SURFACE_ENUM.includes(rec.surface_class)) E(`surface_class "${rec.surface_class}" not in enum`);
  if (!STATUS_ENUM.includes(rec.status)) E(`status "${rec.status}" not in enum`);
  if (!isStr(rec.attack_class) || !ATTACK_CLASS_FAMILY.test(rec.attack_class)) E(`attack_class "${rec.attack_class}" not a known family`);
  if (!isObj(rec.severity) || !SEVERITY_ENUM.includes(rec.severity.level)) E("severity.level not in [critical|major|minor]");

  // repro: command OR steps, plus minimized_input
  const repro = rec.repro;
  if (!isObj(repro)) {
    E("missing repro");
  } else {
    const hasCmd = nonEmptyStr(repro.command);
    const hasSteps = Array.isArray(repro.steps) && repro.steps.length > 0 && repro.steps.some(nonEmptyStr);
    if (!hasCmd && !hasSteps) E("empty repro: needs a non-empty command OR steps");
    // minimized_input must be present and non-null (object/array/string/number ok)
    if (!has(repro, "minimized_input") || repro.minimized_input === null || repro.minimized_input === undefined)
      E("missing minimized_input (un-shrunk discovery is not a proven minimal repro)");
    // checklist 13: proven requires the repro to re-fire
    if (repro.replayed_ok !== true) E("repro.replayed_ok !== true (proven requires the recorded repro to re-trigger on replay)");
    // Q4: flaky target k/n threshold. A flaky finding OPTS IN by carrying replays_total/passed.
    // The denominator MUST be a positive integer and the numerator an integer in [0, total];
    // an impossible/over-pass (>100%) or a negative/NaN/non-integer denominator is REJECTED, never
    // silently accepted (a malformed k/n must not skip the gate and pass as a clean deterministic
    // finding). Only the well-formed-but-below-threshold case routes to needs_judgment.
    const hasReplayTotal = has(repro, "replays_total");
    const hasReplayPassed = has(repro, "replays_passed");
    if (hasReplayTotal || hasReplayPassed) {
      const total = repro.replays_total;
      const passed = repro.replays_passed;
      const isPosInt = (v) => typeof v === "number" && Number.isInteger(v) && v > 0;
      const isNonNegInt = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;
      if (!isPosInt(total))
        E(`repro.replays_total (${JSON.stringify(total)}) must be a positive integer (a flaky k/n attestation needs a valid denominator; malformed must not silently bypass the gate)`);
      else if (!isNonNegInt(passed))
        E(`repro.replays_passed (${JSON.stringify(passed)}) must be a non-negative integer <= replays_total`);
      else if (passed > total)
        E(`repro.replays_passed (${passed}) > replays_total (${total}) — impossible >100% pass rate; k/n attestation internally inconsistent`);
      else if (passed / total < REPLAY_THRESHOLD)
        E(`replay rate ${passed}/${total} below threshold ${REPLAY_THRESHOLD} (route to needs_judgment.below_replay_threshold)`);
    }
  }

  // observed != expected
  if (!has(rec, "observed")) E("missing observed");
  if (!has(rec, "expected")) E("missing expected");
  if (has(rec, "observed") && has(rec, "expected") && deepEq(rec.observed, rec.expected))
    E("observed == expected (a 'proven' break must demonstrate observed != expected)");

  // checklist 14: real collaborator at the attacked seam (no mock tautology)
  if (rec.real_collaborator_at_seam !== true)
    E("real_collaborator_at_seam !== true (a fully-mocked path at the attacked seam is zero-evidence tautology)");

  // independence attestation: withheld must include BOTH impl source + tdd suite
  const ia = rec.independence_attestation;
  if (!isObj(ia) || !Array.isArray(ia.withheld)) {
    E("missing independence_attestation.withheld[]");
  } else {
    if (!ia.withheld.includes("implementation_source")) E("independence_attestation.withheld omits 'implementation_source'");
    if (!ia.withheld.includes("tdd_suite")) E("independence_attestation.withheld omits 'tdd_suite'");
    if (!nonEmptyStr(ia.derived_expected_from)) E("missing independence_attestation.derived_expected_from");
  }

  // anti-vacuity: a record describing a "correctly rejected" input the contract never promised
  // to handle is NOT a finding and must not sit in records[].
  const inv = isStr(rec.invariant) ? rec.invariant.toLowerCase() : "";
  if (inv.includes("anti_vacuity") || inv.includes("anti-vacuity") || inv.includes("correctly rejected") || inv.includes("never promised"))
    E("anti_vacuity: a correctly-rejected malformed input the contract never promised to handle is NOT a finding (must not appear in records[])");
}

export function validate(doc, opts = {}) {
  const errors = [];

  if (!isObj(doc)) return { ok: false, errors: ["top-level document is not an object"], stats: { unique_finding_count: 0, needs_judgment_count: 0 } };

  // top-level shape
  if (!isObj(doc.summary)) errors.push("missing summary object");
  if (!Array.isArray(doc.records)) errors.push("missing records[] (clean run still emits an empty array)");
  if (!Array.isArray(doc.needs_judgment)) errors.push("missing needs_judgment[] (clean run still emits an empty array)");

  const records = Array.isArray(doc.records) ? doc.records : [];
  const njs = Array.isArray(doc.needs_judgment) ? doc.needs_judgment : [];

  // roll-up consistency
  const s = doc.summary;
  if (isObj(s)) {
    if (typeof s.budget_n === "number" && typeof s.attempts_used === "number" && s.attempts_used > s.budget_n)
      errors.push(`summary: attempts_used (${s.attempts_used}) > budget_n (${s.budget_n}) — internally inconsistent ASR@n accounting`);
    if (!isObj(s.by_severity) || !SEVERITY_ENUM.every((k) => typeof s.by_severity[k] === "number"))
      errors.push("summary.by_severity must carry numeric critical/major/minor");
    // The validator AUTHORS the histogram contract: reject any by_severity key outside the enum
    // (e.g. blocker) — an unknown bucket is a silently-lost severity, not an extension.
    if (isObj(s.by_severity)) {
      for (const k of Object.keys(s.by_severity))
        if (!SEVERITY_ENUM.includes(k))
          errors.push(`summary.by_severity has unknown key "${k}" (allowed: ${SEVERITY_ENUM.join("|")}) — the validator authors the histogram contract`);
    }
  }

  // confirmed records get the full gate
  records.forEach((rec, i) => {
    if (!isObj(rec)) { errors.push(`records[${i}] is not an object`); return; }
    const confirmed = rec.status === "confirmed" || rec.proven === true;
    if (confirmed) validateConfirmedRecord(rec, i, errors);
  });

  // dedup by regression_key → unique finding count + deduped severity histogram (one severity
  // per unique regression_key, first occurrence wins) so by_severity reconciles with
  // unique_finding_count. Single source of truth shared with the .jsonl synthetic-fallback.
  const roll = computeRollup(records);
  const uniqueCount = roll.unique_finding_count;
  const sevHist = roll.by_severity;

  // needs_judgment items: shape only (never counted as confirmed)
  njs.forEach((nj, i) => {
    if (!isObj(nj)) { errors.push(`needs_judgment[${i}] is not an object`); return; }
    if (!nonEmptyStr(nj.id)) errors.push(`needs_judgment[${i}]: missing id`);
    if (!NJ_REASON_ENUM.includes(nj.reason)) errors.push(`needs_judgment[${i}]: reason "${nj.reason}" not in enum`);
  });

  const stats = {
    unique_finding_count: uniqueCount,
    needs_judgment_count: njs.length,
    confirmed_record_count: records.filter((r) => isObj(r) && (r.status === "confirmed" || r.proven === true)).length,
  };

  // roll-up unique_finding_count must match the deduped truth if the author declared one
  if (isObj(s) && typeof s.unique_finding_count === "number" && s.unique_finding_count !== uniqueCount)
    errors.push(`summary.unique_finding_count (${s.unique_finding_count}) != deduped count (${uniqueCount})`);

  // roll-up by_severity must reconcile with the deduped confirmed records (like unique_finding_count).
  // Present-but-disagreeing → REJECT; absent stays allowed (not newly required here).
  if (isObj(s) && isObj(s.by_severity)) {
    for (const lvl of SEVERITY_ENUM) {
      if (typeof s.by_severity[lvl] === "number" && s.by_severity[lvl] !== sevHist[lvl])
        errors.push(`summary.by_severity.${lvl} (${s.by_severity[lvl]}) != deduped confirmed ${lvl} count (${sevHist[lvl]})`);
    }
  }

  // ---- v0.2.0: round-verdict (loop STOP-CONDITION) + DUAL hard budget + carry-forward ledger ----
  // These fire ONLY against a USER-SUPPLIED summary (a round the attacker actually emitted). The
  // exemption is OUT-OF-BAND: a round-verdict-exempt summary is signalled by opts.summarySynthesized,
  // a property of WHO called validate (the CLI, when IT synthesizes a records-only fallback) — NEVER
  // by any field inside `doc`. An in-band summary.__synthesized is IGNORED (it is user-controllable
  // and was a forgeable bypass; see v0.2.1). Same exemption stance as by_severity reconciliation:
  // never reconcile/enforce against a stub the CLI built from records — but it can no longer be
  // forged from input. The new fields are REQUIRED on a user-supplied summary; the loop branches on
  // round_verdict.
  validateRoundVerdict(s, stats.confirmed_record_count, errors, opts.summarySynthesized === true);

  return { ok: errors.length === 0, errors, stats };
}

// v0.2.0 summary-consistency checks. `confirmedCount` is the number of confirmed/proven records[].
// `synthesized` is an OUT-OF-BAND flag (v0.2.1): true ONLY when the CLI itself synthesized a
// records-only fallback summary (input supplied NO summary line). When true these checks are
// skipped (same exemption stance as by_severity reconciliation). It is a property of WHO called
// validate, NEVER a field in the data — an in-band summary.__synthesized is IGNORED here and has
// zero effect on whether the checks run (it was a forgeable bypass; the round-verdict gate must
// always fire on a user-supplied summary, .json or a .jsonl summary line).
function validateRoundVerdict(s, confirmedCount, errors, synthesized) {
  if (!isObj(s)) return;            // top-level "missing summary object" already reported
  if (synthesized === true) return; // OUT-OF-BAND synthesized fallback is exempt (records-only .jsonl)

  const E = (m) => errors.push(`summary: ${m}`);
  const VERDICT_ENUM = ["broke", "clean", "inconclusive"];
  const STOP_ENUM = ["plan_complete", "budget_exhausted"];
  const isInt = (v) => typeof v === "number" && Number.isInteger(v);

  // --- required v0.2.0 fields on a user-supplied summary (enums in range) ---
  if (!VERDICT_ENUM.includes(s.round_verdict))
    E(`round_verdict "${s.round_verdict}" not in enum [${VERDICT_ENUM.join("|")}] (the loop's stop-condition signal is required)`);
  if (!STOP_ENUM.includes(s.stop_reason))
    E(`stop_reason "${s.stop_reason}" not in enum [${STOP_ENUM.join("|")}]`);
  if (!(isInt(s.max_tokens) && s.max_tokens >= 1))
    E(`max_tokens (${JSON.stringify(s.max_tokens)}) must be an integer >= 1 (the per-round token-consumption hard cap)`);
  if (!(isInt(s.tokens_used) && s.tokens_used >= 0))
    E(`tokens_used (${JSON.stringify(s.tokens_used)}) must be an integer >= 0`);
  if (!(s.carried_from_round === null || isInt(s.carried_from_round)))
    E(`carried_from_round (${JSON.stringify(s.carried_from_round)}) must be an integer or null`);

  const verdict = s.round_verdict;
  const stop = s.stop_reason;
  const hasConfirmed = confirmedCount > 0;

  // (1) broke ⟺ ≥1 confirmed/proven record (both directions).
  if (verdict === "broke" && !hasConfirmed)
    E("round_verdict 'broke' but records[] has NO confirmed/proven record (broke ⟺ ≥1 confirmed record; an unbacked broke signal)");
  if ((verdict === "clean" || verdict === "inconclusive") && hasConfirmed)
    E(`round_verdict '${verdict}' but records[] HAS a confirmed/proven record (broke ⟺ ≥1 confirmed record; a confirmed record forces 'broke')`);

  // (2) clean ⟹ no confirmed AND stop_reason == plan_complete.
  if (verdict === "clean" && stop !== "plan_complete")
    E(`round_verdict 'clean' requires stop_reason 'plan_complete' (got '${stop}'); a budget-hit no-find round is 'inconclusive', not 'clean'`);

  // (3) inconclusive ⟹ no confirmed AND stop_reason == budget_exhausted.
  if (verdict === "inconclusive" && stop !== "budget_exhausted")
    E(`round_verdict 'inconclusive' requires stop_reason 'budget_exhausted' (got '${stop}'); nothing found with the plan complete is 'clean', not 'inconclusive'`);

  // (4) tokens_used <= max_tokens (the dual of attempts_used <= budget_n).
  if (isInt(s.tokens_used) && isInt(s.max_tokens) && s.tokens_used > s.max_tokens)
    E(`tokens_used (${s.tokens_used}) > max_tokens (${s.max_tokens}) — the token-consumption hard cap was exceeded`);

  // (5)/(6) stop_reason must be BACKED by the caps.
  const attemptsCapHit = isInt(s.attempts_used) && isInt(s.budget_n) && s.attempts_used >= s.budget_n;
  const tokenCapHit = isInt(s.tokens_used) && isInt(s.max_tokens) && s.tokens_used >= s.max_tokens;
  if (stop === "budget_exhausted" && !(attemptsCapHit || tokenCapHit))
    E(`stop_reason 'budget_exhausted' but NEITHER cap was reached (attempts_used ${s.attempts_used} < budget_n ${s.budget_n} AND tokens_used ${s.tokens_used} < max_tokens ${s.max_tokens}) — a budget claim must be backed by a cap actually reached`);
  if (stop === "plan_complete") {
    if (isInt(s.attempts_used) && isInt(s.budget_n) && s.attempts_used > s.budget_n)
      E(`stop_reason 'plan_complete' but attempts_used (${s.attempts_used}) > budget_n (${s.budget_n}) — a completed plan cannot have exceeded the attempt cap`);
    if (isInt(s.tokens_used) && isInt(s.max_tokens) && s.tokens_used > s.max_tokens)
      E(`stop_reason 'plan_complete' but tokens_used (${s.tokens_used}) > max_tokens (${s.max_tokens}) — a completed plan cannot have exceeded the token cap`);
  }

  // (7) carried_from_round carry-forward discipline.
  if (isInt(s.round)) {
    if (s.round === 1) {
      if (s.carried_from_round !== null)
        E(`carried_from_round must be null at round 1 (a cold start has no prior ledger to inherit), got ${JSON.stringify(s.carried_from_round)}`);
    } else if (s.round > 1) {
      if (!(isInt(s.carried_from_round) && s.carried_from_round >= 1 && s.carried_from_round < s.round))
        E(`carried_from_round (${JSON.stringify(s.carried_from_round)}) must be an integer with 1 <= carried_from_round < round (${s.round}) — a later round MUST declare which strictly-prior round's ledger it inherited (carry-forward discipline; cold-restarting wastes tokens)`);
    }
  }
}

export default validate;

// ---- CLI entry (macOS-safe run-as-main check) ----
const isMain = (() => {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]); }
  catch { return false; }
})();

// POSITIVE ROLL-UP-LINE CONTRACT (.jsonl) — closes the record-drop class definitively.
// A line is THE roll-up summary ONLY when it is UNMISTAKABLY one, by POSITIVE evidence:
//   (1) it carries at least one roll-up key (by_severity | budget_n | asr_at_n |
//       unique_finding_count) OR an explicit type:"summary" marker, AND
//   (2) it carries NONE of the record-only fields below.
// Anything else — including a record-shaped object that is missing/empty `id` (incl. the
// duplicate-id-key case where JSON.parse keeps a last "") AND carries type:"summary" — fails (2),
// so it is NOT the roll-up: it is a RECORD that reaches the gate and is REJECTED, never silently
// reclassified and dropped. The id is NO LONGER the discriminator (a no-id record-shaped object
// used to be mis-bucketed); the presence of ANY record-only field is. (If >1 line satisfies this,
// the caller REJECTS — the roll-up must be parsed exactly once.)
const ROLLUP_KEYS = ["by_severity", "budget_n", "asr_at_n", "unique_finding_count"];
const RECORD_ONLY_FIELDS = [
  "status", "proven", "repro", "oracle", "regression_key", "attack_class",
  "observed", "expected", "invariant", "independence_attestation",
];
function isRollupSummaryLine(o) {
  if (!isObj(o)) return false;
  if (RECORD_ONLY_FIELDS.some((k) => has(o, k))) return false; // any record-only field ⇒ it is a RECORD
  const hasRollupKey = ROLLUP_KEYS.some((k) => has(o, k));
  return hasRollupKey || o.type === "summary";
}

// Deduped severity histogram + unique-finding count over confirmed records (one severity per
// unique regression_key, first occurrence wins). Exported so the .jsonl ingestion can synthesize
// a fallback summary FROM the records (consistent by construction) when no roll-up line exists,
// instead of an all-zero stub that would (rightly) fail by_severity reconciliation.
export function computeRollup(records) {
  const recs = Array.isArray(records) ? records : [];
  const keys = new Set();
  const by_severity = { critical: 0, major: 0, minor: 0 };
  for (const rec of recs) {
    if (isObj(rec) && (rec.status === "confirmed" || rec.proven === true) && nonEmptyStr(rec.regression_key)) {
      if (!keys.has(rec.regression_key)) {
        const lvl = isObj(rec.severity) && SEVERITY_ENUM.includes(rec.severity.level) ? rec.severity.level : null;
        if (lvl) by_severity[lvl] += 1;
      }
      keys.add(rec.regression_key);
    }
  }
  return { unique_finding_count: keys.size, by_severity };
}

if (isMain) {
  const file = process.argv[2];
  if (!file) { console.error("usage: validate_attack_records.mjs <doc.json|doc.jsonl>"); process.exit(2); }

  // Read + parse defensively: malformed/truncated/empty JSON, a bad .jsonl line, or a
  // missing path must produce a graceful "ERR <msg>" + exit 2, never a raw stack trace.
  // `summarySynthesized` is the OUT-OF-BAND round-verdict exemption signal (v0.2.1): set true ONLY
  // when the CLI itself synthesizes a records-only fallback summary (the input had NO summary line).
  // It is passed to validate() as opts, NEVER written into the doc — so it cannot be forged from
  // input. Any in-band summary.__synthesized in user data has zero effect on gating.
  let doc;
  let summarySynthesized = false;
  try {
    const raw = fs.readFileSync(file, "utf8");
    if (file.endsWith(".jsonl")) {
      // JSONL: one record per line; the roll-up summary line (if any) is detected
      // structurally; every other line is a record (its own `summary` field is preserved).
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      const parsed = lines.map((l, i) => {
        try { return JSON.parse(l); }
        catch (e) { throw new Error(`${file}: malformed JSON on line ${i + 1}: ${e.message}`); }
      });
      // Parse the roll-up EXACTLY ONCE: identify every line that is unambiguously the roll-up.
      // >1 ⇒ an inconsistent round → REJECT (caught below as a graceful ERR). Every NON-roll-up
      // line is a RECORD (so a no-id / dup-id-empty / malformed record reaches the gate, never
      // silently dropped).
      const rollupIdx = parsed.map((o, i) => (isRollupSummaryLine(o) ? i : -1)).filter((i) => i >= 0);
      if (rollupIdx.length > 1)
        throw new Error(`${file}: more than one roll-up summary line (${rollupIdx.length}: lines ${rollupIdx.map((i) => i + 1).join(", ")}) — the roll-up must be parsed exactly once; extra/conflicting roll-ups are an inconsistent round`);
      const summaryLine = rollupIdx.length === 1 ? parsed[rollupIdx[0]] : undefined;
      const recs = parsed.filter((_, i) => i !== rollupIdx[0]);
      // When NO explicit roll-up line is supplied, synthesize the fallback summary FROM the
      // records (consistent by construction) so a records-only .jsonl validates and by_severity
      // reconciliation is a no-op — never reconcile a synthesized summary against the records.
      let summary = summaryLine;
      if (!summary) {
        const roll = computeRollup(recs);
        // SYNTHESIZED fallback (no user-supplied roll-up line). The CLI built this stub itself, so it
        // signals the exemption OUT-OF-BAND via summarySynthesized=true below (NOT an in-band field):
        // validate() then exempts it from the v0.2.0 summary-consistency + new-required-field checks
        // (exactly as by_severity reconciliation is already a no-op against a synthesized summary).
        // A records-only .jsonl keeps validating, and the loop's stop-condition fields are only
        // meaningful on a round the attacker actually emitted, never on a synthesized stub. No
        // __synthesized field is written: an in-band marker is forgeable and has zero effect (v0.2.1).
        summary = { round: 1, budget_n: 1, attempts_used: 0, asr_at_n: 0, unique_finding_count: roll.unique_finding_count, by_severity: roll.by_severity };
        summarySynthesized = true;
      }
      doc = { summary, records: recs, needs_judgment: [] };
    } else {
      try { doc = JSON.parse(raw); }
      catch (e) { throw new Error(`${file}: malformed/empty JSON: ${e.message}`); }
    }
  } catch (e) {
    console.error("ERR  " + (e && e.message ? e.message : String(e)));
    process.exit(2);
  }

  // OUT-OF-BAND exemption: summarySynthesized is true ONLY for the CLI's own records-only fallback
  // (input had no summary line). A .json whole-doc or a .jsonl summary line is a USER-SUPPLIED
  // summary → summarySynthesized stays false → the round-verdict + required-field checks ALWAYS run.
  const res = validate(doc, { summarySynthesized });
  for (const e of res.errors) console.error("ERR  " + e);
  console.log(JSON.stringify({ ok: res.ok, stats: res.stats }, null, 2));
  process.exit(res.ok ? 0 : 1);
}
