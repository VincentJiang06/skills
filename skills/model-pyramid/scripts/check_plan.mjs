#!/usr/bin/env node
// check_plan.mjs — validate a model/effort sizing plan against what is deterministically
// checkable. It does NOT judge whether the sizing is wise; that is the skill's L-plane job.
//
// Usage:  node scripts/check_plan.mjs '<json>'
//         node scripts/check_plan.mjs --selftest
//
// Input shape:
// {
//   "session": {"model":"claude-opus-5-5","effort":"high","cached":true},
//   "advisor": "claude-fable-5-1",
//   "agents": [
//     {"label":"finder","model":"claude-sonnet-5","effort":"low","rule":"bulk",
//      "max_tokens":8000,"thinking":"enabled","runtime":"workflow"}
//   ]
// }
// Exit 0 = no errors (warnings may be present), 1 = at least one error, 2 = bad input.

const LEVELS = ["low", "medium", "high", "xhigh", "max"];
const STAMP = "2026-09-25";   // facts read against claude5-family.md base 2026-09-24 — re-verify at ANY point version

// Known models (canonical API IDs). Stamped STAMP. Row = [supported levels, API default effort,
// thinking always on (thinking:disabled -> 400 at any effort), capability rank].
// Sources: src-overview (default effort, thinking), whats-new-opus-5-5 / whats-new-fable-5-1 (always-on),
// claude-api models.md (Mythos 5.1 = Fable 5.1 model; Mythos 5 = Fable 5 tier). 4.x rows carried (EX-2).
// A model NOT in this table is reported as model-unknown — never silently passed.
const ALL = LEVELS, NO_XHIGH = ["low", "medium", "high", "max"];
export const MODELS = {
  "claude-opus-5-5":   [ALL, "medium", true, 3],
  "claude-fable-5-1":  [ALL, "high", true, 4],
  "claude-mythos-5-1": [ALL, "high", true, 4],
  "claude-fable-5":    [ALL, "high", true, 4],
  "claude-mythos-5":   [ALL, "high", true, 4],
  "claude-opus-5":     [ALL, "high", false, 3],
  "claude-sonnet-5":   [ALL, "high", false, 2],
  "claude-opus-4-8":   [ALL, "high", false, 3],
  "claude-opus-4-7":   [ALL, "high", false, 3],
  "claude-opus-4-6":   [NO_XHIGH, "high", false, 2],
  "claude-sonnet-4-6": [NO_XHIGH, "high", false, 1],
  "claude-haiku-4-5":  [[], null, false, 0],   // no effort parameter
};
// Runtime aliases resolve per surface (e.g. `best`/`fable` -> Fable 5.1, or Fable 5 in gateway sessions,
// Claude Code 2.1.257), so NO model-specific legality verdict (thinking, pairing) is given for them.
// [levels or null = unknown target, tier rank or undefined]
const ALIASES = { fable: [ALL, 4], opus: [ALL, 3], sonnet: [ALL, 2], haiku: [[], 0],
  best: [null], default: [null], inherit: [null], opusplan: [null] };

// Advisor pairing = the API table (advisor-tool page, Model compatibility, fetched STAMP):
// executor -> valid advisors. A pair outside its executor's row returns 400 on the API (Claude Code: not attached).
const F51 = ["claude-mythos-5-1", "claude-fable-5-1"];
const F5 = [...F51, "claude-mythos-5", "claude-fable-5", "claude-opus-5"];
const O48 = [...F5, "claude-opus-4-8", "claude-opus-4-7"];
const O46 = [...O48, "claude-opus-4-6", "claude-sonnet-5"];
const ADVISORS = {
  "claude-haiku-4-5": [...O46, "claude-sonnet-4-6"], "claude-sonnet-4-6": [...O46, "claude-sonnet-4-6"],
  "claude-sonnet-5": [...O48, "claude-sonnet-5"], "claude-opus-4-6": O46, "claude-opus-4-7": O48, "claude-opus-4-8": O48,
  "claude-opus-5": F5, "claude-fable-5": F5, "claude-mythos-5": F5, "claude-fable-5-1": F51, "claude-mythos-5-1": F51,
};
const LISTED = new Set(Object.values(ADVISORS).flat());   // an advisor no row names (e.g. Opus 5.5) is unverified, not invalid

const MAX_TOKENS_FLOOR = 64000;   // documented starting point at xhigh/max (128k also documented: see prose)
const RUNTIME_NO_EFFORT = new Set(["agent-tool"]);   // agent-type frontmatter CAN carry effort (CC 2.1.78/2.1.80/2.1.267)

const norm = (m) => String(m || "").trim().toLowerCase();
// The only normalisation: Bedrock prefix, [1m] suffix, snapshot date (-YYYYMMDD, Vertex @YYYYMMDD).
// An ID still unmatched is model-unknown; fix a false positive by adding the ID with a source, never by guessing.
const canon = (m) => norm(m).replace(/^(?:us\.)?anthropic\./, "").replace(/\[1m\]$/, "").replace(/[-@]\d{8}$/, "");
const known = (m) => MODELS[m] !== undefined || ALIASES[m] !== undefined;
const levelsOf = (m) => (MODELS[m] || ALIASES[m] || [])[0];
const rankOf = (m) => (MODELS[m] ? MODELS[m][3] : (ALIASES[m] || [])[1]);

export function checkPlan(plan) {
  const out = [];
  const add = (level, code, where, msg) => out.push({ level, code, where, msg });
  if (!plan || typeof plan !== "object") return [{ level: "error", code: "bad-input", where: "-", msg: "plan must be an object" }];

  const session = plan.session || {};
  const agents = Array.isArray(plan.agents) ? plan.agents : [];
  if (!agents.length) add("warning", "empty-plan", "-", "no agents in plan — nothing to check");
  const sm = canon(session.model);
  // resolved session effort: explicit, else the session model's API default (Opus 5.5 = medium); unknown -> no comparison
  const se = norm(session.effort) || (MODELS[sm] ? MODELS[sm][1] : "") || "";

  // ── advisor pairing ── (session here; each agent's own model below: subagents re-run the check, F13)
  const a = plan.advisor ? canon(plan.advisor) : "";
  const invalidPair = (exec, where) => add("error", "advisor-invalid-pairing", where,
    `${a} is not a valid advisor for executor ${exec} (API pairing table, ${STAMP}) — the API returns 400; Claude Code simply does not attach it`);
  if (plan.advisor) {
    if (rankOf(a) === 0) add("error", "advisor-cannot-advise", "advisor", "Haiku can call an advisor but cannot BE one");
    else if (!known(a)) add("warning", "advisor-unknown", "advisor", `unknown advisor model "${plan.advisor}" — pairing not checked`);
    else if (ADVISORS[sm] && LISTED.has(a)) {
      if (!ADVISORS[sm].includes(a)) invalidPair(sm, "advisor");
    } else add("warning", "advisor-pairing-unverified", "advisor",
      `pairing ${sm || "(no session model)"} + ${a} is not in the pairing table at this baseline (${STAMP}; aliases resolve per surface) — not checked, verify before relying on it`);
  }

  // ── per-agent ──
  const efforts = new Set();
  const unknown = new Map();   // one finding per distinct unknown model, not per agent (P-collapse lesson)
  if (sm && !known(sm)) unknown.set(sm, ["session"]);
  // One runtime fact, one finding. Emitting this per agent means a 13-agent plan gets 13
  // identical lines — a checker that noisy trains its reader to skip the output entirely.
  const inexpressible = [];
  const pairSeen = new Set();
  agents.forEach((ag, i) => {
    const where = ag.label || `agents[${i}]`;
    const model = canon(ag.model || session.model);
    const effort = norm(ag.effort || "");
    const th = ag.thinking && typeof ag.thinking === "object" ? ag.thinking : null;
    const thinking = norm(th ? th.type : ag.thinking);
    const budget = !!th && th.budget_tokens !== undefined;   // manual budget: 400 on always-on models (F09)
    if (effort) efforts.add(effort);
    if (model && !known(model)) unknown.set(model, [...(unknown.get(model) || []), where]);
    if (a && model !== sm && !pairSeen.has(model) && rankOf(a) !== 0 && ADVISORS[model] && LISTED.has(a) && !ADVISORS[model].includes(a)) {
      pairSeen.add(model); invalidPair(model, where);
    }

    if (effort && !LEVELS.includes(effort))
      add("error", "effort-unknown", where, `"${effort}" is not an effort level (${LEVELS.join("/")}); note: "adaptive" is a thinking mode, not an effort`);

    const sup = levelsOf(model);
    if (effort && LEVELS.includes(effort)) {
      if (sup && sup.length === 0)
        add("error", "effort-unsupported-model", where, `${model} does not support the effort parameter at all`);
      else if (sup && !sup.includes(effort)) {
        const fallback = [...LEVELS].slice(0, LEVELS.indexOf(effort) + 1).reverse().find((l) => sup.includes(l));
        add("warning", "effort-falls-back", where, `${model} does not support "${effort}" — it will silently run as "${fallback}"`);
      }
      if ((effort === "xhigh" || effort === "max") && !(sup && sup.length === 0)) {   // no effort knob: one error is enough (F19)
        if (!ag.max_tokens)
          add("warning", "max-tokens-unset", where, `at "${effort}" set a large max_tokens (documented start: ${MAX_TOKENS_FLOOR}) — it caps thinking + text together`);
        else if (ag.max_tokens < MAX_TOKENS_FLOOR)
          add("warning", "max-tokens-low", where, `max_tokens ${ag.max_tokens} is below the documented ${MAX_TOKENS_FLOOR} starting point for "${effort}"`);
        if (model === "claude-opus-5" && thinking === "disabled")
          add("error", "opus5-thinking-conflict", where, `Opus 5 returns 400 for thinking:disabled at "${effort}" — drop the thinking field or move to high or below`);
      }
    }
    if ((thinking === "disabled" || budget) && MODELS[model] && MODELS[model][2])
      add("error", "thinking-always-on", where, `${model} has thinking always on — thinking:disabled or budget_tokens returns 400 at ANY effort; drop the field and lower effort instead`);

    if (ag.runtime && RUNTIME_NO_EFFORT.has(norm(ag.runtime)) && effort)
      inexpressible.push({ where, runtime: ag.runtime });

    // both knobs dropped in one step
    const rm = rankOf(model), rs = rankOf(sm);
    if (rm !== undefined && rs !== undefined && rm < rs && effort && se && LEVELS.indexOf(effort) < LEVELS.indexOf(se))
      add("warning", "both-knobs-dropped", where, "model tier AND effort both dropped relative to the session — move one knob per layer, or justify");

    if (ag.rule === "search" && effort && se && LEVELS.indexOf(effort) < LEVELS.indexOf(se))
      add("warning", "search-effort-cut", where, `effort lowered below the session's "${se}" for a search/exploration task — effort governs tool-call volume; lowering it makes the agent look less, not cheaper-but-equal`);
  });

  // ── runtime expressibility (collapsed to one finding) ──
  if (inexpressible.length) {
    const rt = [...new Set(inexpressible.map((x) => x.runtime))].join(", ");
    const names = inexpressible.map((x) => x.where);
    const shown = names.length > 6 ? `${names.slice(0, 6).join(", ")} … +${names.length - 6}` : names.join(", ");
    add("warning", "effort-not-expressible", inexpressible.length === 1 ? names[0] : `${inexpressible.length} agents`,
      `runtime "${rt}" has no per-call effort — ${inexpressible.length === 1 ? "this agent" : "these agents"} will inherit the session effort (${shown}); pin it with a Workflow opts.effort or an agent type whose frontmatter sets effort:, else report degraded:effort-not-expressible`);
  }

  // ── cache ──
  if (session.cached && efforts.size > 1)
    add("warning", "cache-effort-varies", "session", `effort varies across agents (${[...efforts].join(", ")}) inside a cached session — changing top-level effort invalidates the prompt cache; hold it constant, use per-message effort (beta) where supported, or accept the miss`);

  // ── unknown models, listed FIRST: nothing model-specific was checked for them ──
  const unk = [...unknown].map(([m, w]) => ({ level: "warning", code: "model-unknown", where: m,
    msg: `"${m}" (${w.length} use${w.length > 1 ? "s" : ""}) is not in the support matrix stamped ${STAMP} — levels, defaults, thinking and pairing were NOT checked for it; treat as STALE and re-verify against live docs` }));
  return [...unk, ...out];
}

function main(argv) {
  if (argv.includes("--selftest")) return selftest();
  const raw = argv.find((a) => !a.startsWith("--"));
  if (!raw) { console.error("Usage: node scripts/check_plan.mjs '<json>' | --selftest"); return 2; }
  let plan;
  try { plan = JSON.parse(raw); } catch (e) { console.error(`bad JSON: ${e.message}`); return 2; }
  const findings = checkPlan(plan);
  const errs = findings.filter((f) => f.level === "error");
  console.log(`# check_plan: error ${errs.length} / warning ${findings.length - errs.length}\n`);
  if (!findings.length) console.log(`无命中：可机检的项都没有触发（表格戳 ${STAMP}）。这不等于方案已验证；是否明智不在本脚本判断范围内。`);
  const cell = (x) => String(x).replace(/[|\r\n]+/g, " ");   // plan text is data: no forged rows
  for (const f of findings) console.log(`| ${f.level} | ${f.code} | ${cell(f.where)} | ${cell(f.msg)} |`);
  return errs.length ? 1 : 0;
}

function selftest() {
  const T = [];
  const t = (name, ok) => T.push({ name, ok });
  const codes = (p) => new Set(checkPlan(p).map((f) => f.code));

  t("advisor outside the executor's pairing row → error",
    codes({ session: { model: "claude-opus-5" }, advisor: "claude-sonnet-5", agents: [{ label: "a" }] }).has("advisor-invalid-pairing"));
  t("advisor no pairing row names (opus-5-5) → unverified, not invalid",
    codes({ session: { model: "claude-sonnet-5" }, advisor: "claude-opus-5-5", agents: [{ label: "a" }] }).has("advisor-pairing-unverified"));
  t("unknown executor + advisor → unverified + model-unknown, never silence",
    ["advisor-pairing-unverified", "model-unknown"].every((c) => codes({ session: { model: "claude-opus-6" }, advisor: "claude-fable-5-1", agents: [{ label: "a" }] }).has(c)));
  t("haiku as advisor → error",
    codes({ session: { model: "claude-sonnet-5" }, advisor: "haiku", agents: [{ label: "a" }] }).has("advisor-cannot-advise"));
  t("legal pairing → no advisor error",
    !codes({ session: { model: "claude-sonnet-5" }, advisor: "claude-opus-5", agents: [{ label: "a" }] }).has("advisor-weaker"));
  t("xhigh on opus-4-6 → falls back",
    codes({ agents: [{ label: "a", model: "claude-opus-4-6", effort: "xhigh" }] }).has("effort-falls-back"));
  t("max without max_tokens → warn",
    codes({ agents: [{ label: "a", model: "claude-opus-5", effort: "max" }] }).has("max-tokens-unset"));
  t("max with 64k → no warn",
    !codes({ agents: [{ label: "a", model: "claude-opus-5", effort: "max", max_tokens: 64000 }] }).has("max-tokens-unset"));
  t("opus5 thinking disabled at max → error",
    codes({ agents: [{ label: "a", model: "claude-opus-5", effort: "max", max_tokens: 64000, thinking: "disabled" }] }).has("opus5-thinking-conflict"));
  t("opus-5-5 thinking disabled at low → error (always on)",
    codes({ agents: [{ label: "a", model: "claude-opus-5-5", effort: "low", thinking: { type: "disabled" } }] }).has("thinking-always-on"));
  t("opus5 thinking disabled at high → no error",
    !codes({ agents: [{ label: "a", model: "claude-opus-5", effort: "high", thinking: "disabled" }] }).has("opus5-thinking-conflict"));
  t("agent-tool runtime + effort → not expressible",
    codes({ agents: [{ label: "a", model: "claude-sonnet-5", effort: "low", runtime: "agent-tool" }] }).has("effort-not-expressible"));
  t("both knobs dropped → warn",
    codes({ session: { model: "claude-opus-5", effort: "high" }, agents: [{ label: "a", model: "claude-sonnet-5", effort: "low" }] }).has("both-knobs-dropped"));
  t("search + lowered effort → warn",
    codes({ session: { model: "claude-opus-5", effort: "high" }, agents: [{ label: "a", effort: "medium", rule: "search" }] }).has("search-effort-cut"));
  t("search at inherited effort → no warn",
    !codes({ session: { model: "claude-opus-5", effort: "high" }, agents: [{ label: "a", effort: "high", rule: "search" }] }).has("search-effort-cut"));
  t("varying effort in cached session → warn",
    codes({ session: { model: "claude-opus-5", cached: true }, agents: [{ label: "a", effort: "low" }, { label: "b", effort: "high" }] }).has("cache-effort-varies"));
  t("uniform effort in cached session → no warn",
    !codes({ session: { model: "claude-opus-5", cached: true }, agents: [{ label: "a", effort: "high" }, { label: "b", effort: "high" }] }).has("cache-effort-varies"));
  t("adaptive as effort → error",
    codes({ agents: [{ label: "a", model: "claude-opus-5", effort: "adaptive" }] }).has("effort-unknown"));
  t("opus-5-5 thinking object with budget_tokens → error (F09)",
    codes({ agents: [{ label: "a", model: "claude-opus-5-5", effort: "high", thinking: { type: "enabled", budget_tokens: 8000 } }] }).has("thinking-always-on"));
  t("opus-5-5 adaptive thinking object → no thinking error",
    !codes({ agents: [{ label: "a", model: "claude-opus-5-5", effort: "high", thinking: { type: "adaptive" } }] }).has("thinking-always-on"));
  t("advisor checked against each agent's own model (F13)",
    checkPlan({ session: { model: "claude-sonnet-5" }, advisor: "claude-opus-5", agents: [{ label: "fab", model: "claude-fable-5-1" }] })
      .some((f) => f.code === "advisor-invalid-pairing" && f.where === "fab"));
  t("advisor legal for the agent's model → no per-agent finding",
    !codes({ session: { model: "claude-sonnet-5" }, advisor: "claude-opus-5", agents: [{ label: "h", model: "claude-haiku-4-5" }] }).has("advisor-invalid-pairing"));
  t("no-effort model at xhigh → one error, no max_tokens noise (F19)",
    !codes({ agents: [{ label: "a", model: "claude-haiku-4-5", effort: "xhigh" }] }).has("max-tokens-unset"));
  // The SKILL.md bulk row, both one-knob forms (tier drop at inherited effort; effort step at inherited
  // model). No filter: a code firing on a plan the prose recommends is a prose/checker contradiction (F06).
  t("clean plan (peer + both one-knob bulk forms) → zero findings",
    checkPlan({ session: { model: "claude-opus-5", effort: "high" },
                agents: [{ label: "peer", effort: "high" }, { label: "bulk-tier", model: "claude-sonnet-5", effort: "high" },
                         { label: "bulk-effort", effort: "medium" }] }).length === 0);

  const bad = T.filter((x) => !x.ok);
  for (const x of T) console.log(`  ${x.ok ? "PASS" : "FAIL"} ${x.name}`);
  console.log(bad.length ? `RED: ${bad.length} failed` : `GREEN: ${T.length}/${T.length}`);
  return bad.length ? 1 : 0;
}

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
const isMain = process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) process.exit(main(process.argv.slice(2)));
