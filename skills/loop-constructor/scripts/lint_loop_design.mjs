#!/usr/bin/env node
// lint_loop_design.mjs — the deterministic verifier of a produced loop-design.
//
// Enforces the anchor principle: "no runnable check ⇒ not a loop". A complete,
// check-first design → all PASS, exit 0. Any violation → a named FAIL, exit 1.
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

const VALID_PATTERNS = new Set([
  "retry",
  "plan_execute_verify",
  "explore_narrow",
  "review",
  "human_in_the_loop",
]);

const VALID_HUMAN_PLACEMENT = new Set(["in_the_loop", "on_the_loop"]);

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

  // 4. stop_conditions — non-empty, with a failure branch and a max-iteration cap.
  const sc = input.stop_conditions;
  if (!isPlainObject(sc) || Object.keys(sc).length === 0) {
    add(
      "stop_conditions",
      false,
      "stop_conditions missing or empty; need success + failure branches and a max-iteration cap"
    );
    add("stop_conditions.max_iterations", false, "stop_conditions.max_iterations missing (no cap)");
  } else {
    const failureOk = Array.isArray(sc.failure) && sc.failure.length > 0;
    if (!failureOk) {
      add(
        "stop_conditions.failure",
        false,
        "stop_conditions.failure must be a non-empty list of failure branches"
      );
    } else {
      add("stop_conditions.failure", true);
    }
    // max-iteration / budget cap is mandatory.
    if (!isPositiveInt(sc.max_iterations)) {
      add(
        "stop_conditions.max_iterations",
        false,
        `stop_conditions.max_iterations missing or not a positive integer (got ${JSON.stringify(sc.max_iterations)}); a max-iteration/budget cap is mandatory`
      );
    } else {
      add("stop_conditions.max_iterations", true);
    }
  }

  // 5. human_placement — in_the_loop vs on_the_loop.
  if (!isNonEmptyString(input.human_placement) || !VALID_HUMAN_PLACEMENT.has(input.human_placement)) {
    add(
      "human_placement",
      false,
      `human_placement missing or invalid (got ${JSON.stringify(input.human_placement)}); expected ${[...VALID_HUMAN_PLACEMENT].join("|")}`
    );
  } else {
    add("human_placement", true);
  }

  // 6. maker_checker — a separate checker.
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

  // 7. harness_primitives — must be an array (>=0 items allowed).
  if (!Array.isArray(input.harness_primitives)) {
    add("harness_primitives", false, "harness_primitives must be an array (may be empty)");
  } else {
    add("harness_primitives", true);
  }

  // 8. risk_guards — non-empty list of {risk, mitigation}.
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

  return finalize(checks);
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
