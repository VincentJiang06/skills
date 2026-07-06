#!/usr/bin/env node
// scripts/decide.mjs — deterministic reference implementation of the
// model-pyramid sizing rules (the rule card in ../SKILL.md is the source of
// truth; this script lets an agent double-check a sizing plan mechanically).
// Advisory only: it computes recommendations; it never spawns agents or edits
// configs. Vocabulary is capability-TIER based on purpose — no per-model
// lookup tables live here.
//
//   tiers:   small (haiku-tier) < mid (sonnet-tier) < frontier (opus-tier)
//   efforts: low < medium < high < max     (subagent floor: medium)
//
// CLI (stdlib-only, non-interactive):
//   node scripts/decide.mjs '{"session":{"tier":"opus-tier","effort":"max"},"task":{"exploratory":true}}'
//   node scripts/decide.mjs '{"session":{...},"tasks":[{...},{...}]}'

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EFFORTS = ["low", "medium", "high", "max"];
export const TIERS = ["small", "mid", "frontier"];
export const TIER_ALIAS = {
  "haiku-tier": "small", "sonnet-tier": "mid", "opus-tier": "frontier",
  small: "small", mid: "mid", frontier: "frontier",
};
export const LARGE_FAN_OUT = 20; // ~20+ homogeneous cheap lookups
const FLOOR = 1; // EFFORTS.indexOf("medium")

function normTier(t) {
  const n = TIER_ALIAS[String(t ?? "").toLowerCase()];
  if (!n) throw new Error(`unknown capability tier '${t}' (use ${Object.keys(TIER_ALIAS).join("|")})`);
  return n;
}

// Effort intake is symmetric with tier intake: case-normalized, documented
// runtime aliases accepted (references/runtime-mapping.md), and an UNKNOWN
// explicit value errors loudly — an explicitly stated effort is never
// silently replaced. Returns null only when effort is genuinely absent.
export const EFFORT_ALIAS = { xhigh: "max", minimal: "low" };
function normEffort(effort) {
  if (effort === null || effort === undefined) return null;
  const s = String(effort).trim().toLowerCase();
  if (s === "" || s === "unknown") return null;
  const n = EFFORT_ALIAS[s] ?? s;
  if (!EFFORTS.includes(n)) throw new Error(`unknown effort '${effort}' (use ${EFFORTS.join("|")} or an alias: ${Object.keys(EFFORT_ALIAS).join("|")})`);
  return n;
}

// PREFLIGHT: genuinely absent session effort -> assume high, never low.
// [assumed-high] is emitted ONLY for that absence case.
function preflightEffort(effort) {
  const n = normEffort(effort);
  return n === null ? { effort: "high", assumed: true } : { effort: n, assumed: false };
}

const notchDown = (e) => EFFORTS[Math.max(EFFORTS.indexOf(e) - 1, 0)];
const tierDown = (t) => TIERS[TIERS.indexOf(t) - 1] ?? null;

// Decide (model tier, reasoning effort) for ONE subagent task.
// task: { peer?, exploratory?, fan_out_size?, homogeneous_cheap?,
//         user_override?: {tier?, effort?}, justification?: string }
// session: { tier, effort|null, layer? (default 1) }
export function decide(task = {}, session = {}) {
  if (task === null || typeof task !== "object" || Array.isArray(task)) {
    throw new Error(`task must be a plain object, got ${task === null ? "null" : Array.isArray(task) ? "array" : typeof task}`);
  }
  const sessTier = normTier(session.tier);
  const { effort: sessEffort, assumed } = preflightEffort(session.effort);
  const layer = Number.isInteger(session.layer) && session.layer >= 1 ? session.layer : 1;
  const childLayer = layer + 1;

  let tier = sessTier, effort = sessEffort, rule, fellBack = false;
  // PRECEDENCE: work content wins — exploration applies the search rule even
  // when parallel-shaped (task.peer set alongside exploratory).
  if (task.exploratory === true) {
    const big = (task.fan_out_size ?? 1) >= LARGE_FAN_OUT && task.homogeneous_cheap === true;
    if (big && tierDown(sessTier)) {
      rule = "search-tier-drop";           // keep effort, drop MODEL one tier
      tier = tierDown(sessTier);
    } else {
      rule = "search";                     // keep model, effort down ONE notch
      effort = notchDown(sessEffort);
      fellBack = big;                      // lowest tier: no lower tier invented
    }
  } else if (task.peer === true) {
    rule = "peer";                         // co-work keeps BOTH knobs (n=1 included)
  } else {
    rule = "default";                      // no rule matched: same model, medium
    effort = "medium";
  }

  // HARD FLOOR: low is never emitted; sub-medium clamps UP to medium.
  let clamped = false;
  if (EFFORTS.indexOf(effort) < FLOOR) { effort = "medium"; clamped = true; }

  // Explicit user override wins (advisory: caveat, never block). Values are
  // case/alias-normalized when recognizable; anything else passes through
  // verbatim with a caveat — an override is never rejected.
  let caveat = null;
  const ov = task.user_override;
  if (ov && (ov.tier || ov.effort)) {
    rule = "override";
    if (ov.tier) tier = TIER_ALIAS[String(ov.tier).toLowerCase()] ?? ov.tier;
    if (ov.effort) {
      let oe = null;
      try { oe = normEffort(ov.effort); } catch { oe = null; }
      clamped = false;
      if (oe === null) {
        effort = ov.effort;
        caveat = `user override effort '${ov.effort}' is not in the pyramid vocabulary — passed through as requested (advisory)`;
      } else {
        effort = oe;
        if (EFFORTS.indexOf(oe) < FLOOR) caveat = `user override '${ov.effort}' sits below the pyramid's medium floor — applied as requested (advisory), flagging the floor once`;
      }
    }
  }

  // VERIFY the pyramid shape: two layers is the norm; a third layer or a
  // haiku-tier reach (from above) needs an explicit one-line justification.
  const reasons = [];
  if (childLayer >= 3) reasons.push("third-layer-or-deeper");
  if (tier === "small" && sessTier !== "small") reasons.push("haiku-tier");
  const justified = typeof task.justification === "string" && task.justification.trim().length > 0;
  const justification_required = reasons.length > 0 && !justified;

  const flags = [clamped ? "clamped-to-floor" : null, assumed ? "assumed-high" : null, fellBack ? "lowest-tier-fallback" : null].filter(Boolean);
  const report = `rule=${rule} tier=${tier} effort=${effort}`
    + (flags.length ? ` [${flags.join(",")}]` : "")
    + (justification_required ? ` [needs-justification: ${reasons.join(",")}]` : "")
    + (caveat ? ` [caveat: ${caveat}]` : "");

  return {
    tier, effort, rule, clamped, assumed_effort: assumed, fell_back: fellBack,
    layer: childLayer, justification_required, justification_reasons: reasons,
    caveat, report,
  };
}

// Mixed batches classify PER TASK — never one batch-wide setting.
export function decideBatch(tasks = [], session = {}) {
  if (!Array.isArray(tasks)) throw new Error(`tasks must be an array of task objects, got ${tasks === null ? "null" : typeof tasks}`);
  return tasks.map((t) => decide(t, session));
}

// Map a conceptual effort notch onto a runtime's actual knob.
// runtime: {kind:"ladder", notches:[...]} | {kind:"binary"} | {kind:"none"}
// Never emit a parameter the runtime does not support; state degradations.
const RANK = { minimal: -1, low: 0, medium: 1, high: 2, xhigh: 3, max: 3 };
export function mapToRuntime(effort, runtime = { kind: "none" }) {
  if (!EFFORTS.includes(effort)) throw new Error(`unknown effort '${effort}'`);
  if (runtime.kind === "none") return { value: null, degradation: "runtime exposes no reasoning-effort knob — apply the tier advice only" };
  if (runtime.kind === "binary") return { value: "on", degradation: `runtime has a binary thinking toggle — '${effort}' (floor is medium) maps to on` };
  if (runtime.kind === "ladder") {
    const notches = runtime.notches ?? [];
    if (notches.includes(effort)) return { value: effort, degradation: null };
    const want = RANK[effort];
    const ranked = notches.filter((n) => RANK[n] !== undefined);
    if (!ranked.length) return { value: null, degradation: "runtime ladder has no recognizable notches — apply the tier advice only" };
    const value = ranked.reduce((best, n) =>
      Math.abs(RANK[n] - want) < Math.abs(RANK[best] - want) ||
      (Math.abs(RANK[n] - want) === Math.abs(RANK[best] - want) && RANK[n] > RANK[best]) ? n : best);
    return { value, degradation: `nearest supported notch: '${effort}' -> '${value}'` };
  }
  throw new Error(`unknown runtime kind '${runtime.kind}'`);
}

// Check a PROPOSED assignment against the pyramid controls (for auditing an
// impulse, e.g. "just give the fan-out haiku"). Returns violation codes.
export function checkAssignment(session = {}, assignment = {}) {
  const violations = [];
  const sessTier = normTier(session.tier);
  const { effort: sessEffort } = preflightEffort(session.effort);
  const layer = Number.isInteger(session.layer) && session.layer >= 1 ? session.layer : 1;
  const aTier = TIER_ALIAS[String(assignment.tier ?? "").toLowerCase()];
  if (!aTier) violations.push("unknown-tier");
  let aEffort = null;
  try { aEffort = normEffort(assignment.effort); } catch { aEffort = null; }
  // Distinct flags: an unrecognizable effort is "unknown-effort", never
  // mislabeled as below-floor.
  if (aEffort === null) violations.push("unknown-effort");
  else if (EFFORTS.indexOf(aEffort) < FLOOR) violations.push("below-floor");
  if (aTier) {
    const tierDelta = TIERS.indexOf(sessTier) - TIERS.indexOf(aTier);
    if (tierDelta < 0) violations.push("tier-above-session");
    if (tierDelta > 1) violations.push("skipped-tier");
    const effortDelta = aEffort === null ? 0 : EFFORTS.indexOf(sessEffort) - EFFORTS.indexOf(aEffort);
    if (tierDelta >= 1 && effortDelta >= 1) violations.push("both-knobs-dropped");
    const justified = typeof assignment.justification === "string" && assignment.justification.trim().length > 0;
    // Same scoping as decide(): haiku-tier needs justification only when
    // picked FROM a higher-tier session — a small-tier session staying small
    // is the identity assignment, not a reach (MP-R1-001).
    if (((layer + 1) >= 3 || (aTier === "small" && sessTier !== "small")) && !justified) violations.push("needs-justification");
  }
  return violations;
}

// --- CLI (guarded with realpath so macOS /tmp symlinks don't break it) ---
const isMain = process.argv[1] && fs.existsSync(process.argv[1])
  && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: node scripts/decide.mjs '{\"session\":{\"tier\":\"opus-tier\",\"effort\":\"max\"},\"task\":{...}}'  (or \"tasks\":[...])");
    process.exit(2);
  }
  let input;
  try { input = JSON.parse(raw); } catch (e) { console.error(`input is not valid JSON: ${e.message}`); process.exit(2); }
  try {
    const out = Array.isArray(input.tasks) ? decideBatch(input.tasks, input.session) : decide(input.task ?? {}, input.session);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) { console.error(e.message); process.exit(1); }
}
