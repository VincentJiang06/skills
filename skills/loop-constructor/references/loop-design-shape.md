# Canonical loop-design shape

The object loop-constructor produces and `scripts/lint_loop_design.mjs`
validates. Build to **these exact keys** — the linter binds to them. The shape is
informed by `loop-principle/templates/{dod_spec,loop_design,loop_quality_rubric}`
but is the dedicated JSON the linter checks (the KB templates are the
prose/Markdown render of the same design).

```json
{
  "task": "<string: the concrete task, one line>",
  "definition_of_done": {
    "goal": "<single verifiable goal — a predicate/command, NOT prose>",
    "machine_verifiable": true
  },
  "loop_pattern": "retry | plan_execute_verify | explore_narrow | review | human_in_the_loop",
  "feedback_signal": {
    "check": "<runnable cmd — REQUIRED, non-empty; this is the anchor>",
    "expect": "pass"
  },
  "stop_conditions": {
    "success": "<string>",
    "failure": ["<>=1 failure branch>"],
    "escalate": ["<escalation trigger>", "..."],
    "max_iterations": 8
  },
  "human_placement": "in_the_loop | on_the_loop",
  "maker_checker": {
    "separate_checker": true,
    "scope": "<string: what the fresh-context checker reviews>"
  },
  "harness_primitives": ["<>=0 items>"],
  "risk_guards": [
    { "risk": "<string>", "mitigation": "<string>" }
  ]
}
```

## What the linter enforces (FAIL rules)

| Field | FAILs when |
|-------|------------|
| `feedback_signal.check` | missing / empty / whitespace-only / null, **or a check that cannot fail on a broken impl** — analyzed over shell `; \|\| && \|` (e.g. `true`, `… \|\| true`, `…; true`, `sh -c true`, `printf ''`, empty-pattern `grep ''`, constant-true `[ 1 = 1 ]`, grep-your-own-`.loop/`-scratch). Conservative: a real `npm test` is never flagged; a *custom* always-0 command is undecidable here → caught by `passing_but_wrong` + the fresh-reader. **Anchor.** |
| `feedback_signal.expect` | not `"pass"` (the gate polarity must be declared — the check is expected to pass for the gate to close; a missing/garbage `expect` is no longer decorative) |
| `stop_conditions` | missing or `{}` (empty) |
| `stop_conditions.success` | missing or not a non-empty string — **the success state must be explicitly stated** (the done-condition) |
| `stop_conditions.failure` | not a non-empty list of **non-empty strings** (`[null]` / `[""]` FAIL) |
| `stop_conditions.max_iterations` | missing, or not a positive integer **≤ 10000** (the cap must be a real bound, not effectively-infinite) |
| `human_placement` | missing or not `in_the_loop`/`on_the_loop` |
| `maker_checker.separate_checker` | missing object or `separate_checker !== true` |
| `risk_guards` | missing or empty list, or any item missing `risk`/`mitigation` |
| `definition_of_done` | missing object, empty `goal`, or `machine_verifiable !== true` (the flag is **author-attested** — the linter gates on the boolean, it does not NLP-inspect the goal string; write a real predicate/command) |
| `loop_pattern` | missing or not one of the five patterns |
| (input itself) | non-JSON / non-object / array / empty → graceful FAIL, never a crash |

A complete, check-first design → all `PASS`, exit 0. See
`assets/golden-loop-design.json` for a passing fixture to copy.

## Staged shape (medium/large — what the skill emits)

Entering a loop means the task is big enough to decompose, so the skill emits a
**staged** design: every task is a tree/sequence of gated sub-loops. The flat
shape above is **not deprecated** — it is the atomic unit (one stage *is* a flat
loop), and the linter still accepts a lone flat object for back-compat. But the
9-step protocol produces the staged shape below.

```json
{
  "task": "<one line>",
  "loop_altitude": "medium | large",
  "loop_altitude_rationale": "<why this altitude, from blast-radius × reversibility × surface-area>",
  "selection_log": [
    { "decision": "D0", "answer": "<loop | not-a-loop>", "why": "<the runnable check that makes done machine-decidable>" },
    { "decision": "D1", "answer": "<flat | staged (N seams)>", "why": "<the stable artifacts handed across each seam>" },
    { "decision": "D2", "answer": "<patterns per stage>", "why": "<failure mode -> pattern>" },
    { "decision": "D3", "answer": "<in_the_loop | on_the_loop>", "why": "<blast × reversibility × feedback>" },
    { "decision": "D4", "answer": "<medium | large>", "why": "<sequential vs independent fan-out>" },
    { "decision": "D5", "answer": "<caps + routing>", "why": "<the guard choices>" }
  ],
  "stages": [
    {
      "id": "<unique slug — referenced by depends_on>",
      "definition_of_done": { "goal": "<predicate/command>", "machine_verifiable": true },
      "loop_pattern": "retry | plan_execute_verify | explore_narrow | review | human_in_the_loop",
      "feedback_signal": {
        "check": "<runnable cmd — REQUIRED per stage; the anchor; must not be an always-green no-op>",
        "expect": "pass",
        "falsifiable_when": "<REQUIRED: the concrete broken state that makes this check FAIL>",
        "passing_but_wrong": "<REQUIRED: a concrete passing-but-WRONG implementation this check would wrongly accept, or 'none: <why the check is exhaustive>'>"
      },
      "stop_conditions": {
        "failure": ["<>=1 non-empty string>"],
        "max_iterations": 8,
        "on_failure": { "action": "loopback | escalate | abort", "to": "<UPSTREAM stage id (a depends_on ancestor) — loopback only>" }
      },
      "depends_on": ["<stage id>", "..."]
    }
  ],
  "human_placement": "in_the_loop | on_the_loop",
  "maker_checker": { "separate_checker": true, "scope": "<string>" },
  "harness_primitives": ["<>=0 items>"],
  "stop_conditions": {
    "success": "<string>",
    "failure": ["<>=1 outer/full-loop branch>"],
    "escalate": ["<trigger>", "..."],
    "max_iterations": 4
  },
  "risk_guards": [ { "risk": "<string>", "mitigation": "<string>" } ]
}
```

- **`selection_log`** — the D0–D5 decision trail from `references/loop-selection.md`
  (the **mechanism**): each entry is `{decision, answer, why}`. The linter does
  not gate it, but a design without it is incomplete — it's what makes the chosen
  shape reviewable rather than asserted. Emit it and surface it in the report.
- **`loop_altitude`** — `medium` (sequential gated stages, single-agent) or
  `large` (+ parallel fan-out; see `pattern.multi_agent_orchestra`). `small` is
  **not** a valid altitude.
- **Each stage is a flat loop** carrying its own DoD + pattern + runnable check +
  per-stage cap. The anchor (`feedback_signal.check`) holds **per stage**.
- **`depends_on`** wires the gate: a stage is admitted only once every stage it
  depends on has passed its check (gate-after-every-stage; never advance past a
  failing gate). The design-level `stop_conditions.max_iterations` is the
  **outer** budget; each stage's `max_iterations` is its **inner** retry cap.

### What the linter enforces for STAGED designs (FAIL rules)

| Field | FAILs when |
|-------|------------|
| `loop_altitude` | missing or not `medium`/`large` (small is not a loop altitude) |
| `stages` | present but not a non-empty array |
| `stages[i].id` | missing/empty, or duplicated across stages |
| `stages[i].definition_of_done` | missing, empty `goal`, or `machine_verifiable !== true` |
| `stages[i].loop_pattern` | missing or not one of the five patterns |
| `stages[i].feedback_signal.check` | missing/empty, **or a check that cannot fail on a broken impl** (cannot-fail analysis over `; \|\| && \|`: `true` / `… \|\| true` / `…; true` / `sh -c true` / empty-pattern grep / constant-true test / grep-your-own-`.loop/`-scratch) — **the anchor, per stage** |
| `stages[i].feedback_signal.expect` | not `"pass"` — the gate polarity must be declared |
| `stages[i].feedback_signal.falsifiable_when` | missing/empty — a check must declare the broken state that makes it FAIL (structural presence; the *quality* of the statement is judged by the skill's fresh-reader step, not the linter) |
| `stages[i].feedback_signal.passing_but_wrong` | missing/empty — record the passing-but-WRONG implementation the check would wrongly accept (or `"none: <why exhaustive>"`); presence is structural, the fresh-reader judges whether it's real |
| `stages[i].stop_conditions.failure` | not a non-empty list of **non-empty strings** (`[null]` / `[""]` / `[0]` FAIL) |
| `stages[i].stop_conditions.max_iterations` | missing, or not a positive integer **≤ 10000** (an effectively-infinite cap is no cap) |
| `stages[i].stop_conditions.on_failure` | `action` not `loopback`/`escalate`/`abort`; a `loopback` whose `to` is missing, unresolved, the stage **itself**, or **not an upstream stage** (must be a transitive `depends_on` ancestor); or an `escalate`/`abort` carrying a stray `to` |
| `stages[i].depends_on` | present but not an array, **or** references a stage id that does not exist |
| `stages.reachability` | the `depends_on` edges form a cycle (no enterable root ⇒ cannot terminate) |
| `hybrid.*` | a top-level `feedback_signal` / `definition_of_done` / `loop_pattern` alongside `stages[]` (per-loop fields belong inside a stage) |
| design-level | `stop_conditions` (non-empty-string **`success`** + non-empty-string `failure` + capped `max_iterations`) / `human_placement` / `maker_checker` / `risk_guards` / `harness_primitives` — same rules as the flat shape |

A complete staged design → all `PASS`, exit 0. See
`assets/golden-loop-design-medium.json` for a passing staged fixture.

## The loop docs (persisted artifact)

`scripts/render_loop_doc.mjs` turns a **linter-valid** design into a runnable
Markdown runbook and writes it to a fixed project directory:

```
node scripts/render_loop_doc.mjs <design.json> [--out <dir>] [--slug <name>]
```

- Default `--out` is **`.loop/`** at the project root (override for a visible
  path like `docs/loops/`). It writes `<out>/<slug>.loop.md` (the runbook) plus
  `<out>/<slug>.loop.json` (the checked spec).
- It **validates first** and **refuses to write** a doc for a design the linter
  rejects — no runbook is ever produced for a non-loop.
- The Markdown is a deterministic function of the design (no timestamps), so
  re-rendering the same design is byte-identical.
