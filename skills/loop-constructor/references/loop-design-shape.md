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
    { "decision": "D5", "answer": "<caps + routing>", "why": "<the guard choices>" },
    { "decision": "D6", "answer": "<completeness_first | iteration_first>", "why": "<iteration-boundary cost vs check latency; how it tuned caps/pattern/scope/check-thoroughness>" },
    { "decision": "D7", "answer": "<N decision / N definitional / N empirical -> <stage> calibrates>", "why": "<the digit sweep: which numbers landed in which class>" }
  ],
  "parameter_provenance": {
    "fixed": [
      { "name": "<slug>", "value_or_location": "<the number, or where it lives>", "class": "decision | definitional", "why": "<one line>", "red_fixture": "<REQUIRED when definitional: the fixture proving the check can FAIL on it>" }
    ],
    "derived": [
      {
        "name": "<slug>",
        "formula": "<pre-registered derivation rule — fixed at design time; the VALUE is measured at run time>",
        "calibrated_by": "<EXISTING stage id — an ordinary stage whose check validates the runtime values artifact>",
        "consumed_by": ["<stage id — every consumer must have the calibrator as a depends_on ancestor>"],
        "cadence": "<when re-derived: pre-registered points, never in-flight judgment>",
        "sample_rule": "<sample + censoring: censored observations enter as LOWER BOUNDS, never dropped>",
        "drift_policy": {
          "threshold": "<the instability line — itself class decision, per design; no skill default>",
          "conservative_direction": "<which way the fallback moves on instability>",
          "floor_trip": "<predicate on the design's minimum-progress floor; trip routes to ESCALATE (or an honest 'floor n/a: <why>')>"
        }
      }
    ]
  },
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
        "on_failure": { "action": "loopback | escalate | abort | restart", "to": "<UPSTREAM stage id (a depends_on ancestor) — loopback ONLY; restart/escalate/abort carry no `to`>" }
      },
      "depends_on": ["<stage id>", "..."]
    }
  ],
  "human_placement": "in_the_loop | on_the_loop",
  "maker_checker": { "separate_checker": true, "scope": "<string>" },
  "roles": {
    "planner":   { "mandate": "<turns the goal into the spec+contract; never touches code>" },
    "generator": { "mandate": "<writes everything; may NOT grade its own work or weaken a check>" },
    "evaluator": { "separate_context": true, "adversarial": true, "mandate": "<fresh context that never saw the impl; told the artifact is broken, proves it>" }
  },
  "contract": {
    "negotiated_by": ["generator", "evaluator"],
    "assertions": [
      { "id": "<A1>", "must": "<testable claim>", "check": "<runnable check that can FAIL, or 'human-verify: <why>'>", "stage": "<stage id | cross-cutting>" }
    ]
  },
  "harness_primitives": ["<>=0 items>"],
  "stop_conditions": {
    "success": "<string — the proven done-state; name the minimum-progress floor below which an early stop escalates instead of counting as done>",
    "failure": ["<>=1 outer/full-loop branch — include the zero-change gate: 'N consecutive iterations with zero new changes'>"],
    "escalate": ["<trigger>", "..."],
    "max_iterations": 4
  },
  "risk_guards": [ { "risk": "<string>", "mitigation": "<string>" } ]
}
```

- **`selection_log`** — the D0–D7 decision trail from `references/loop-selection.md`
  (the **mechanism**): each entry is `{decision, answer, why}`. The linter does
  not gate it, but a design without it is incomplete — it's what makes the chosen
  shape reviewable rather than asserted. Emit it and surface it in the report. D6
  records the iteration profile (completeness-first / iteration-first) as a dial
  over the existing knobs — not a new linted field; D7 records the number-provenance
  class counts and which stage calibrates.
- **`loop_altitude`** — `medium` (sequential gated stages, single-agent) or
  `large` (+ parallel fan-out; see `pattern.multi_agent_orchestra`). `small` is
  **not** a valid altitude.
- **Each stage is a flat loop** carrying its own DoD + pattern + runnable check +
  per-stage cap. The anchor (`feedback_signal.check`) holds **per stage**.
- **`depends_on`** wires the gate: a stage is admitted only once every stage it
  depends on has passed its check (gate-after-every-stage; never advance past a
  failing gate). The design-level `stop_conditions.max_iterations` is the
  **outer** budget; each stage's `max_iterations` is its **inner** retry cap.
- **`roles`** (LOOPS.md §II — *Separate The Roles*) — three contexts, three
  system prompts: a **planner** that turns the goal into the spec+contract and
  never touches code, a **generator** that writes everything and is forbidden from
  grading its own work, and an **evaluator** that runs in a fresh context, is told
  the artifact is broken, and tries to prove it. Required for staged (a real
  multi-stage loop); the flat atomic unit leans on `maker_checker`. The evaluator
  IS the expanded `maker_checker` — `evaluator.separate_context` ⇔
  `maker_checker.separate_checker`. Mixing roles is the most common loop failure:
  the model turns sycophantic the moment it grades itself. An independent evaluator
  is a *conditional* purchase; when a design skips it and lets the runnable check be
  the arbiter, the check's **execution and result-writing must still sit outside the
  generator's write surface** (judging script + verdict file read-only to the
  generator, or a hook/wrapper it does not invoke) — say which in
  `maker_checker.scope`. Otherwise the generator patches the door and then stamps it
  (`references/loops-model.md` §II).
- **`contract`** (LOOPS.md §III — *Negotiate The Contract First*) — before the
  generator writes a line, the generator proposes what "done" looks like and the
  evaluator pushes back until they agree on a checklist of **testable assertions**.
  The **contract, not the original spec, is what gets graded.** Each assertion is
  gradable (a check that can FAIL, or an explicit `human-verify:`) and, for a
  staged design, traceable to the stage that proves it (or `cross-cutting`). Scale
  the count to the **surface**, and read the numbers as **lower bounds over
  machine-gradable assertions**: endpoint/function **≥ 8**, module **≥ 12**, app-sized
  **≥ 20**, each with a ceiling of 3× that bound so "thin contract" is never answered
  by padding. The linter's floor of 3 is a *different, lower* absolute anti-vacuity
  ground — clearing it clears the linter and still fails the sizing, so the
  fresh-reader judges real sufficiency (a contract too thin to disagree with gets
  rubber-stamped, which is the incident the bounds exist because of).
- **`restart`** (LOOPS.md §V — *Let The Loop Restart*) — a stage `on_failure.action`
  meaning *discard this stage's work and re-derive it from the contract* rather than
  patching a codebase that has become archaeology. It carries no `to` (it throws its
  own work away and re-enters — it does not reset an upstream gate). Restart is not
  a human-escalation trigger: insert a human only when the **contract** is wrong,
  not when a build is. Its trigger — "patching has stalled" — must be **quantified in
  the stop conditions before the run** ("2 consecutive same-class failures", "a
  top-severity defect inside the previous iteration's own fix"), never judged
  in-flight; the linter cannot check this, the fresh-reader does
  (`references/loops-model.md` §V).
- **`parameter_provenance`** (D7 — *number provenance*) — the declaration that
  classifies the design's numbers: one top-level key, exactly two arrays. An empty
  block is an affirmative claim ("this design has no empirical parameters"): legal
  and honest for a decision-only design, and exactly the claim the numbers-audit
  falsifies.
  - **`fixed[]`** — numbers legitimately fixed at design time. Each entry: `name` +
    `value_or_location` + `class` (`decision` | `definitional`) + one-line `why`;
    a `definitional` entry additionally carries `red_fixture` (the fixture proving
    its check can FAIL). `empirical` is **not** a fixed class: an empirical number
    may appear only as a derived entry. The class definitions and the two
    classification tests live in D7 (`references/loop-selection.md`) — this file
    only binds the syntax.
  - **`derived[]`** — empirical magnitudes (ceilings, timeouts, batch/sample
    sizes, agreement bars). The **design-time/run-time split**: the DESIGN fixes
    the contract — `formula`, `calibrated_by`, `consumed_by`, `cadence`,
    `sample_rule`, `drift_policy{threshold, conservative_direction, floor_trip}` —
    and the RUN produces the values. **Calibration is an ordinary stage**, not a
    new stage type: `calibrated_by` names an existing stage, a `depends_on`
    ancestor of every consumer, and *that stage's own check* validates the runtime
    values artifact (recommended shape per managed value:
    `{value, derived_from, measured_at, sample_n}`, named as a `harness_primitive`)
    and fails on any hand-filled value. Prove that check goes red on a hand-filled
    fixture before trusting it (`anti_pattern.unexercised_self_check`). The
    **linter never reads the runtime values file** (validate() is pure, no I/O):
    validating the artifact is the calibration stage's job.
  - **Re-derivation is formula-only, and conservative.** Values change only at the
    declared `cadence` by the declared `formula`; on drift past the (decision-class,
    per-design) `threshold` the value falls back in its `conservative_direction`;
    `floor_trip` bounds that conservative ratchet — its trip routes to **escalate**
    instead of tightening forever ("derived" is not a synonym for "true":
    `references/loops-model.md` §VIII·b). A parameter whose conservative direction
    grows *away* from the floor writes an honest `floor n/a: <why>`.
  - **Flat designs stay fully static.** Absence on flat is silent; a flat derived
    entry cannot resolve a calibrating stage (no stage graph to order one in) and
    FAILs — an atomic design wanting derived parameters has found a seam: revisit
    D1. A fixed-only declaration on flat is legal.

#### What the linter enforces for `parameter_provenance`

**WARN (advisory — never affects `ok`, the exit code, or renderer refusal):**

| Condition | Warns |
|-----------|-------|
| STAGED design, `parameter_provenance` key absent | `WARN parameter_provenance: …` — absence is back-compat legal (every pre-0.4 design keeps passing, exit 0); a NEWLY-emitted design is clean only at **zero FAIL and zero WARN** (SKILL.md VERIFY). Flat absence is silent. |

**FAIL (strict when the key is present):**

| Field | FAILs when |
|-------|------------|
| `parameter_provenance` | not an object with `fixed[]` **and** `derived[]` arrays (an unfilled half must be `[]`, never missing) |
| `fixed[i].name` / `.value_or_location` / `.why` | missing/empty |
| `fixed[i].class` | not `decision`/`definitional` (an `empirical` fixed entry FAILs — declare it derived instead) |
| `fixed[i].red_fixture` | missing/empty while `class` is `definitional` |
| `derived[i].name` / `.formula` / `.cadence` / `.sample_rule` | missing/empty |
| `derived[i].calibrated_by` | missing/empty, or naming a non-existent stage id (on flat: unresolvable by construction) |
| `derived[i].consumed_by` | not a non-empty array of stage ids; an entry naming a non-existent stage; an entry equal to `calibrated_by` (**self-calibration circle** — a stage may not derive the very bound it runs under); a consumer without the calibrator as a transitive `depends_on` ancestor (**ordering rule** — a consumer cannot run before, or parallel to, its calibrator) |
| `derived[i].drift_policy` | missing or not an object |
| `drift_policy.threshold` | missing/empty (non-empty string or finite number) |
| `drift_policy.conservative_direction` / `.floor_trip` | missing/empty |

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
| `roles` | missing (staged requires it); or any of planner/generator/evaluator missing a non-empty `mandate`; or `evaluator.separate_context !== true` / `evaluator.adversarial !== true` (the load-bearing separation — an evaluator that shares context or is neutral grades its own work / rubber-stamps) |
| `contract` | missing (staged requires it); `assertions` not an array of ≥ 3, **or fewer than 3 MACHINE-gradable assertions** (`human-verify:` entries don't count toward the floor — a floor met by rubber stamps is no floor); any assertion missing a non-empty `id` (unique) or `must`; an assertion's `check` missing, or an always-green no-op that can't FAIL (unless it is `human-verify: …`); an assertion's `stage` missing or naming a non-existent stage (traceability broken) |
| `stages[i].stop_conditions.on_failure` (restart) | `restart` is a valid action but carries no `to`; a `restart` (or `escalate`/`abort`) that names a `to` FAILs (a routing target is only meaningful for `loopback`) |
| design-level | `stop_conditions` (non-empty-string **`success`** + non-empty-string `failure` + capped `max_iterations`) / `human_placement` / `maker_checker` / `risk_guards` / `harness_primitives` — same rules as the flat shape |

A complete staged design → all `PASS`, exit 0. See
`assets/golden-loop-design-medium.json` for a passing staged fixture.

> **How the hollow-check analysis binds to a compound command.** The
> cannot-fail analyzer walks shell exit semantics: for `;`-chains and pipes the
> **last** segment decides the exit status (so that's what it judges); for `&&`
> every branch must be always-green to flag; for `||` any always-green branch
> flags. So `real-assert && …` is never flagged, and `… | grep -qx 0` is judged
> on the final `grep`. Two honest limits remain by design: a *custom* command
> that happens to always exit 0 is undecidable here, and the analyzer proves
> nothing about *what* a passing check asserts — both are exactly what
> `passing_but_wrong` + the fresh-reader exist to catch.

> **Attestation boundary (what a green linter does NOT prove).** Three fields are
> author-attested booleans the linter gates on but cannot verify:
> `machine_verifiable`, `roles.evaluator.separate_context`, and
> `roles.evaluator.adversarial`. A design can set them `true` while the mandate
> prose describes a generator grading itself — the linter makes the separation
> impossible to *omit*, the fresh-reader/maker-checker make it *true*
> (`references/loops-model.md` §III, "Honest limit"). The `parameter_provenance`
> declaration sits on the SAME boundary: the linter validates its shape and stage
> cross-references but never NLP-classifies prose numbers — an empirical literal
> hiding in a `must`/`success` string above an empty declaration lints green and
> is a lie. That residual belongs to the fresh-reader's numbers-audit box and the
> attacker stage, by design: a lexical number-scanner would false-fire on
> legitimate definitional numbers and train authors to hide numbers in prose.

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
