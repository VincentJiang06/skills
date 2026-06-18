---
name: loop-constructor
description: >
  Design the engineered loop for a medium/large (semi-)autonomous AI-coding task
  — decomposing it into gated sub-loops — and emit a filled, machine-checkable
  loop-design spec, persisted as a runnable .loop/ runbook in the project. It
  DESIGNS and teaches loop design; it does NOT execute the loop. Applied
  front-end over the loop-principle KB (reuses its templates/checklists, doesn't
  restate them). Anchor: design backward from "what check proves this is done?"
  (loop engineering ≈ verification engineering). Use-when: "how should I design
  a loop for X", "design an agent loop", "set up an autonomous loop / self-running
  agent workflow", "$loop-constructor". Do-NOT (route away): (1) "reword this
  prompt" / single-shot prompt engineering — not a loop design; (2) "now actually
  run the loop / build the feature" — designs, does not execute; (3) "add a node
  to loop-principle" / edit the KB — KB authoring, out of scope; (4) non-agentic
  / non-loop or domain questions (album/audio/course) — route to relevant skill.
---

# loop-constructor

Design the engineered loop for a medium/large (semi-)autonomous coding task —
**decomposing it into a tree of gated sub-loops** — and emit a **filled,
machine-checkable loop-design JSON** that `scripts/lint_loop_design.mjs` PASSes,
then persist it as a runnable runbook under the project's `.loop/` directory.

**The anchor (read first):** a loop closes autonomously only when a fast,
machine-runnable check can answer "is it done?". So design **backward from the
check** — `principle.closed_loop_needs_a_check`. *No runnable check ⇒ it is not
a loop; the linter rejects it.*

This skill is the applied front-end over the **loop-principle KB**. It does not
restate theory — it RETRIEVES from the KB and REUSES its templates/checklists by
path. Resolve the KB path once (see "Grounding" below), then cite node ids for
every design judgment instead of asserting from memory.

## Preflight

1. Confirm the request is to **DESIGN a loop** — not run one (route away), not
   edit loop-principle (KB authoring, route away), not reword a single prompt.
2. Restate the target task in one line, then pick the **loop altitude** —
   `medium` or `large` (**never `small`**: entering a loop at all means the task
   is big enough to decompose), from blast-radius × reversibility × surface-area.
3. **Decompose** the task into independently-checkable phases — the *stages* of
   the loop, each closed by its own gate. Surface the KB's splitting nodes
   (`references/loop-principle-map.md` → "Decomposition"); do not invent a method.
4. Resolve the KB path and warm up retrieval:
   `node <loop-principle>/tools/query_kb.mjs "loop anatomy patterns feedback"`.
   (Optional preflight checklist: `loop-principle/checklists/loop_preflight.checklist.json`.)

## The 9-step protocol

Work the steps in order; each maps to KB node ids (see
`references/loop-principle-map.md`). Fill the canonical **staged** loop-design
object as you go (shape in `references/loop-design-shape.md`; the linter binds to
those keys).

**How the steps apply to a staged design:** steps 1–4 (DoD · pattern · feedback
signal · stop conditions) are filled **per stage** — each stage is itself a flat
check-first loop, and the anchor (a runnable check) holds for *every* stage.
Steps 5–8 (human placement · maker/checker · harness · risk guards) and the
outer `stop_conditions` budget are **design-level**. Wire stages with
`depends_on` so a stage is admitted only once the stages it depends on have
passed their checks (gate after every stage; the graph must be acyclic).

1. **Definition of Done** — write a single *machine-verifiable* goal as a
   predicate/command, never prose. Reuse
   `loop-principle/templates/dod_spec.template.json`.
   → `principle.machine_verifiable_dod`
2. **Pattern** — pick one of `retry | plan_execute_verify | explore_narrow |
   review | human_in_the_loop`; state its fit + failure mode.
   → `doc.anatomy.loop_anatomy_and_patterns`, `pattern.retry_loop`
3. **Feedback signal** — the cheapest runnable check on the spectrum
   (lint → typecheck → tests → build → diff → screenshot → logs → telemetry)
   that still catches the failure class. **If no runnable check exists, REJECT.**
   For every stage's check, also fill **`falsifiable_when`**: the concrete broken
   state that makes the check FAIL. Self-test: *describe a passing-but-wrong
   implementation that still satisfies this check* — if you can, the check is too
   weak (a no-op the loop would reward-hack); strengthen it. The linter only gates
   that `falsifiable_when` is **present**; judging its quality is your job (and the
   fresh-reader pass below), not the linter's — keep the linter dumb and honest.
   → `concept.feedback_signal_spectrum`, `principle.closed_loop_needs_a_check`, `anti_pattern.reward_hacking`
4. **Stop conditions** — success + a non-empty `failure` branch list + escalate
   triggers + a **mandatory `max_iterations`/budget cap**.
   → `procedure.stop_gate`, `procedure.escalation_triggers`
5. **Human placement** — `in_the_loop` vs `on_the_loop`, decided by
   blast-radius × reversibility × feedback-quality.
   → `principle.human_on_vs_in_loop`, `principle.autonomy_by_blast_radius`
6. **Maker/checker** — a separate, fresh-context adversarial reviewer scoped to
   correctness / stated requirements only.
   → `principle.maker_checker_separation`, `principle.adversarial_review_subagent`
7. **Harness primitives** — hooks / worktrees / subagents / external-memory /
   connectors.
   → `concept.harness`, `technique.git_worktree_isolation`,
   `concept.external_state_memory`, `technique.hooks_as_deterministic_gate`
8. **Risk guards** — flag each with a mitigation: reward hacking / test
   overfitting, error amplification, context drift, permission blast radius,
   token blowup, premature over-delegation.
   → `anti_pattern.{reward_hacking,error_amplification,context_drift,token_blowup,permission_blast_radius}`
9. **Emit + persist + self-score** — output the filled **staged** loop-design
   JSON, run the linter (below), then **persist the runbook** to the project:
   `node scripts/render_loop_doc.mjs <design.json>` writes
   `.loop/<slug>.loop.md` (a runnable runbook) + `.loop/<slug>.loop.json` (the
   checked spec). Add a self-scored rubric
   (`loop-principle/templates/loop_quality_rubric.template.json`) and residual
   risks. Tell the user the two written paths.

## Verify (eat the dogfood)

Run the linter on the produced JSON **before** returning it:

```
node scripts/lint_loop_design.mjs <produced-design.json>
```

It must print all `PASS` lines and exit 0. Any `FAIL <field>: <reason>` means the
design is not check-first/complete — fix it and re-run. Return the design only
after the linter PASSes.

`render_loop_doc.mjs` re-validates before writing and **refuses to emit a runbook
for a design the linter rejects** — so a successfully written `.loop/` doc is
itself proof the design passed. A `REFUSED:` line means fix the design and re-run.

**Fresh-reader pass (do this — the linter can't).** The linter checks *structure*,
not *meaning*: it cannot tell whether a check actually discriminates. Before
returning, re-read the emitted design cold and confirm, for each stage: (a) the
`check` is a command you could literally run and that would FAIL on a broken
implementation (not `echo done` / `true` / grepping the agent's own log); (b) the
`falsifiable_when` names a real broken state, not a restatement of the goal; (c)
the failure branches are reachable from that check's failure modes; (d) the
`maker_checker.scope` names a concrete adversarial target. If any fails, fix the
design — a green linter on a hollow check is exactly the trap this pass exists to
catch.

## Report

Hand back: the loop-design JSON, the lint result (PASS), the self-scored rubric
verdict, and residual risks.

## Grounding (KB path resolution)

The skill reads from the **loop-principle KB**. Resolve its path in this order:
1. In this repo: `../../loop-principle` (relative to the skill dir).
2. After deploy to `~/.claude` or `~/.agents`: the KB must be installed/pointed
   to alongside — set `$LOOP_PRINCIPLE` or pass the absolute path. Do **not**
   hardcode-fail; if the KB is absent, say so and degrade to the cited node ids
   in `references/`. Retrieval recipe: `node <kb>/tools/query_kb.mjs "<topic>"`.

## Modules

| File | When to load |
|------|--------------|
| `references/loop-principle-map.md` | The 9 steps + the **Decomposition** table → loop-principle node ids + docs + which templates/checklists to reuse, and the query_kb recipe. |
| `references/loop-design-shape.md` | The exact canonical loop-design JSON keys the linter validates — both the **flat** and the **staged** (medium/large) shapes, plus the loop-docs persist contract. |
| `scripts/lint_loop_design.mjs` | The deterministic verifier. Accepts flat **or** staged designs. CLI (`node ... <design.json>` / stdin) or `import { validate }`. |
| `scripts/render_loop_doc.mjs` | Renders a linter-valid design into a runnable Markdown runbook and writes `.loop/<slug>.loop.{md,json}` (override dir with `--out`). Validates first; refuses to write an invalid design. |
| `assets/golden-loop-design.json` | A passing **flat** fixture (the atomic single-stage unit). |
| `assets/golden-loop-design-medium.json` | A passing **staged** (medium-altitude) fixture — copy it as the starting point for a decomposed design. |
| `evals/run_all.mjs` | Re-runnable adversarial battery (40 cases: 12 flat + 28 staged/renderer) over the linter + renderer; `node evals/run_all.mjs`. |

## Controls

- **Design-only — persist, don't execute.** Writing the loop-design JSON + the
  runbook to `.loop/` is producing the design *artifact* (like the pipeline
  siblings writing their specs) — that is allowed. Never run the designed loop,
  run the target's code, or modify the loop-principle KB.
- **Emit STAGED.** The skill produces a `medium`/`large` staged design (a tree of
  gated sub-loops), never a `small`/flat one. The flat shape stays valid only as
  the atomic single-stage unit the linter still accepts for back-compat.
- **Reject-on-no-check (per stage).** A design with no runnable feedback signal is
  rejected; in a staged design the anchor holds for **every** stage (a stage with
  no check FAILs the linter).
- **Mandatory caps.** Every stage carries its own `stop_conditions.max_iterations`,
  and the design carries an outer `stop_conditions.max_iterations` + a non-empty
  `failure` list. The stage graph must be acyclic (an enterable, terminating loop).
- **Self-verification gate.** Return a design only after the linter reports PASS.
- **Cite, don't assert.** Back design choices with loop-principle node ids.
