# The operating model behind the shape (LOOPS.md)

The D0–D6 procedure and the linter enforce the loop's *structure*. This file is the
*operating model* the structure serves — the field-note rules that are **judgment,
not schema**, and so live here (and in the fresh-reader pass) rather than in
`lint_loop_design.mjs`. Cite them when they drive a design choice.

Source: Karpathy, *Field Notes on Agents That Run for Days* (`loops.md`, v060726).
Each rule below names where it lands in the design.

## The nine rules → where each lands

| # | Rule | Lands as |
|---|------|----------|
| I | Write the loop, not the prompt | the whole artifact — a runnable runbook, not a message |
| II | **Separate the roles** | `roles.{planner,generator,evaluator}` — **linter-enforced** for staged |
| III | **Negotiate the contract first** | `contract.assertions[]` — **linter-enforced** for staged |
| IV | Write to disk, not to context | `harness_primitives` name the durable state set (below) |
| V | **Let the loop restart** | `on_failure.action: "restart"` — **linter-accepted**; escalate only on a wrong contract |
| VI | Score the subjective | a calibrated-rubric `feedback_signal.check` (below) — D2 |
| VII | Read the traces | a debugging discipline + a harness primitive (below) |
| VIII | Delete the harness | a maintenance pass (below); tune degrees-of-freedom to the model |
| IX | The bottleneck always moves | name the current bottleneck in the report (below) |

Rules II, III, V are **structure** — the linter binds them (see
`loop-design-shape.md`). Rules IV, VI, VII, VIII, IX are **judgment** — the rest of
this file, checked by the fresh-reader, not the linter.

## II — Separate the roles (why the structure exists)

Three roles, three contexts, three system prompts. A **planner** turns the human
sentence into the spec+contract and never touches code. A **generator** writes
everything and is *forbidden from grading its own work*. An **evaluator** reads the
diff, runs the checks, plays the app, and is told from its first message that the
code is broken and its job is to prove it. Mixing them is the most common failure:
the model turns **sycophantic the moment it grades itself**, and the loop quietly
converges on slop (`principle.maker_checker_separation`,
`principle.adversarial_review_subagent`, `anti_pattern.reward_hacking`). This is why
`roles.evaluator` must be `separate_context: true` + `adversarial: true` — it is the
attacker sibling's stance, wired into the loop as a role.

## III — Negotiate the contract first (why the structure exists)

Before the generator writes a line, it proposes what "done" looks like and the
evaluator **pushes back** — the two argue via markdown on disk until they agree on a
checklist of testable assertions. **The contract, not the original spec, is what
gets graded.** Size it to the *surface*, not to a fixed number: a single
endpoint/function ≈ 8–12 assertions, a module ≈ 12–20, an app-sized build ≈ 20+;
~10 on an app is usually too few and the evaluator rubber-stamps. This is the single
change that most often moves a run from broken demo to working product
(`principle.machine_verifiable_dod`). The linter floors the count at 3
**machine-gradable** assertions (anti-vacuity — `human-verify:` entries don't count
toward the floor, or the floor could be met by rubber stamps) and checks each
assertion is gradable + stage-traceable; **you** (and the fresh-reader) judge
whether the count actually pins the behavior down.

**Honest limit of the linter (attestation boundary).** Like
`machine_verifiable: true`, the roles booleans (`separate_context`, `adversarial`)
are **author-attested** — the linter gates on the flags, it does not NLP-judge the
mandate prose. A design can set the booleans true while its mandates describe a
generator grading itself; only the fresh-reader (and the reviewer) can catch that
contradiction. The linter's job is to make the separation *impossible to omit
silently*; making it *true* is the maker/checker's.

## IV — Write to disk, not to context

Context windows compact and rot; a file on disk does not. A loop that must survive a
crash or a compaction keeps its state in a small, fixed set of files the agent
re-reads on resume (`concept.external_state_memory`). Name them in
`harness_primitives`:

- **`contract.md`** — the negotiated assertions (the graded criteria).
- **`progress.md`** / **`feature_list.json`** — what's done, what's next, per stage.
- **`log.md`** — append-only, one line per operation: `## [YYYY-MM-DD] op | title`.

The test: *the agent should be able to lose its session and pick up from these files
alone.* If you can't describe the loop's state in three files, the state is too
complicated. (This is also the compaction-survival contract — long runs re-read the
artifacts, they do not trust the summary.)

## V — Let the loop restart (and when to pick restart over loopback)

The best behavior of current frontier models is the willingness to throw a
sideways build away and ship a clean version two iterations later; older models
patched until the codebase resembled archaeology. So `restart` is a first-class
`on_failure` action, and **do not interrupt it with a human** — insert a human only
when the *contract* is wrong, not when a build is.

The routing rule (which failure action a stage gets):
- **`loopback`** when the failure implicates an **upstream artifact** — the input
  this stage consumed is wrong (a poisoned baseline, a stale plan). Reset that
  gate; your own work may be fine.
- **`restart`** when the stage's **own work** is the problem and patching has
  stalled — same-class failures recurring across retries, fixes that only add
  epicycles. Discard the stage's work, re-derive from the contract.
- **`escalate`** only when the failure impugns the **contract itself** (the agreed
  assertions are wrong or unsatisfiable) — that decision belongs to a human.

## VI — Score the subjective (a rubric as a check)

Taste is gradable if you write it down. When a stage's DoD is a **quality** judgment
an objective check can't reach (visual design, prose voice, UX, "does this feel
good"), the `feedback_signal.check` is a **rubric scorer**, not a test:

- **Weighted axes**, stated up front (e.g. design · originality · craft ·
  functionality), each 0–1.
- **Calibrated on references** the evaluator is told are good vs slop — typically 3
  exemplars each side — so the number means something.
- Output is a **score + a paragraph** naming the gap, and the gate is a threshold on
  that score.

The rubric-scorer is still a runnable check (the evaluator, in its fresh context,
runs it), so the anchor holds — but its `passing_but_wrong` is honest about the
residual: a rubric converges toward the taste you wrote down, no further. When the
best rubric is still gameable, mark that assertion `human-verify:` rather than
overstating `machine_verifiable: true`.

## VII — Read the traces

Every debugging insight about a loop comes from reading the raw transcript, not from
running another experiment. When a loop misbehaves: pipe the agent's output to a
file, **grep for the moment its judgment diverged** from yours, edit the prompt (or
the check, or the contract) for *that exact moment*, re-run. It is the same muscle as
reading a stack trace — the trace is just written in English, and most of it is the
model talking to itself. Make it possible: a **captured transcript / run-log** is a
`harness_primitive`, not an afterthought. Tuning by vibe without reading the trace is
the thing this rule forbids.

## VIII — Delete the harness

The harness exists to compensate for the model; as the model improves, half of what
you wrote last quarter becomes overhead. A harness that only ever **grows** is one
you have stopped reading. Two consequences for a design:

- **Prune, don't only add.** Re-read the harness against each model release and
  delete what the model now does for free (context-resetting babysitting, redundant
  step-by-step scaffolding, low-value per-task review). A leaner runbook that still
  passes its checks is a *better* deliverable, not a lazier one.
- **Match degrees-of-freedom to the model.** Give an open, well-understood task
  high-freedom prose and trust the model; reserve low-freedom, precise scripting for
  the genuinely fragile steps (the checks, the irreversible actions). Over-scaffolding
  a capable model is the same waste as under-specifying a fragile step.

## IX — The bottleneck always moves

When coding stops being the bottleneck, planning becomes it; when planning is solved,
verification; when verification is automated, taste. You do not *finish* a loop — you
find the next thing to fix, and the whole point of the loop is to make that next
bottleneck **visible**. So the report names it: *given this design, where is the
current bottleneck, and which stage/check is now the weakest link?* "Everything is
smooth" means you are not looking carefully enough — say what you would harden next.

## Grounding

`principle.separate_planning_from_execution`, `principle.maker_checker_separation`,
`principle.adversarial_review_subagent`, `concept.external_state_memory`,
`principle.machine_verifiable_dod`, `anti_pattern.reward_hacking`,
`anti_pattern.context_drift`, `procedure.canonical_loop`. Retrieval:
`node <kb>/tools/query_kb.mjs "<topic>"`.
