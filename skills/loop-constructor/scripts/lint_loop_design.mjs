#!/usr/bin/env node
// lint_loop_design.mjs — the deterministic verifier of a produced loop-design.
//
// Enforces the anchor principle: "no runnable check ⇒ not a loop". A complete,
// check-first design → all PASS, exit 0. Any violation → a named FAIL, exit 1.
//
// Two shapes, one verdict (back-compatible):
//   • FLAT  — a single loop-design object (no `stages` key). The original shape.
//   • STAGED — a decomposed design: loop_altitude ∈ {medium,large} + a non-empty
//     `stages[]`, where each stage is itself a mini check-first loop (own DoD,
//     pattern, runnable check, cap) wired by `depends_on`. The anchor holds PER
//     stage; the stage graph must resolve and be acyclic (an enterable root that
//     terminates). The skill emits STAGED; FLAT stays valid as the atomic unit.
//
// Usage:
//   node scripts/lint_loop_design.mjs <design.json>     # path arg
//   cat design.json | node scripts/lint_loop_design.mjs # stdin
//
// Programmatic:  import { validate } from "./lint_loop_design.mjs"
//   validate(obj) -> { ok: boolean, fails: [{name, reason}], checks: [{name, pass, reason}] }
//
// Deterministic & idempotent: pure function of its input, no I/O, no clock, no
// hidden state. Same input → same verdict. Never throws on bad input — malformed
// input yields a graceful FAIL (not a crash/stack trace).

// ---- helpers --------------------------------------------------------------

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// A "real" string signal: present, a string, non-empty after trimming.
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveInt(v) {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

// A max-iteration / budget cap must be a real bound, not an effectively-infinite
// number (1e21, MAX_SAFE_INTEGER). Anything above the ceiling is "no cap".
// 10000 is far above any realistic agent-loop iteration count, so a cap above it
// almost always signals a forgotten/placeholder bound rather than an intended one.
const MAX_ITERATIONS_CEILING = 10000;
function isCapInt(v) {
  return isPositiveInt(v) && v <= MAX_ITERATIONS_CEILING;
}

// Every non-empty failure-branch must itself be a non-empty string — a list of
// [null, "", 0] is not a real set of failure branches (mirrors risk_guards).
function isNonEmptyStringList(v) {
  return Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString);
}

const VALID_ON_FAILURE_ACTIONS = new Set(["loopback", "escalate", "abort"]);

// Shape detector shared with the renderer so the two can never diverge.
export function isStagedShape(design) {
  return isPlainObject(design) && Array.isArray(design.stages);
}

const VALID_PATTERNS = new Set([
  "retry",
  "plan_execute_verify",
  "explore_narrow",
  "review",
  "human_in_the_loop",
]);

const VALID_HUMAN_PLACEMENT = new Set(["in_the_loop", "on_the_loop"]);

// `small` is intentionally NOT a loop altitude: entering a loop at all means the
// task is big enough to warrant decomposition. The skill auto-picks medium|large.
const VALID_ALTITUDE = new Set(["medium", "large"]);

// ---- core validator -------------------------------------------------------

/**
 * Validate a loop-design object against the canonical check-first contract.
 * Returns a verdict; never throws.
 */
export function validate(input) {
  const checks = [];
  const add = (name, pass, reason) => checks.push({ name, pass, reason: pass ? "" : reason });

  // Graceful handling of malformed input — a non-object is not a loop-design.
  if (!isPlainObject(input)) {
    const what =
      input === null
        ? "null"
        : Array.isArray(input)
        ? "an array"
        : typeof input;
    add(
      "input_is_object",
      false,
      `input is not a loop-design object (got ${what}); expected a JSON object`
    );
    return finalize(checks);
  }
  add("input_is_object", true);

  // Shape selection: presence of a `stages` key signals a decomposed design.
  // A FLAT design (no `stages`) takes the original single-loop path unchanged.
  if (input.stages !== undefined) {
    // Reject a hybrid shape: per-loop fields belong INSIDE a stage, never at the
    // top of a staged design (the renderer would silently drop a top-level gate).
    for (const k of ["feedback_signal", "definition_of_done", "loop_pattern"]) {
      if (k in input) {
        add(
          `hybrid.${k}`,
          false,
          `top-level ${k} is not allowed in a staged design (stages[] present); ${k} is a per-stage field — move it inside a stage`
        );
      }
    }
    validateStagedDesign(input, checks, add);
  } else {
    validateFlatLoop(input, add);
  }

  // Design-level fields are shared by both shapes.
  validateDesignLevel(input, add);

  return finalize(checks);
}

// ---- flat single-loop checks (the original shape, unchanged) --------------

function validateFlatLoop(input, add) {
  // 1. definition_of_done — machine-verifiable goal, not prose.
  const dod = input.definition_of_done;
  if (!isPlainObject(dod)) {
    add(
      "definition_of_done",
      false,
      "definition_of_done missing or not an object (need a single verifiable goal)"
    );
  } else if (!isNonEmptyString(dod.goal)) {
    add("definition_of_done", false, "definition_of_done.goal missing or empty");
  } else if (dod.machine_verifiable !== true) {
    add(
      "definition_of_done.machine_verifiable",
      false,
      "definition_of_done.machine_verifiable must be true; a prose-only goal is not machine-verifiable"
    );
  } else {
    add("definition_of_done", true);
    add("definition_of_done.machine_verifiable", true);
  }

  // 2. loop_pattern — one of the known patterns.
  if (!isNonEmptyString(input.loop_pattern) || !VALID_PATTERNS.has(input.loop_pattern)) {
    add(
      "loop_pattern",
      false,
      `loop_pattern missing or invalid (got ${JSON.stringify(input.loop_pattern)}); expected one of ${[...VALID_PATTERNS].join("|")}`
    );
  } else {
    add("loop_pattern", true);
  }

  // 3. feedback_signal.check — THE ANCHOR. No runnable check ⇒ not a loop.
  const fs = input.feedback_signal;
  if (!isPlainObject(fs)) {
    add(
      "feedback_signal.check",
      false,
      "feedback_signal missing or not an object; no runnable check means this is not a closeable loop"
    );
  } else if (!isNonEmptyString(fs.check)) {
    add(
      "feedback_signal.check",
      false,
      `feedback_signal.check is missing/empty/whitespace/null (got ${JSON.stringify(fs.check)}); presence is not a real signal — no runnable check ⇒ reject`
    );
  } else {
    add("feedback_signal.check", true);
  }
}

// ---- staged (decomposed) checks -------------------------------------------

function validateStagedDesign(input, checks, add) {
  // loop_altitude — medium | large (small is not a loop altitude).
  if (!isNonEmptyString(input.loop_altitude) || !VALID_ALTITUDE.has(input.loop_altitude)) {
    add(
      "loop_altitude",
      false,
      `loop_altitude missing or invalid (got ${JSON.stringify(input.loop_altitude)}); a staged design must be ${[...VALID_ALTITUDE].join("|")} — small is not a loop altitude`
    );
  } else {
    add("loop_altitude", true);
  }

  const stages = input.stages;
  if (!Array.isArray(stages) || stages.length === 0) {
    add(
      "stages",
      false,
      `stages must be a non-empty array of sub-loops (got ${Array.isArray(stages) ? "an empty array" : JSON.stringify(stages)}); a decomposed loop needs at least one gated stage`
    );
    return;
  }
  add("stages", true);

  // Per-stage checks; one PASS line per fully-valid stage.
  const idSet = new Set();
  stages.forEach((stage, idx) => {
    const before = checks.length;
    const id = validateOneStage(stage, idx, checks, add);
    if (id !== null) {
      if (idSet.has(id)) {
        add(`stages[${idx}].id`, false, `duplicate stage id ${JSON.stringify(id)}; stage ids must be unique`);
      } else {
        idSet.add(id);
      }
    }
    const stageHadFail = checks.slice(before).some((c) => !c.pass);
    if (!stageHadFail) add(`stages[${idx}]${id ? ` (${id})` : ""}`, true);
  });

  // depends_on resolution — every referenced id must exist.
  let depsResolve = true;
  stages.forEach((stage, idx) => {
    if (isPlainObject(stage) && Array.isArray(stage.depends_on)) {
      for (const dep of stage.depends_on) {
        if (!idSet.has(dep)) {
          depsResolve = false;
          add(
            `stages[${idx}].depends_on`,
            false,
            `${stageLabel(stage, idx)}.depends_on references unknown stage id ${JSON.stringify(dep)} (no such stage)`
          );
        }
      }
    }
  });

  // on_failure loopback routing: the target must (a) resolve and (b) be UPSTREAM
  // — a transitive depends_on ancestor of the failing stage. A self-loopback or a
  // forward/parallel target is in-place head-banging (max_iterations already bounds
  // in-place retries); loopback exists to reset an already-completed upstream gate.
  const depsMap = new Map();
  for (const s of stages) {
    if (isPlainObject(s) && isNonEmptyString(s.id)) {
      depsMap.set(s.id, Array.isArray(s.depends_on) ? s.depends_on.filter((x) => typeof x === "string") : []);
    }
  }
  const ancestorsOf = (id) => {
    const seen = new Set();
    const stack = [...(depsMap.get(id) || [])];
    while (stack.length) {
      const a = stack.pop();
      if (seen.has(a) || !depsMap.has(a)) continue;
      seen.add(a);
      for (const p of depsMap.get(a) || []) stack.push(p);
    }
    return seen;
  };
  stages.forEach((stage, idx) => {
    const of = isPlainObject(stage) && isPlainObject(stage.stop_conditions) ? stage.stop_conditions.on_failure : undefined;
    if (!isPlainObject(of) || of.action !== "loopback" || !isNonEmptyString(of.to)) return;
    const to = of.to;
    const lbl = stageLabel(stage, idx);
    if (!idSet.has(to)) {
      add(`stages[${idx}].stop_conditions.on_failure`, false, `${lbl}.stop_conditions.on_failure.to references unknown stage id ${JSON.stringify(to)} (no such stage to loop back to)`);
    } else if (to === stage.id) {
      add(`stages[${idx}].stop_conditions.on_failure`, false, `${lbl}.stop_conditions.on_failure loops back to itself — in-place head-banging; max_iterations already bounds retries, so loopback must target an UPSTREAM stage`);
    } else if (!ancestorsOf(stage.id).has(to)) {
      add(`stages[${idx}].stop_conditions.on_failure`, false, `${lbl}.stop_conditions.on_failure.to=${JSON.stringify(to)} is not an upstream stage (a transitive depends_on ancestor); loopback must target an already-completed upstream stage, not a later/parallel one`);
    }
  });

  // Acyclic / reachability — only meaningful once ids exist and deps resolve.
  if (depsResolve && idSet.size === stages.length) {
    const cycle = findCycle(stages);
    if (cycle) {
      add(
        "stages.reachability",
        false,
        `stages depends_on form a cycle (${cycle.join(" → ")}); a cyclic dependency has no enterable root and cannot terminate`
      );
    } else {
      add("stages.reachability", true);
    }
  }
}

function stageLabel(stage, idx) {
  return isPlainObject(stage) && isNonEmptyString(stage.id)
    ? `stages[${idx}] (${stage.id})`
    : `stages[${idx}]`;
}

// Validate one stage as a self-contained mini check-first loop.
// Returns the stage id (string) when present and valid, else null.
function validateOneStage(stage, idx, checks, add) {
  const label = stageLabel(stage, idx);
  if (!isPlainObject(stage)) {
    add(`stages[${idx}]`, false, `${label} is not an object`);
    return null;
  }

  let id = null;
  if (!isNonEmptyString(stage.id)) {
    add(`stages[${idx}].id`, false, `${label}.id missing or empty; each stage needs a unique id for depends_on wiring`);
  } else {
    id = stage.id;
  }

  // definition_of_done — machine-verifiable goal per stage.
  const dod = stage.definition_of_done;
  if (!isPlainObject(dod) || !isNonEmptyString(dod.goal)) {
    add(`stages[${idx}].definition_of_done`, false, `${label}.definition_of_done missing or has an empty goal`);
  } else if (dod.machine_verifiable !== true) {
    add(`stages[${idx}].definition_of_done.machine_verifiable`, false, `${label}.definition_of_done.machine_verifiable must be true`);
  }

  // loop_pattern per stage.
  if (!isNonEmptyString(stage.loop_pattern) || !VALID_PATTERNS.has(stage.loop_pattern)) {
    add(`stages[${idx}].loop_pattern`, false, `${label}.loop_pattern missing or invalid; expected one of ${[...VALID_PATTERNS].join("|")}`);
  }

  // feedback_signal.check — THE ANCHOR, per stage — plus a falsifiability clause.
  const fs = stage.feedback_signal;
  if (!isPlainObject(fs) || !isNonEmptyString(fs.check)) {
    add(
      `stages[${idx}].feedback_signal.check`,
      false,
      `${label}.feedback_signal.check missing/empty; no runnable check ⇒ this stage cannot close (the anchor holds per stage)`
    );
  } else if (!isNonEmptyString(fs.falsifiable_when)) {
    // Structural, not NLP-judged: the author must STATE the broken state that makes
    // the check fail. The semantic quality of that statement is judged by the
    // skill's fresh-reader step, not here (keep the linter honest and dumb).
    add(
      `stages[${idx}].feedback_signal.falsifiable_when`,
      false,
      `${label}.feedback_signal.falsifiable_when missing/empty; a check must declare the concrete broken state that makes it FAIL (else it may be a no-op the loop reward-hacks)`
    );
  }

  // stop_conditions — non-empty failure-branch STRINGS + a real (bounded) cap.
  const sc = stage.stop_conditions;
  if (!isPlainObject(sc)) {
    add(`stages[${idx}].stop_conditions`, false, `${label}.stop_conditions missing`);
  } else {
    if (!isNonEmptyStringList(sc.failure)) {
      add(`stages[${idx}].stop_conditions.failure`, false, `${label}.stop_conditions.failure must be a non-empty list of non-empty failure-branch strings`);
    }
    if (!isCapInt(sc.max_iterations)) {
      add(
        `stages[${idx}].stop_conditions.max_iterations`,
        false,
        `${label}.stop_conditions.max_iterations missing or not a positive integer ≤ ${MAX_ITERATIONS_CEILING} (got ${JSON.stringify(sc.max_iterations)}); the per-stage cap must be a real bound`
      );
    }
    // on_failure routing (optional). If present, the action must be known; a
    // loopback must name a `to`. The `to` is resolved at design level (needs ids).
    if (sc.on_failure !== undefined) {
      const of = sc.on_failure;
      if (!isPlainObject(of) || !VALID_ON_FAILURE_ACTIONS.has(of.action)) {
        add(
          `stages[${idx}].stop_conditions.on_failure`,
          false,
          `${label}.stop_conditions.on_failure.action must be one of ${[...VALID_ON_FAILURE_ACTIONS].join("|")}`
        );
      } else if (of.action === "loopback" && !isNonEmptyString(of.to)) {
        add(
          `stages[${idx}].stop_conditions.on_failure`,
          false,
          `${label}.stop_conditions.on_failure is a loopback but names no target stage id (\`to\`)`
        );
      } else if (of.action !== "loopback" && of.to !== undefined) {
        add(
          `stages[${idx}].stop_conditions.on_failure`,
          false,
          `${label}.stop_conditions.on_failure carries a \`to\` but action is ${of.action}; a routing target is only meaningful for loopback`
        );
      }
      // (loopback target existence + UPSTREAM direction are checked at design level.)
    }
  }

  // depends_on — an array of ids (resolution checked at design level).
  if (stage.depends_on !== undefined && !Array.isArray(stage.depends_on)) {
    add(`stages[${idx}].depends_on`, false, `${label}.depends_on must be an array of stage ids (may be empty or omitted)`);
  }

  return id;
}

// DFS cycle detection over the depends_on relation. Returns the cycle path
// (e.g. ["a","b","a"]) or null. Ignores unresolved deps (reported separately).
function findCycle(stages) {
  const deps = new Map();
  for (const s of stages) {
    if (isPlainObject(s) && isNonEmptyString(s.id)) {
      deps.set(s.id, Array.isArray(s.depends_on) ? s.depends_on.filter((d) => typeof d === "string") : []);
    }
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...deps.keys()].map((k) => [k, WHITE]));
  const stack = [];
  let found = null;

  function dfs(u) {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of deps.get(u) || []) {
      if (!deps.has(v)) continue; // unresolved dependency — handled elsewhere
      if (color.get(v) === GRAY) {
        const i = stack.indexOf(v);
        found = stack.slice(i).concat(v);
        return;
      }
      if (color.get(v) === WHITE) {
        dfs(v);
        if (found) return;
      }
    }
    stack.pop();
    color.set(u, BLACK);
  }

  for (const k of deps.keys()) {
    if (color.get(k) === WHITE) dfs(k);
    if (found) break;
  }
  return found;
}

// ---- design-level checks (shared by flat + staged) ------------------------

function validateDesignLevel(input, add) {
  // stop_conditions — non-empty, with a failure branch and a max-iteration cap.
  // For a staged design this is the OUTER/full-loop budget; each stage carries
  // its own per-stage cap.
  const sc = input.stop_conditions;
  if (!isPlainObject(sc) || Object.keys(sc).length === 0) {
    add(
      "stop_conditions",
      false,
      "stop_conditions missing or empty; need success + failure branches and a max-iteration cap"
    );
    add("stop_conditions.max_iterations", false, "stop_conditions.max_iterations missing (no cap)");
  } else {
    if (!isNonEmptyStringList(sc.failure)) {
      add(
        "stop_conditions.failure",
        false,
        "stop_conditions.failure must be a non-empty list of non-empty failure-branch strings"
      );
    } else {
      add("stop_conditions.failure", true);
    }
    if (!isCapInt(sc.max_iterations)) {
      add(
        "stop_conditions.max_iterations",
        false,
        `stop_conditions.max_iterations missing or not a positive integer ≤ ${MAX_ITERATIONS_CEILING} (got ${JSON.stringify(sc.max_iterations)}); the cap must be a real bound, not effectively-infinite`
      );
    } else {
      add("stop_conditions.max_iterations", true);
    }
  }

  // human_placement — in_the_loop vs on_the_loop.
  if (!isNonEmptyString(input.human_placement) || !VALID_HUMAN_PLACEMENT.has(input.human_placement)) {
    add(
      "human_placement",
      false,
      `human_placement missing or invalid (got ${JSON.stringify(input.human_placement)}); expected ${[...VALID_HUMAN_PLACEMENT].join("|")}`
    );
  } else {
    add("human_placement", true);
  }

  // maker_checker — a separate checker.
  const mc = input.maker_checker;
  if (!isPlainObject(mc)) {
    add("maker_checker", false, "maker_checker missing or not an object; a separate checker is required");
  } else if (mc.separate_checker !== true) {
    add(
      "maker_checker.separate_checker",
      false,
      "maker_checker.separate_checker must be true; the checker must be separate from the maker"
    );
  } else {
    add("maker_checker", true);
  }

  // harness_primitives — must be an array (>=0 items allowed).
  if (!Array.isArray(input.harness_primitives)) {
    add("harness_primitives", false, "harness_primitives must be an array (may be empty)");
  } else {
    add("harness_primitives", true);
  }

  // risk_guards — non-empty list of {risk, mitigation}.
  const rg = input.risk_guards;
  if (!Array.isArray(rg) || rg.length === 0) {
    add("risk_guards", false, "risk_guards missing or empty; flag at least one risk with a mitigation");
  } else {
    const malformed = rg.findIndex(
      (g) => !isPlainObject(g) || !isNonEmptyString(g.risk) || !isNonEmptyString(g.mitigation)
    );
    if (malformed !== -1) {
      add(
        "risk_guards",
        false,
        `risk_guards[${malformed}] must be an object with non-empty risk + mitigation`
      );
    } else {
      add("risk_guards", true);
    }
  }
}

function finalize(checks) {
  const fails = checks
    .filter((c) => !c.pass)
    .map((c) => ({ name: c.name, reason: c.reason }));
  return { ok: fails.length === 0, fails, checks };
}

// ---- CLI ------------------------------------------------------------------

// fs + url are only exercised on the CLI path; importing them at top level is
// harmless for the harness, which only calls validate().
import * as nodeFs from "node:fs";
import { fileURLToPath } from "node:url";

function printVerdict(verdict, label) {
  for (const c of verdict.checks) {
    if (c.pass) {
      console.log(`PASS ${c.name}`);
    } else {
      console.log(`FAIL ${c.name}: ${c.reason}`);
    }
  }
  const status = verdict.ok ? "PASS" : "FAIL";
  console.log(`\n${status} loop-design${label ? ` (${label})` : ""}: ${verdict.fails.length} fail(s)`);
}

function main(argv) {
  const arg = argv[2];
  let raw = "";
  let label = "";
  if (arg && arg !== "-") {
    label = arg;
    try {
      raw = nodeFs.readFileSync(arg, "utf8");
    } catch (e) {
      console.log(`FAIL input_readable: could not read file ${JSON.stringify(arg)}: ${e.code || e.message}`);
      console.log(`\nFAIL loop-design: 1 fail(s)`);
      process.exit(1);
    }
  } else {
    label = "stdin";
    try {
      raw = nodeFs.readFileSync(0, "utf8");
    } catch {
      raw = "";
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Non-JSON / empty input → graceful FAIL, never a stack trace.
    console.log(`FAIL input_is_json: input is not valid JSON (${e.message})`);
    console.log(`\nFAIL loop-design${label ? ` (${label})` : ""}: 1 fail(s)`);
    process.exit(1);
  }

  const verdict = validate(parsed);
  printVerdict(verdict, label);
  process.exit(verdict.ok ? 0 : 1);
}

// Run as CLI only when invoked directly (not when imported by the harness).
if (process.argv[1] && fileURLToPath(import.meta.url) === nodeFs.realpathSync(process.argv[1])) {
  main(process.argv);
}
