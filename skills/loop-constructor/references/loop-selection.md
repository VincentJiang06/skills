# The loop-selection procedure (D0–D5)

This is the **mechanism** the skill runs. The old skill said "pick the altitude
from blast-radius × reversibility × surface-area, decompose into phases, surface
the KB" — and left every hard call to judgment. This replaces that with an
**ordered decision procedure**: answer D0–D5 in order and the shape of the loop
is determined, with a one-line justification recorded for each. The output of
running this procedure is the **decision log** (D0–D5 answers) plus the filled
loop-design JSON.

Anchor (never skip): **a loop closes autonomously only when a fast, runnable
check can answer "is it done?"** — `principle.closed_loop_needs_a_check`. So
every decision below is downstream of "what check proves this stage is done?".

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
still **FAILS on this stage's failure mode**. Then fill two clauses:
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
  can detect at that count (e.g. 10⁴ trials catches a ~0.3% residual, not a 0.01%
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
is itself a hollow gate.

Grounding: `concept.feedback_signal_spectrum`, `doc.anatomy.loop_anatomy_and_patterns`,
`anti_pattern.reward_hacking`.

---

## D3 — Autonomy: human *in* vs *on* the loop

Score the design (and any high-stakes stage) on three axes:
- **blast radius** — how much can a wrong iteration break?
- **reversibility** — can you cheaply undo it?
- **feedback quality** — does the check *truly* catch the failure (or can it pass while wrong)?

> **`in_the_loop`** (human approves each iteration) when **high blast × low
> reversibility × weak check**. Otherwise **`on_the_loop`** (human reviews at the
> gates / at the end). When two axes pull opposite ways, the weakest check wins:
> a check that can pass-while-wrong forces a human in.

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
  `loopback` to an **upstream** stage (a `depends_on` ancestor), `escalate`, or
  `abort`.
- **Design-level**: an outer `max_iterations` budget, a non-empty `failure`
  branch list, `escalate` triggers, and a non-empty `success` state.
- **Risk guards**: name each applicable anti-pattern + a concrete mitigation —
  reward hacking / test overfitting, error amplification, context drift, token
  blowup, permission blast radius, premature over-delegation.

Grounding: `procedure.stop_gate`, `procedure.escalation_triggers`,
`anti_pattern.{reward_hacking,error_amplification,context_drift,token_blowup,permission_blast_radius}`.

---

## Output of the procedure

1. The **decision log** — D0–D5, each with the answer + a one-line justification
   (this is what makes the shape *reviewable* instead of magic). Emit it as the
   `selection_log` array in the design JSON and in the report.
2. The filled **staged** (or flat) loop-design JSON per
   `references/loop-design-shape.md`.

Then VERIFY (linter + `assets/fresh-reader-checklist.md`) and PERSIST (render the
runbook). See SKILL.md.
