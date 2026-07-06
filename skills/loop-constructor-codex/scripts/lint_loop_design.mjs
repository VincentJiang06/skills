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

// `restart` is a first-class action (LOOPS.md §V "Let The Loop Restart"): discard
// this stage's work and re-derive it from the contract, rather than patching a
// codebase that has become archaeology. Like escalate/abort it carries NO `to`
// (it doesn't reset an upstream gate — it throws its own work away and re-enters),
// so the "stray to" rule below rejects a restart that names a target.
const VALID_ON_FAILURE_ACTIONS = new Set(["loopback", "escalate", "abort", "restart"]);

// A negotiated contract (LOOPS.md §III) needs enough testable assertions that the
// evaluator can't rubber-stamp. This is a STRUCTURAL floor only — real sufficiency
// (single endpoint ≈ 8–12, module ≈ 12–20, app-sized ≈ 20+) is a judgment the
// fresh-reader makes, not the linter. The floor just rejects a contract that is
// vacuous on its face — and it counts only MACHINE-GRADABLE assertions: if
// `human-verify:` entries counted, the floor could be met entirely by rubber
// stamps ("human-verify: someone gives a thumbs up"), which defeats the point of
// a graded contract. Human-verify assertions remain legal ABOVE the floor for the
// genuinely non-machine-checkable residue.
const CONTRACT_MIN_ASSERTIONS = 3;

const HUMAN_VERIFY_RE = /^human-verify\s*:/i;

// The check is the success gate. Presence alone is not enough: a check that
// CANNOT fail on a broken implementation (`true`, `npm test || true`, `cmd; true`,
// `sh -c true`, an empty-pattern grep, a constant-true `[ 1 = 1 ]`) is a no-op the
// loop reward-hacks — it declares success while wrong.
//
// Rather than enumerate bad strings (a denylist misses every form not listed), we
// ANALYZE shell exit semantics over `; || && |`: a check is hollow iff it
// structurally reduces to an always-green atom. This is heuristic and CONSERVATIVE
// — it only flags when it can prove always-green, so a real `npm test` atom is
// never flagged. The undecidable residual (a custom command that happens to always
// exit 0, e.g. `mytool` aliased to true) is NOT catchable here by design and stays
// the job of the required `passing_but_wrong` field + the fresh-reader pass.

// Split on a shell operator at top level (not inside single/double quotes, not
// inside (), {}, ``); never splits `|` inside `||`.
function splitTopLevelShell(s, op) {
  const parts = [];
  let cur = "", q = null, depth = 0, i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (q) { cur += ch; if (ch === q) q = null; i++; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { q = ch; cur += ch; i++; continue; }
    if (ch === "(" || ch === "{") { depth++; cur += ch; i++; continue; }
    if (ch === ")" || ch === "}") { depth = Math.max(0, depth - 1); cur += ch; i++; continue; }
    if (depth === 0) {
      if (op === "|" && s[i] === "|" && s[i + 1] === "|") { cur += "||"; i += 2; continue; }
      if (op === "&" && s[i] === "&") {
        if (s[i + 1] === "&") { cur += "&&"; i += 2; continue; } // && is not a background split
        if (s[i + 1] === ">" || s[i - 1] === ">") { cur += "&"; i += 1; continue; } // &> / >& redirection, not background
      }
      if (s.startsWith(op, i)) { parts.push(cur); cur = ""; i += op.length; continue; }
    }
    cur += ch; i++;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter((p) => p.length);
}

function stripMatchedQuotes(a) {
  if (a.length >= 2 && ((a[0] === "'" && a[a.length - 1] === "'") || (a[0] === '"' && a[a.length - 1] === '"'))) {
    return a.slice(1, -1);
  }
  return a;
}

// A single command atom (no top-level operators) that always exits 0. Unwraps the
// common shells/builtins/groups/quotes that hide an always-green inner command, and
// recurses back into checkCannotFail when the unwrap reveals a compound.
function atomAlwaysGreen(atom, depth) {
  let a = String(atom).trim();
  if (depth > 20) return false; // pathological-nesting guard
  // matched surrounding quotes / backticks / $() / () subshell / {} group → analyze inner
  const stripped = stripMatchedQuotes(a);
  if (stripped !== a) return checkCannotFail(stripped, depth + 1);
  let m =
    a.match(/^`(.*)`$/) ||
    a.match(/^\$\((.*)\)$/) ||
    a.match(/^\((.*)\)$/);
  if (m) return checkCannotFail(m[1], depth + 1);
  m = a.match(/^\{(.*)\}$/);
  if (m) return checkCannotFail(m[1].replace(/;\s*$/, ""), depth + 1);
  if (a[0] === "\\") return checkCannotFail(a.slice(1), depth + 1); // \true
  // leading env-var assignments: FOO=1 BAR=2 <X> → the assignments don't change the exit
  m = a.match(/^(?:\w+=\S*\s+)+(.+)$/);
  if (m) return checkCannotFail(m[1], depth + 1);
  // transparent runner wrappers that exit with their child — skip the wrapper's own
  // leading flags / numeric durations / env assignments, then analyze the command:
  // eval/command/builtin/time/nice/nohup/env/stdbuf/ionice/chrt/timeout/xargs <…> <X>
  m = a.match(/^(?:eval|command|builtin|time|nice|nohup|env|stdbuf|ionice|chrt|timeout|xargs)\s+(?:(?:-\S+|\d+\S*|\w+=\S*)\s+)*(.+)$/i);
  if (m) return checkCannotFail(m[1], depth + 1);
  // sh / bash / dash / zsh with any flags then a -c|-lc|-xc … then <X>
  m = a.match(/^(?:\/[\w./-]*)?(?:ba|z|da)?sh\s+(?:-\S+\s+)*-\w*c\b\s*(.+)$/i);
  if (m) return checkCannotFail(stripMatchedQuotes(m[1].trim()), depth + 1);
  // ---- terminal atom checks ----
  // strip trailing redirections — pure plumbing, never changes exit status
  // (`true 2>/dev/null`, `: > file`, `true >/dev/null 2>&1`).
  let prev;
  do { prev = a; a = a.replace(/\s*(?:\d*>>?|&>|<|\d*>&[\d-]*)\s*\S*\s*$/, "").trim(); } while (a !== prev && a);
  const base = a.toLowerCase().replace(/^\/(?:usr\/)?(?:local\/)?bin\//, ""); // strip a leading path
  if (["true", ":", "exit 0", "exit 0;", "return 0"].includes(base)) return true;
  if (/^let\s+[1-9]/.test(base)) return true; // let <nonzero> exits 0
  if (/^echo\b/.test(base) || /^printf\b/.test(base)) return true; // always exit 0
  if (/^(ls|cat|pwd|whoami|date|hostname|uptime|head|tail|dirname|basename)\b/.test(base)) return true; // inspect, never assert
  if (/^(python3?|node|ruby|perl)\s+-c\s+['"]?\s*(pass|exit\(0\)|0|true)\s*['"]?\s*$/.test(base)) return true;
  // test -n <nonempty LITERAL> — always true (but `[ -n "$VAR" ]` is runtime-dependent, so exclude $-expansions)
  {
    const mn = base.match(/^(?:test|\[+)\s+-n\s+(\S+)/);
    if (mn && !mn[1].includes("$") && mn[1] !== '""' && mn[1] !== "''") return true;
  }
  if (/^(test|\[+)\s+-z\s+(''|""|\])/.test(base)) return true; // test -z "" — always true
  // single non-empty LITERAL operand: `[ x ]` / `test 1` (POSIX [ str ] ≡ [ -n str ]).
  // Exclude flags (-f), the empty-string literal, and variable expansions ($X / ${X}).
  {
    const one = base.match(/^(?:test|\[)\s+(\S+)\s*\]?\s*$/);
    if (one && one[1] !== '""' && one[1] !== "''" && !one[1].startsWith("-") && !one[1].includes("$")) return true;
  }
  if (/\b(\d+)\s*(-eq|=|==)\s*\1\b/.test(base)) return true; // 1 -eq 1 / 1 = 1 — constant true
  // constant binary comparison inside test/[/[[ that is ALWAYS TRUE (e.g. `test 5 -gt 3`,
  // `[ abc = abc ]`, `[ abc != xyz ]`) — decidable literals only, no $-expansion/backtick.
  // Always-FALSE forms (`[ x = y ]`) are NOT flagged: they can fail, which is fine.
  {
    const ct = base.match(/^(?:test|\[\[?)\s+(.*?)\s*(?:\]\]?)?\s*$/);
    if (ct && !/[$`]/.test(ct[1])) {
      const inner = ct[1].trim();
      const num = inner.match(/^(-?\d+)\s+(-eq|-ne|-lt|-le|-gt|-ge)\s+(-?\d+)$/);
      if (num) {
        const a = parseInt(num[1], 10), b = parseInt(num[3], 10);
        const truthy = { "-eq": a === b, "-ne": a !== b, "-lt": a < b, "-le": a <= b, "-gt": a > b, "-ge": a >= b }[num[2]];
        if (truthy) return true;
      }
      const str = inner.match(/^(['"]?)([^'"\s]*)\1\s+(=|==|!=)\s+(['"]?)([^'"\s]*)\4$/);
      if (str) {
        const eq = str[2] === str[5];
        if (str[3] === "!=" ? !eq : eq) return true;
      }
    }
  }
  if (/\bgrep\b[^|;&]*\s(''|"")(\s|$)/.test(base)) return true; // empty pattern matches every line
  if (/\bgrep\b/.test(base) && /(\.loop\/|agent[-_. ]?log|run[-_]?state|\bscratch\b|self[-_. ]?report)/.test(base)) return true; // grades its own homework
  return false;
}

// Does the whole check unconditionally exit 0? Walks ; (last wins) → || (any green
// wins) → && (all must be green) → | (last stage wins) → atom. Newlines act as ';'
// and `|&` as a pipe.
function checkCannotFail(expr, depth = 0) {
  const e = String(expr).replace(/#.*$/, "").replace(/[\r\n]+/g, ";").replace(/\|&/g, "|").trim();
  if (!e || depth > 20) return false;
  // a trailing single `&` backgrounds the job; the shell returns 0 regardless.
  if (/(^|[^&])&\s*$/.test(e)) return true;
  const semi = splitTopLevelShell(e, ";");
  if (semi.length > 1) return checkCannotFail(semi[semi.length - 1], depth + 1);
  const bg = splitTopLevelShell(e, "&"); // single `&` backgrounds the left; last foreground wins
  if (bg.length > 1) return checkCannotFail(bg[bg.length - 1], depth + 1);
  const or = splitTopLevelShell(e, "||");
  if (or.length > 1) return or.some((p) => checkCannotFail(p, depth + 1));
  const and = splitTopLevelShell(e, "&&");
  if (and.length > 1) return and.every((p) => checkCannotFail(p, depth + 1));
  const pipe = splitTopLevelShell(e, "|");
  if (pipe.length > 1) return checkCannotFail(pipe[pipe.length - 1], depth + 1);
  return atomAlwaysGreen(e, depth + 1);
}

function hollowCheckReason(raw) {
  const c = String(raw).trim();
  if (!c) return null; // emptiness is handled by the presence check
  if (checkCannotFail(c)) {
    return `the check ${JSON.stringify(c)} cannot fail on a broken implementation — it reduces to an always-green no-op or its failure path is swallowed (e.g. \`… || true\`, \`…; true\`, \`sh -c true\`, an empty-pattern grep, a constant-true test). The success gate must be able to FAIL.`;
  }
  return null;
}

// The gate-polarity field: the check is expected to PASS (exit 0) for the gate to
// close. "pass" is the only sensible value in this model; anything else (or a
// missing field) leaves the polarity undeclared and the field decorative.
function checkExpectIssue(fs, label) {
  if (fs.expect === "pass") return null;
  return `${label} must declare expect:"pass" (the check is expected to pass for the gate to close); got ${JSON.stringify(fs.expect)}`;
}

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
    const hollow = hollowCheckReason(fs.check);
    if (hollow) {
      add("feedback_signal.check", false, `feedback_signal.check is a no-op: ${hollow}`);
    } else {
      add("feedback_signal.check", true);
    }
  }
  // expect — the gate must declare it is expected to pass (not a decorative field).
  if (isPlainObject(fs)) {
    const ei = checkExpectIssue(fs, "feedback_signal.expect");
    if (ei) add("feedback_signal.expect", false, ei);
    else add("feedback_signal.expect", true);
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

  // Contract → stage traceability (LOOPS.md §III): every negotiated assertion
  // must name the stage that proves it (a real stage id) or "cross-cutting". An
  // assertion that maps to no stage is a criterion the design does not actually
  // cover — the same kind of gap the engineer's checklist_coverage join catches.
  const contract = input.contract;
  if (isPlainObject(contract) && Array.isArray(contract.assertions)) {
    contract.assertions.forEach((it, i) => {
      if (!isPlainObject(it)) return; // shape already failed at design level
      const who = JSON.stringify(it.id !== undefined ? it.id : i);
      if (it.stage === undefined) {
        add(`contract.assertions[${i}].stage`, false, `assertion ${who} names no stage; every negotiated assertion must be traceable to the stage that proves it (a stage id) or "cross-cutting"`);
      } else if (it.stage !== "cross-cutting" && !idSet.has(it.stage)) {
        add(`contract.assertions[${i}].stage`, false, `assertion ${who} maps to unknown stage ${JSON.stringify(it.stage)} (no such stage); the contract→stage traceability is broken`);
      }
    });
  }

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

  // feedback_signal.check — THE ANCHOR, per stage — plus the falsifiability +
  // false-pass clauses and the no-op tripwire (the check is the per-stage success gate).
  const fs = stage.feedback_signal;
  if (!isPlainObject(fs) || !isNonEmptyString(fs.check)) {
    add(
      `stages[${idx}].feedback_signal.check`,
      false,
      `${label}.feedback_signal.check missing/empty; no runnable check ⇒ this stage cannot close (the anchor holds per stage)`
    );
  } else {
    const hollow = hollowCheckReason(fs.check);
    if (hollow) {
      add(`stages[${idx}].feedback_signal.check`, false, `${label}.feedback_signal.check is a no-op: ${hollow}`);
    }
    // expect — gate polarity must be declared (not decorative).
    const ei = checkExpectIssue(fs, `${label}.feedback_signal.expect`);
    if (ei) add(`stages[${idx}].feedback_signal.expect`, false, ei);
    // falsifiable_when — the concrete broken state that makes the check FAIL.
    if (!isNonEmptyString(fs.falsifiable_when)) {
      add(
        `stages[${idx}].feedback_signal.falsifiable_when`,
        false,
        `${label}.feedback_signal.falsifiable_when missing/empty; a check must declare the concrete broken state that makes it FAIL (else it may be a no-op the loop reward-hacks)`
      );
    }
    // passing_but_wrong — the recorded false-pass: a passing-but-WRONG implementation
    // the check would wrongly accept (or "none: <why exhaustive>"). Structural presence
    // here; the SKILL.md fresh-reader pass judges whether it's real. This operationalizes
    // the "describe a passing-but-wrong implementation" self-test as a reviewable artifact.
    if (!isNonEmptyString(fs.passing_but_wrong)) {
      add(
        `stages[${idx}].feedback_signal.passing_but_wrong`,
        false,
        `${label}.feedback_signal.passing_but_wrong missing/empty; record the concrete passing-but-wrong implementation this check would WRONGLY accept (or "none: <why the check is exhaustive>") — this forces the success gate to be real, not reward-hacked`
      );
    }
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
    // success — the stated success state. Was previously UNVALIDATED while the
    // error string above promised "success + failure branches"; a loop with no
    // stated done-condition judged success too easily. Mirror the failure check.
    if (!isNonEmptyString(sc.success)) {
      add(
        "stop_conditions.success",
        false,
        `stop_conditions.success missing or not a non-empty string (got ${JSON.stringify(sc.success)}); the success state must be explicitly stated — the loop's done-condition`
      );
    } else {
      add("stop_conditions.success", true);
    }
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

  // roles + contract — the LOOPS.md operating model (§II separate roles, §III
  // negotiate the contract). REQUIRED for a staged design (a real multi-stage loop
  // where a single agent grading its own work turns sycophantic, and an
  // un-negotiated spec gets rubber-stamped). Optional for the flat atomic unit
  // (one stage, where maker_checker already carries the separation) — but if
  // present on a flat design they are still shape-checked, never rubber-stamped.
  const staged = isStagedShape(input);
  validateRoles(input.roles, staged, add);
  validateContract(input.contract, staged, add);
}

// Three separated roles (LOOPS.md §II): a planner that turns the goal into the
// spec and never touches code, a generator that writes everything and is forbidden
// from grading its own work, and an evaluator that runs in a fresh context, is told
// the artifact is broken, and tries to prove it. Mixing them is the most common
// loop failure — the model becomes sycophantic the moment it grades itself.
function validateRoles(roles, required, add) {
  if (roles === undefined) {
    if (required) {
      add(
        "roles",
        false,
        "roles missing; a staged loop must separate planner / generator / evaluator into distinct contexts — a model that grades its own work turns sycophantic (LOOPS.md §II). Provide roles.{planner,generator,evaluator} each with a mandate; the evaluator must be separate_context + adversarial."
      );
    }
    return;
  }
  if (!isPlainObject(roles)) {
    add("roles", false, "roles must be an object with planner / generator / evaluator");
    return;
  }
  let ok = true;
  for (const r of ["planner", "generator", "evaluator"]) {
    const v = roles[r];
    if (!isPlainObject(v) || !isNonEmptyString(v.mandate)) {
      add(`roles.${r}`, false, `roles.${r} missing or has an empty mandate; state what this role does and does NOT do (the planner never touches code; the generator never grades its own work; the evaluator only judges)`);
      ok = false;
    }
  }
  // The evaluator is the load-bearing separation: a fresh, adversarial context.
  const ev = roles.evaluator;
  if (isPlainObject(ev)) {
    if (ev.separate_context !== true) {
      add("roles.evaluator.separate_context", false, "roles.evaluator.separate_context must be true; the evaluator must run in a context that never saw the generator's reasoning or the impl (else it grades its own work — correlated error).");
      ok = false;
    }
    if (ev.adversarial !== true) {
      add("roles.evaluator.adversarial", false, "roles.evaluator.adversarial must be true; the evaluator is told from its first message that the artifact is broken and its job is to prove it (LOOPS.md §II) — a neutral reviewer rubber-stamps.");
      ok = false;
    }
  }
  if (ok) add("roles", true);
}

// A negotiated contract (LOOPS.md §III): before the generator writes a line, it
// proposes what "done" looks like and the evaluator pushes back until they agree on
// a checklist of testable assertions. The CONTRACT — not the original spec — is what
// gets graded. Each assertion must be gradable: a runnable check that can FAIL, or an
// explicit human-verify note. For a staged design every assertion is traceable to the
// stage that proves it (or "cross-cutting"); the stage-resolution is checked in
// validateStagedDesign where the stage ids are known.
function validateContract(contract, required, add) {
  if (contract === undefined) {
    if (required) {
      add(
        "contract",
        false,
        "contract missing; before building, the generator and evaluator must negotiate a checklist of testable assertions and grade against THAT, not the original spec (LOOPS.md §III). Provide contract.assertions[] (each {id, must, check, stage})."
      );
    }
    return;
  }
  if (!isPlainObject(contract)) {
    add("contract", false, "contract must be an object with an assertions[] list");
    return;
  }
  const a = contract.assertions;
  if (!Array.isArray(a) || a.length < CONTRACT_MIN_ASSERTIONS) {
    add(
      "contract.assertions",
      false,
      `contract.assertions must be an array of at least ${CONTRACT_MIN_ASSERTIONS} testable assertions (got ${Array.isArray(a) ? `${a.length}` : JSON.stringify(a)}); too few criteria lets the evaluator rubber-stamp — scale the count to the surface (endpoint ≈ 8–12, module ≈ 12–20, app ≈ 20+, per LOOPS.md §III).`
    );
    return;
  }
  // The floor counts only MACHINE-GRADABLE assertions — a floor met by
  // `human-verify:` rubber stamps is no floor at all (found by an adversarial
  // eval: 1 real check + 2 thumbs-up entries passed the old count).
  const ids = new Set();
  let ok = true;
  const machineGradable = a.filter(
    (it) => isPlainObject(it) && isNonEmptyString(it.check) && !HUMAN_VERIFY_RE.test(it.check.trim())
  ).length;
  if (machineGradable < CONTRACT_MIN_ASSERTIONS) {
    add(
      "contract.assertions.machine_gradable",
      false,
      `contract needs at least ${CONTRACT_MIN_ASSERTIONS} MACHINE-gradable assertions (found ${machineGradable}; human-verify entries don't count toward the floor) — a contract graded mostly by human-verify rubber stamps cannot close a loop autonomously.`
    );
    ok = false;
  }
  a.forEach((it, i) => {
    if (!isPlainObject(it)) {
      add(`contract.assertions[${i}]`, false, "each assertion must be an object {id, must, check, stage}");
      ok = false;
      return;
    }
    if (!isNonEmptyString(it.id)) {
      add(`contract.assertions[${i}].id`, false, "assertion.id missing/empty");
      ok = false;
    } else if (ids.has(it.id)) {
      add(`contract.assertions[${i}].id`, false, `duplicate assertion id ${JSON.stringify(it.id)}; assertion ids must be unique`);
      ok = false;
    } else {
      ids.add(it.id);
    }
    if (!isNonEmptyString(it.must)) {
      add(`contract.assertions[${i}].must`, false, "assertion.must missing/empty; state the testable claim the evaluator grades");
      ok = false;
    }
    // Each assertion is gradable: a runnable check that can FAIL, or an explicit
    // human-verify note. A hollow check (always-green) means the criterion is
    // ungraded — the same reward-hacking the feedback_signal.check analysis catches.
    if (!isNonEmptyString(it.check)) {
      add(`contract.assertions[${i}].check`, false, "assertion.check missing/empty; give the runnable check that grades it, or 'human-verify: <why not machine-checkable>'");
      ok = false;
    } else if (!HUMAN_VERIFY_RE.test(it.check.trim()) && checkCannotFail(it.check)) {
      add(`contract.assertions[${i}].check`, false, `assertion.check ${JSON.stringify(it.check)} cannot fail on a broken impl — an always-green no-op grades every implementation as passing; give a check that can FAIL, or mark it 'human-verify: …'`);
      ok = false;
    }
  });
  if (ok) add("contract", true);
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
