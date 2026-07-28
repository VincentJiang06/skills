#!/usr/bin/env node
// check_plan.mjs — validate a model/effort sizing plan against what is deterministically
// checkable. It does NOT judge whether the sizing is wise; that is the skill's L-plane job.
//
// Usage:  node scripts/check_plan.mjs '<json>'
//         node scripts/check_plan.mjs --selftest
//
// Input shape:
// {
//   "session": {"model":"claude-opus-5","effort":"high","cached":true},
//   "advisor": "claude-opus-5",
//   "agents": [
//     {"label":"finder","model":"claude-sonnet-5","effort":"low","rule":"bulk",
//      "max_tokens":8000,"thinking":"enabled","runtime":"workflow"}
//   ]
// }
// Exit 0 = no errors (warnings may be present), 1 = at least one error, 2 = bad input.

const LEVELS = ["low", "medium", "high", "xhigh", "max"];

// Effort support per model. Stamped 2026-07-29 — re-verify on family change.
const SUPPORT = {
  "claude-fable-5":   ["low", "medium", "high", "xhigh", "max"],
  "claude-opus-5":    ["low", "medium", "high", "xhigh", "max"],
  "claude-sonnet-5":  ["low", "medium", "high", "xhigh", "max"],
  "claude-opus-4-8":  ["low", "medium", "high", "xhigh", "max"],
  "claude-opus-4-7":  ["low", "medium", "high", "xhigh", "max"],
  "claude-opus-4-6":  ["low", "medium", "high", "max"],
  "claude-sonnet-4-6":["low", "medium", "high", "max"],
  // aliases
  fable: ["low", "medium", "high", "xhigh", "max"],
  opus:  ["low", "medium", "high", "xhigh", "max"],
  sonnet:["low", "medium", "high", "xhigh", "max"],
  haiku: [],   // no effort support
};

// Capability rank for advisor pairing (higher = more capable). Equal rank = mutually acceptable.
const RANK = {
  haiku: 0, "claude-haiku-4-5": 0,
  "claude-sonnet-4-6": 1,
  sonnet: 2, "claude-sonnet-5": 2, "claude-opus-4-6": 2,
  opus: 3, "claude-opus-4-7": 3, "claude-opus-4-8": 3, "claude-opus-5": 3,
  fable: 4, "claude-fable-5": 4,
};

const MAX_TOKENS_FLOOR = 64000;   // documented starting point at xhigh/max
const RUNTIME_NO_EFFORT = new Set(["agent-tool", "subagent-frontmatter"]);

const norm = (m) => String(m || "").trim().toLowerCase();

export function checkPlan(plan) {
  const out = [];
  const add = (level, code, where, msg) => out.push({ level, code, where, msg });
  if (!plan || typeof plan !== "object") return [{ level: "error", code: "bad-input", where: "-", msg: "plan must be an object" }];

  const session = plan.session || {};
  const agents = Array.isArray(plan.agents) ? plan.agents : [];
  if (!agents.length) add("warning", "empty-plan", "-", "no agents in plan — nothing to check");

  // ── advisor pairing ──
  if (plan.advisor) {
    const a = norm(plan.advisor), m = norm(session.model);
    if (RANK[a] === undefined) add("warning", "advisor-unknown", "advisor", `unknown advisor model "${plan.advisor}" — pairing not checked`);
    else if (RANK[a] === 0) add("error", "advisor-cannot-advise", "advisor", "Haiku can call an advisor but cannot BE one");
    else if (m && RANK[m] !== undefined && RANK[a] < RANK[m])
      add("error", "advisor-weaker", "advisor", `advisor (${plan.advisor}) is less capable than the main model (${session.model}) — it will simply not be attached`);
    if (a === "fable" || a === "claude-fable-5")
      add("warning", "advisor-fable-unavailable", "advisor", "Claude Code does not currently offer Fable 5 as the advisor (dimmed in the picker)");
  }

  // ── per-agent ──
  const efforts = new Set();
  const models = new Set();
  // One runtime fact, one finding. Emitting this per agent means a 13-agent plan gets 13
  // identical lines — a checker that noisy trains its reader to skip the output entirely.
  const inexpressible = [];
  agents.forEach((ag, i) => {
    const where = ag.label || `agents[${i}]`;
    const model = norm(ag.model || session.model);
    const effort = norm(ag.effort || "");
    if (effort) efforts.add(effort);
    if (model) models.add(model);

    if (effort && !LEVELS.includes(effort))
      add("error", "effort-unknown", where, `"${effort}" is not an effort level (${LEVELS.join("/")}); note: "adaptive" is a thinking mode, not an effort`);

    const sup = SUPPORT[model];
    if (effort && LEVELS.includes(effort)) {
      if (sup && sup.length === 0)
        add("error", "effort-unsupported-model", where, `${model} does not support the effort parameter at all`);
      else if (sup && !sup.includes(effort)) {
        const fallback = [...LEVELS].slice(0, LEVELS.indexOf(effort) + 1).reverse().find((l) => sup.includes(l));
        add("warning", "effort-falls-back", where, `${model} does not support "${effort}" — it will silently run as "${fallback}"`);
      }
      if ((effort === "xhigh" || effort === "max")) {
        if (!ag.max_tokens)
          add("warning", "max-tokens-unset", where, `at "${effort}" set a large max_tokens (documented start: ${MAX_TOKENS_FLOOR}) — it caps thinking + text together`);
        else if (ag.max_tokens < MAX_TOKENS_FLOOR)
          add("warning", "max-tokens-low", where, `max_tokens ${ag.max_tokens} is below the documented ${MAX_TOKENS_FLOOR} starting point for "${effort}"`);
        if (model === "claude-opus-5" && ag.thinking === "disabled")
          add("error", "opus5-thinking-conflict", where, `Opus 5 returns 400 for thinking:disabled at "${effort}" — drop the thinking field or move to high or below`);
      }
    }

    if (ag.runtime && RUNTIME_NO_EFFORT.has(norm(ag.runtime)) && effort)
      inexpressible.push({ where, runtime: ag.runtime });

    // both knobs dropped in one step
    const sm = norm(session.model), se = norm(session.effort || "high");
    if (sm && model && RANK[model] !== undefined && RANK[sm] !== undefined && RANK[model] < RANK[sm]
        && effort && LEVELS.indexOf(effort) < LEVELS.indexOf(se))
      add("warning", "both-knobs-dropped", where, "model tier AND effort both dropped relative to the session — move one knob per layer, or justify");

    if (ag.rule === "search" && effort && LEVELS.indexOf(effort) < LEVELS.indexOf(se))
      add("warning", "search-effort-cut", where, "effort lowered for a search/exploration task — effort governs tool-call volume; lowering it makes the agent look less, not cheaper-but-equal");
  });

  // ── runtime expressibility (collapsed to one finding) ──
  if (inexpressible.length) {
    const rt = [...new Set(inexpressible.map((x) => x.runtime))].join(", ");
    const names = inexpressible.map((x) => x.where);
    const shown = names.length > 6 ? `${names.slice(0, 6).join(", ")} … +${names.length - 6}` : names.join(", ");
    add("warning", "effort-not-expressible", inexpressible.length === 1 ? names[0] : `${inexpressible.length} agents`,
      `runtime "${rt}" has no effort knob — ${inexpressible.length === 1 ? "this agent" : "these agents"} will inherit the session effort (${shown}); use a Workflow to pin it, and report degraded:effort-not-expressible`);
  }

  // ── cache ──
  if (session.cached && efforts.size > 1)
    add("warning", "cache-effort-varies", "session", `effort varies across agents (${[...efforts].join(", ")}) inside a cached session — changing effort invalidates the prompt cache; hold it constant or accept the miss`);

  return out;
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
  if (!findings.length) console.log("无命中：计划在可机检的范围内没有问题（是否明智不在本脚本判断范围内）。");
  for (const f of findings) console.log(`| ${f.level} | ${f.code} | ${f.where} | ${f.msg} |`);
  return errs.length ? 1 : 0;
}

function selftest() {
  const T = [];
  const t = (name, ok) => T.push({ name, ok });
  const codes = (p) => new Set(checkPlan(p).map((f) => f.code));

  t("advisor weaker than main → error",
    codes({ session: { model: "claude-opus-5" }, advisor: "claude-sonnet-5", agents: [{ label: "a" }] }).has("advisor-weaker"));
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
  t("clean plan → zero findings",
    checkPlan({ session: { model: "claude-opus-5", effort: "high" },
                agents: [{ label: "peer", effort: "high" }, { label: "bulk", model: "claude-sonnet-5", effort: "low" }] })
      .filter((f) => f.code !== "both-knobs-dropped").length === 0);

  const bad = T.filter((x) => !x.ok);
  for (const x of T) console.log(`  ${x.ok ? "PASS" : "FAIL"} ${x.name}`);
  console.log(bad.length ? `RED: ${bad.length} failed` : `GREEN: ${T.length}/${T.length}`);
  return bad.length ? 1 : 0;
}

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
const isMain = process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
if (isMain) process.exit(main(process.argv.slice(2)));
