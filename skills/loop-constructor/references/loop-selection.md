# The loop-selection procedure (D0–D7)

This is the **mechanism** the skill runs. The old skill said "pick the altitude
from blast-radius × reversibility × surface-area, decompose into phases, surface
the KB" — and left every hard call to judgment. This replaces that with an
**ordered decision procedure**: answer D0–D7 in order and the shape of the loop
is determined, with a one-line justification recorded for each. The output of
running this procedure is the **decision log** (D0–D7 answers) plus the filled
loop-design JSON.

Anchor (never skip): **a loop closes autonomously only when a fast, runnable
check can answer "is it done?"** — `principle.closed_loop_needs_a_check`. So
every decision below is downstream of "what check proves this stage is done?".

## D0–D7 at a glance

Answer **D0–D7 in order**; each answer determines part of the shape and is
recorded with a one-line justification (the **decision log**):

- **D0 — Is it a loop?** Name a fast runnable check that answers "done?" without a
  human reading output. No check and can't build one → route away (not a loop).
- **D1 — Decompose?** List phases; accept a stage boundary only where a stable,
  checkable artifact is handed across it (the *seam test*). 0 seams → flat; ≥1 →
  staged.
- **D2 — Per stage: pattern + check.** Pattern by the stage's failure mode; the
  cheapest check on the spectrum that still fails on that mode; fill
  `falsifiable_when` + `passing_but_wrong`.
- **D3 — Autonomy.** `in_the_loop` vs `on_the_loop` from blast-radius ×
  reversibility × feedback-quality (weakest check wins).
- **D4 — Parallelism.** Independent stages that benefit from fan-out → `large`
  (multi-agent); else `medium` (sequential).
- **D5 — Guards.** Per-stage caps + `on_failure` routing; outer budget + failure +
  escalate; risk guards with mitigations.
- **D6 — Iteration profile (cadence).** completeness-first (few long thorough
  passes) vs iteration-first (many short cheap passes), chosen from
  iteration-boundary cost vs check latency, then **re-tunes D2/D3/D5** (pattern,
  caps, scope, check-thoroughness). A *dial*, not a schema field; not
  linter-enforced, so the fresh-reader confirms the knobs match the claimed cadence.
- **D7 — Number provenance (closing sweep).** Run LAST — after the roles +
  contract (assertions carry numbers). Sweep every digit-bearing string; class
  each decision | definitional | empirical; route (pre-register / fix + red
  fixture / declare `derived`). One selection_log line.

The procedure is the **selection method** — it replaces altitude-by-vibes with a
reviewable derivation. Record the answers as the `selection_log` array.
Each D-item below is the full procedure for that decision.

---

## D0 — Is it a loop at all? (the gate)

> Can you name a **fast, runnable check** that answers "is this done?" **without a
> human reading the output**?

- **No, and you can't build one** → it is **not** an autonomous loop. Either
  (a) build the check first (write the failing test, add the assertion, define a
  diff/grep predicate, wire a smoke command), or (b) it's a one-shot judgment
  task — say so and **route away**. Do not design a loop around a check that
  doesn't exist; the linter will reject it.
- **Yes** → that check is your **anchor**. Record it. Proceed to D1.

Grounding: `principle.closed_loop_needs_a_check`, `principle.machine_verifiable_dod`.

---

## D1 — Decompose? (flat vs staged, and where the seams are)

1. **List the task's natural phases** in order (typical spines: *understand →
   change → verify*; *characterize → implement → harden*; *migrate module A →
   module B → cutover*).
2. For each adjacent pair, ask the **seam test** — is there a **stable, checkable
   artifact** handed from phase A to phase B that A must get right *before* B
   starts? (a captured baseline, a green characterization suite, an approved
   plan, a passing migration of module A). Each such handoff is a **gate** = a
   **stage boundary**.
3. **Accept a boundary only if all three hold** (else MERGE it into its neighbor —
   a too-fine boundary is just overhead):
   - (a) the upstream stage's check can run **without** the downstream stage existing;
   - (b) the upstream produces something the downstream **consumes unchanged**;
   - (c) the two stages don't edit the **same surface in conflicting ways**.
4. **Count accepted boundaries**: `0` → **flat** (one loop — the atomic unit).
   `≥1` → **staged** (a tree/sequence of gated sub-loops). Entering a loop usually
   means staged; flat is for a single genuinely-atomic change.

Grounding: `principle.separate_planning_from_execution`,
`procedure.explore_plan_implement_commit`, `procedure.canonical_loop`
(gate-after-every-stage). The staged *schema* is the skill's own
(`references/loop-design-shape.md`).

---

## D2 — Per stage: pattern + check

For **each** stage (and the flat loop if D1 = flat):

**Pattern** — pick by the stage's *dominant failure mode*:
| If the stage… | pattern |
|---|---|
| has an unknown solution / needs search | `explore_narrow` |
| has a clear plan, mechanical & retryable | `retry` |
| has a plan but is risky/ambiguous, needs mid-flight correction | `plan_execute_verify` |
| *is* a quality/correctness judgment on an artifact | `review` |
| is irreversible / high-blast / needs human approval each turn | `human_in_the_loop` |

**Check** — pick the **cheapest runnable check on the spectrum**
(lint → typecheck → test → build → diff → screenshot → logs → telemetry) that
still **FAILS on this stage's failure mode**. When the stage's DoD is a *quality /
taste* judgment no objective check can reach (visual design, prose voice, UX), the
check is a **calibrated rubric-scorer** — weighted axes, calibrated on good-vs-slop
reference exemplars, output = score + a paragraph, gate = a threshold
(`references/loops-model.md` §VI). It is still a runnable check (the evaluator runs
it), so the anchor holds. Then fill two clauses:
- `falsifiable_when` — the **concrete broken state** that makes this check FAIL
  (a real failure, NOT a restatement of the goal).
- `passing_but_wrong` — a **concrete** implementation that would pass this check
  but be wrong (so you can see the check is too weak and strengthen it), or
  `"none: <why the check is exhaustive>"`.

**Make the check DISCRIMINATE — assert the OUTCOME, not a proxy.** The most
common failure of a real-looking check is that it can pass while the work is
wrong. Watch for these traps (each is a real one independent review has caught):
- **Proxy, not outcome.** "the SQL string contains `LIMIT`" does not prove the
  driver returned ≤ N rows; "a 429 appeared" does not prove 429 only past the
  threshold. Assert the *observable result* (row count, status-by-input), not a
  surface token.
- **grep/diff that misses new/untracked files, or doesn't pin its reference.**
  `git diff --quiet -- tests/` (a) passes when a *new untracked* test file is
  added, AND (b) only inspects the *unstaged working tree* — it goes green again
  the moment you `git add`/commit the weakened test. To prove "tests unchanged
  since baseline", diff against a captured baseline **ref/tag**
  (`git diff <baseline-tag> -- tests/`) and include untracked files
  (`git status --porcelain` / `git ls-files -o`). State the polarity (must find
  **nothing** vs **something**). Same for coverage: `--cov=src` enforces an
  *aggregate* — scope it to the module under change (`--cov=<pkg>` / per-file
  thresholds) or it passes via unrelated well-tested code.
- **Statistical/soak checks without a quantified bound.** "soak surfaces latent
  failures" is empty unless you state the trial count and the residual rate it
  can detect at that count (e.g. 0 failures in 10⁴ trials bounds the residual at
  about 0.03% at 95% confidence, by the rule of three — it cannot vouch for a 0.01%
  one). Put the number in the check.
- **A repro that suppresses the bug.** Over-determinizing a concurrency repro
  (fixed schedule) can serialize away the very race it must catch — make RED
  reproducible without serializing the interleaving.
- **A contaminated baseline.** If a "unchanged vs baseline" check captures the
  baseline *after* code touches land, it compares against a poisoned reference.
  Capture the baseline as its own artifact in the first stage, before any change.
- **A property the output can't show.** If the DoD is a *mechanism* property
  invisible in the output — "pagination is server-side" (an in-memory slice
  returns the identical page), "no row-level race", an internal invariant — an
  output check cannot prove it. Either instrument the mechanism (query log /
  `EXPLAIN` / row-count probe / AST scan) or mark it human-verify-only and
  escalate. Do **not** claim `machine_verifiable: true` for a property the check
  can't observe.
- **Enumerate the whole class, not a sample.** A residual scan must cover every
  member of the class — `os.path.join` *and* `splitdrive`/`commonpath`/
  `expanduser`/`getsize` *and* aliased imports (`import os.path as p`) / `os.sep`
  concat — or use an AST scan. A partial pattern passes on the names it forgot.
- **Pin the pathspec, don't glob.** `git … -- src` (or `:(glob)src/**`), not
  `'src/**/*.py'` — git's `**` requires an intermediate directory and silently
  misses files directly under `src/`.
The `passing_but_wrong` field is where you write the specific trap above that
applies — and then strengthen the check until that trap fails it. **And accept
the honest limit:** for a genuinely hard property, the strongest *machine* check
may still be gameable; when so, say `machine_verifiable: false` for that clause
and route it through the maker/checker — an overstated `machine_verifiable: true`
is itself a hollow gate. A threshold that *defines* the violation (a near-miss
line, a mismatch tolerance) is a **definitional** number: fix it at design time
and give it a red fixture that proves the check can FAIL on it (D7 classifies;
a definitional number with no red fixture is a hollow gate wearing a number).

Grounding: `concept.feedback_signal_spectrum`, `doc.anatomy.loop_anatomy_and_patterns`,
`anti_pattern.reward_hacking`.

---

## D3 — Autonomy: human *in* vs *on* the loop

Score the design (and any high-stakes stage) on three axes:
- **blast radius** — how much can a wrong iteration break?
- **reversibility** — can you cheaply undo it?
- **feedback quality** — does the check *truly* catch the failure (or can it pass while wrong)?

> **`in_the_loop`** (human approves each iteration) when the blast radius is
> **high and** reversibility is **low**, or when a **weak check** (one that can pass
> while wrong) guards a high-blast **or** irreversible step. Otherwise
> **`on_the_loop`** (human reviews at the gates / at the end). A weak check on a
> low-blast, reversible step does not put a human into every iteration: name it as
> the current bottleneck (`loops-model.md` §IX) and strengthen the check.

Grounding: `principle.human_on_vs_in_loop`, `principle.autonomy_by_blast_radius`.

---

## D4 — Parallelism: sequential (`medium`) vs fan-out (`large`)

> Are there **≥2 stages with no dependency path between them** that could run as
> separate agents at the same time **and** where parallelism actually helps
> (independent work, no shared-write conflict)?

- **Yes** → `large` — multi-agent fan-out. Add roles, worktree isolation, and a
  shared-state ledger (`pattern.multi_agent_orchestra`,
  `<kb>/templates/multi_agent_plan.template.json`).
- **No** → `medium` — sequential gated stages, single agent.

`small` is never a valid altitude (if it were small you wouldn't be entering a loop).

---

## D5 — Guards: caps, failure routing, risk

- **Per stage**: a `max_iterations` retry cap + `on_failure` routing —
  `loopback` to an **upstream** stage (a `depends_on` ancestor), `escalate`,
  `abort`, or **`restart`** (discard this stage's work and re-derive it from the
  contract — LOOPS.md §V; the right move when a build has become archaeology, and a
  frontier model often ships a clean rewrite faster than it patches). Pick the exit
  by **what the failure accuses**, in the order of `loops-model.md` §V:
  **escalate → re-plane → loopback → restart, first hit wins.** A `restart` of the
  stage's own stalled work is autonomous — **don't insert a human to interrupt it.**
  Insert one at `escalate`, which has three grounds: the **contract** is wrong, the
  **task** is impossible or blocked, or a **fixer signature** fired (§V lists the
  five). Re-plane is not an `on_failure` value: it is the owner's disposition after
  an escalate stop, never a route the loop takes by itself.
- **Quantify the routing trigger BEFORE the run.** `restart`'s condition — "patching
  has stalled" — is a semantic judgment, and in flight it loses to optimism every
  time. Write every trigger as a **counter in the stop conditions before iteration 1**
  and let it fire mechanically: *"2 consecutive iterations whose failures are the
  same class → `restart`"* (own-work stall), *"a P0/P1 lands inside the previous
  iteration's own fix → STOP, `escalate` (owner first asks whether this judgment
  should be mechanized at all)"*, *"3 iterations without the failing assertion
  changing → `escalate`"*. Pre-register §V's fixer signatures as the first
  `stop_conditions.escalate` entries, ahead of the restart counters, and never seal
  the "impossible / blocked → escalate" exit. No in-flight discretion; no raising a
  counter from inside the loop. (The named failure: a seven-version patch-vs-break
  arms race over a deterministic gate; the audit and an independent attacker were
  present and read the non-convergence correctly — what the loop lacked was the
  authority to stop and ask whether the judgment belonged in code at all. KB
  `guidelines/loops.md` H4 + H-series verdict 2, `rules/constitution.md` A51.)
- **Design-level**: an outer `max_iterations` budget, a non-empty `failure`
  branch list, `escalate` triggers, and a non-empty `success` state.
- **Close the stop condition on BOTH sides.** A stop condition that only guards one
  direction is half a stop condition:
  - **Zero-change gate (anti-spin / anti-arms-race)** — *"N consecutive iterations
    with zero new changes → stop"*, N typically 1–2. This is the sharpest
    deterministic brake in the official harness guidance: a loop that can no longer
    change anything is not converging, it is buying iterations. Put it in
    `stop_conditions.failure` as its own branch.
  - **Minimum-progress gate (anti-premature-abandonment)** — state the floor below
    which "we're done / can't proceed" is **not** an accepted stop but an `escalate`:
    e.g. *"every stage gate must have been reached and attempted with a real diff
    before a stop is honoured"*. This side is not optional padding — the dominant
    failure mode flipped between model generations (repeated-failed-action 38.7% →
    6.3%; giving-up-early 25.8% → 50%), so a design that only guards the
    won't-stop side is guarding yesterday's failure.
  - **The caps live inside the condition.** `max_iterations` / time / token budget are
    written into `stop_conditions` itself, not left to external good will — and they
    are changed only *outside* the loop (by a human or a gate). A loop may **trip** a
    cap; it may never **raise** one, because "one more round and it converges" is
    exactly the judgment the cap exists to overrule.

  (KB `guidelines/loops.md` H5, `rules/constitution.md` A45(iv).)
- **Risk guards**: name each applicable anti-pattern + a concrete mitigation —
  reward hacking / test overfitting, error amplification, context drift, token
  blowup, permission blast radius, premature over-delegation.
- **Discovery-work stops are event-defined, not quota-defined.** For a stage whose
  work has unknown size (find all violations, harvest all callers), the stop is
  *"K consecutive fruitless rounds → dry"* (`technique.loop_until_dry`), never a
  fixed quota — a quota for unknown-size work is an imagined empirical magnitude
  (D7 would class it empirical, and there is nothing to derive it FROM at 0 runs;
  the K itself is a decision number, pre-registered like every other counter).

Grounding: `procedure.stop_gate`, `procedure.escalation_triggers`,
`technique.loop_until_dry`,
`anti_pattern.{reward_hacking,error_amplification,context_drift,token_blowup,permission_blast_radius}`.

---

## D6 — Iteration profile (cadence): completeness-first vs iteration-first

The structure (D0–D5) says *what* the loop is; D6 sets *how much to attempt per
pass vs how many passes to run*, then **re-tunes D2 / D3 / D5** to match. This is a
**dial, not a new schema field** — it manifests entirely through the existing
`loop_pattern` / `max_iterations` / per-stage scope / check-thoroughness choices.
Decide it from the **cost of an iteration boundary** (how expensive it is to
re-enter a pass) vs the **cost/latency of the check** (how expensive it is to ask
"done?"):

| | **completeness-first** (few, long, thorough passes) | **iteration-first** (many, short, cheap passes) |
|---|---|---|
| **Pick when** | re-entry/context-rebuild is expensive · the check is slow/costly (run it rarely, on a near-complete artifact) · cross-iteration thrash costs more than a long pass · the task rewards a coherent whole (design, contracts, a migration cutover) | the check is fast & cheap (sub-second), so frequent feedback is ~free · the solution space is unknown and incremental probing beats a big plan · small steps de-risk a fragile/ambiguous change |
| **`max_iterations`** | **low** (per-stage and outer; guidepost ≈ ≤4) — a pass is meant to land | higher (≈ 8+) — each pass is a small increment |
| **per-stage scope** | **large** — do the whole stage's work before checking | small — one slice per pass |
| **`loop_pattern`** | `plan_execute_verify` / `explore_narrow` (deliberate, mid-flight self-correction *within* a pass) | `retry` is fine (cheap re-attempt) |
| **check (`feedback_signal`)** | **thorough** — the full suite / an exhaustive predicate, not a fast smoke | fast smoke that runs every pass |
| **effort / `human_placement`** | higher effort per pass; `on_the_loop` review at the *few* gates | lower effort per pass; tighter loop |

**Procedure:** state the profile and the trade, then **revisit D2 (pattern), D3
(autonomy granularity), and D5 (caps + scope)** and set each as the table says.
Default to **completeness-first** when iteration boundaries are expensive or the
check is slow; **iteration-first** when feedback is fast and cheap. Mixed is legal
— a stage with a slow check can be completeness-first while a sibling with a fast
check is iteration-first; record the per-stage profile in the stage's rationale.
Completeness-first means "do each pass fully", never "guess all numbers before
pass 1" — empirical magnitudes stay derived (D7) even in the most thorough design.

**Honest caveat (the mislabel trap):** the profile is *not* linter-enforced. A
design can SAY `completeness_first` while carrying high caps + `retry` + a smoke
check — a mislabel the linter cannot catch. The **fresh-reader** (and the
maker/checker) must confirm the knobs actually match the claimed cadence: a
completeness-first design with `max_iterations: 12` and a one-line smoke check is
lying. `passing_but_wrong` for the cadence belongs in the fresh-reader pass.

Grounding: `pattern.plan_execute_verify`, `pattern.retry_loop`,
`concept.feedback_signal_spectrum`, `principle.machine_verifiable_dod`.

---

## After D6, before D7: assign the roles + negotiate the contract

D0 through D6 derive the *shape*. Two more moves — the LOOPS.md operating model
(`references/loops-model.md`) — turn that shape into a loop that won't converge on
slop. Both are **linter-enforced for staged designs** (and both produce numbers,
which is why D7 runs after them):

- **Assign the three roles (§II).** Fill `roles.{planner,generator,evaluator}` —
  three separate contexts. The **evaluator** is a fresh, adversarial context
  (`separate_context: true`, `adversarial: true`): it never saw the impl and is told
  to prove the artifact is broken. It IS the expanded `maker_checker`; a single
  agent that grades its own work turns sycophantic.
- **Negotiate the contract (§III).** *Before* filling stage DoDs, have the generator
  propose what "done" means and the evaluator push back until they agree on a
  checklist of **testable assertions** — the `contract.assertions[]`. Each is
  gradable (a check that can FAIL, or `human-verify:`) and mapped to the stage that
  proves it (or `cross-cutting`). Size it to the task (≈20 for an app-sized build).
  **The contract, not the original spec, is what the loop grades** — so every stage
  DoD in FILL should trace back to contract assertions, not restate the spec.

## D7 — Number provenance: the closing sweep

Every decision above has been pushing you to *put the number in the check* — and
that pressure has a failure mode: numbers get written that nobody can know yet.
D7 is the one decision that closes the procedure: run it **LAST** —
after D0 through D6 *and* after the roles + contract (assertions carry numbers too).

**The sweep:** grep the draft for every digit-bearing string — caps, counters,
thresholds, timeouts, budgets, sample sizes, percentages, pool sizes — don't
trust memory. Classify each:

| Class | What it is | Route |
|---|---|---|
| **decision** | willingness — what you are prepared to spend or lose: caps, stall counters, zero-change N, drift thresholds | keep it fixed; pre-register per D5; changed only outside the loop |
| **definitional** | violation semantics — what counts as broken: a near-miss line, a mismatch tolerance, an acceptance bar | fix it now AND name the red fixture that proves the check fails on it (D2) |
| **empirical** | a claim about the world: a ceiling, a timeout, a batch size, a sample size, an agreement rate, a crossover point, an anomaly line over an observed rate (its normal base rate is a world-fact) | do **not** write the value — declare it `derived` in `parameter_provenance` |

**Two tests, applied together** (either alone wavers on the hard cases):

- **Refutability** — *could a measurement, in principle, show this number wrong?*
  Yes → empirical. No, because it encodes what you are willing to spend or lose →
  decision. Refutable only by changing what "correct" MEANS → definitional.
- **Change-channel** — *who may legitimately change it, and when?* Inside the loop
  by the pre-registered formula → empirical. Only outside the loop, by the
  operator, with evidence, between runs → decision. Only by re-negotiating the
  contract, owing a red fixture → definitional.

The definitional line, verbatim: **would loosening this number let a
previously-red artifact pass? then it is definitional — fix it now and give it a
red fixture.**

**Boundary calls the tests settle:**

- **Caps and stall counters are decision — never derivable.** "One more round and
  it converges" is exactly the judgment the cap exists to overrule; a cap the loop
  can re-derive is an optimism amplifier, not a brake. A loop may **trip** a cap,
  never **raise** one (D5, unchanged). Derived parameters tune **harness
  magnitudes** — budgets within the operator's outer caps, timeouts, batch/pool
  sizes, cadences — and NEVER violation semantics. So split the near-synonyms: an
  iteration cap states willingness (never derived); a usage ceiling sized to what
  a normal run costs is an empirical anomaly brake — derived inside the outer
  willingness, shrink-conservative, trip → escalate, never raise.
- **Drift thresholds are decision.** "Drift >50% → unstable" *looks* refutable
  (drift is measured!) — but the threshold encodes how much surprise you tolerate
  before falling back conservative: willingness, not a world-claim. The
  change-channel test settles it: only the operator may move it, outside the loop,
  between runs — whereas an empirical value's whole point is that the
  pre-registered formula moves it *inside* the loop.
- **A sample size that claims something is empirical; a minimum sample floor is
  decision.** "A sample of ≥20 verdicts reaches ≥90% agreement" makes variance and
  attainability claims — measurement can refute it, and you cannot know it at 0
  runs, so it is `derived`. The minimum sample floor a calibrating stage collects
  before it trusts a derived value ("≥2 timed runs before the budget is computed")
  claims nothing about the world — it states how much evidence you insist on — so
  it is a decision number, marked "re-examine per design".
- **External facts** (a vendor rate limit, a published price/quota): file as
  FIXED, class decision or definitional, with a `why` naming the external source
  and a revisit date. Do not "derive" a published contract from your own run (it
  would measure the vendor's throttle behavior, not the contract).

**Routing an empirical number:** it becomes a `derived` entry in
`parameter_provenance` (fields in `references/loop-design-shape.md`):
the pre-registered formula, the calibrating stage (an ORDINARY stage, an ancestor
of every consumer, whose own check validates the runtime values artifact), the
consuming stages, the re-derivation cadence, the sample/censoring rule, and the
drift policy (threshold + conservative direction + `floor_trip`). If an empirical
number has **no plausible calibrating stage**, you have found a missing seam — go
back to D1. And buy the machinery only where it earns its keep
(`principle.verifier_asymmetry`): derivation is bought where measuring is cheaper
than the cost of being wrong; on a tiny design, filing everything as
decision-class with an **empty declaration** (`{fixed: [...], derived: []}`) is
honest and correct — a manufactured empirical parameter is the same lie in the
other direction.

**Emit exactly one selection_log line**, e.g.
`{"decision":"D7","answer":"2 decision / 2 definitional / 1 empirical -> characterize calibrates","why":"<the sweep>"}`.

The skill recommends **no default** for any drift threshold or minimum sample
floor (the floor above, not a sample size that claims variance): the FIELDS are required, the VALUES are per-design (each is itself a decision number —
mark it "re-examine per design"; the golden's examples say so too).

## Output of the procedure

1. The **decision log** — D0–D7, each with the answer + a one-line justification
   (this is what makes the shape *reviewable* instead of magic). Emit it as the
   `selection_log` array in the design JSON and in the report. D6 records the
   chosen iteration profile (completeness-first / iteration-first) and the trade;
   D7 records the class counts + who calibrates.
2. The filled **staged** (or flat) loop-design JSON per
   `references/loop-design-shape.md`.

Then VERIFY (linter + `assets/fresh-reader-checklist.md`) and PERSIST (render the
runbook). See SKILL.md.
