---
name: loop-constructor
description: >
  Design the engineered loop for a medium/large (semi-)autonomous AI-coding task
  — by running an explicit selection procedure (D0–D5) that decomposes it into a
  tree of gated sub-loops — and emit a filled, machine-checkable loop-design spec
  plus a decision log, persisted as a runnable .loop/ runbook in the project. It
  DESIGNS and teaches loop design; it does NOT execute the loop. Applied
  front-end over the loop-principle KB (reuses its templates/checklists, doesn't
  restate them). Anchor: design backward from "what check proves this is done?"
  (loop engineering ≈ verification engineering). Use-when: "how should I design a
  loop for X", "design an agent loop", "set up an autonomous loop / self-running
  agent workflow", "$loop-constructor". Do-NOT (route away): (1) "reword this
  prompt" / single-shot prompt engineering — not a loop design; (2) "now actually
  run the loop / build the feature" — designs, does not execute; (3) "add a node
  to loop-principle" / edit the KB — KB authoring, out of scope; (4) non-agentic
  / non-loop or domain questions (album/audio/course) — route to relevant skill.
---

# loop-constructor

Design the engineered loop for a medium/large (semi-)autonomous coding task by
running an **explicit selection procedure** that decomposes it into a **tree of
gated sub-loops**, then emit a **machine-checkable loop-design JSON** (which
`scripts/lint_loop_design.mjs` PASSes) plus a **decision log**, and persist it as
a runnable runbook under the project's `.loop/`.

**The anchor (read first):** a loop closes autonomously only when a fast,
machine-runnable check can answer "is it done?". So design **backward from the
check** — `principle.closed_loop_needs_a_check`. *No runnable check ⇒ it is not a
loop; the linter rejects it.*

This skill is the applied front-end over the **loop-principle KB**. It does not
restate theory — it RETRIEVES from the KB and REUSES its templates/checklists by
path. Resolve the KB path once (see "Grounding"), then cite node ids for design
judgments instead of asserting from memory.

## The mechanism: SELECT → FILL → VERIFY → PERSIST

Four phases. The redesign moves all the hard calls (is-it-a-loop, decompose,
pattern, autonomy, parallelism) into one **ordered, operational selection
procedure** — no more "use judgment + query the KB" hand-waving.

### 1. SELECT — run the decision procedure (`references/loop-selection.md`)
Answer **D0–D5 in order**; each answer determines part of the shape and is
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

The procedure is the **selection method** — it replaces altitude-by-vibes with a
reviewable derivation. Record the answers as the `selection_log` array.

### 2. FILL — write the loop-design JSON (`references/loop-design-shape.md`)
The decisions above mostly determine the spec. Fill the canonical **staged**
object (or **flat** if D1 found 0 seams): per-stage `definition_of_done` (a
machine-verifiable predicate, not prose) · `loop_pattern` · `feedback_signal`
(`check` + `expect:"pass"` + `falsifiable_when` + `passing_but_wrong`) ·
`stop_conditions` (per-stage cap + `on_failure`) · `depends_on`; and
design-level `loop_altitude` (+rationale) · `human_placement` · `maker_checker`
(a fresh-context adversarial reviewer scoped to correctness/requirements) ·
`harness_primitives` · outer `stop_conditions` (with a non-empty `success`) ·
`risk_guards`. Include the `selection_log`. Reuse KB templates by path
(`references/loop-principle-map.md`).

### 3. VERIFY — linter + fresh-reader (eat the dogfood)
Run the linter on the produced JSON **before** returning it:
```
node scripts/lint_loop_design.mjs <produced-design.json>
```
It must print all `PASS` and exit 0. Any `FAIL <field>: <reason>` → fix and re-run.

Then do the **fresh-reader pass** with the operational template
`assets/fresh-reader-checklist.md` — the linter checks structure, not *meaning*.
Re-read the design cold and confirm, per stage, that the `check` would actually
fail on a broken impl, `falsifiable_when` is a real break (not a goal
restatement), `passing_but_wrong` is an honest concrete false-pass, failure
branches are reachable, and `success` matches what the checks prove. A green
linter on a hollow check is the exact trap this pass exists to catch.

### 4. PERSIST — render the runbook
```
node scripts/render_loop_doc.mjs <design.json>   # writes .loop/<slug>.loop.{md,json}
```
`render_loop_doc.mjs` re-validates first and **refuses to emit a runbook for a
design the linter rejects** — a written `.loop/` doc is itself proof the design
passed. A `REFUSED:` line → fix the design and re-run. Tell the user the two paths.

## Report
Hand back: the **decision log** (D0–D5), the loop-design JSON, the lint result
(PASS), the fresh-reader verdict, a self-scored rubric
(`loop-principle/templates/loop_quality_rubric.template.json`), and residual risks.

## Grounding (KB path resolution)
The skill reads from the **loop-principle KB**. Resolve its path in this order:
1. In this repo: `../../loop-principle` (relative to the skill dir).
2. After deploy to `~/.claude` / `~/.agents`: set `$LOOP_PRINCIPLE` or pass the
   absolute path. Do **not** hardcode-fail; if the KB is absent, say so and
   degrade to the cited node ids in `references/`. Retrieval recipe:
   `node <kb>/tools/query_kb.mjs "<topic>"`.

## Modules

| File | When to load |
|------|--------------|
| `references/loop-selection.md` | **Phase 1 (SELECT)** — the D0–D5 decision procedure that derives the loop shape + decision log. |
| `references/loop-design-shape.md` | **Phase 2 (FILL)** — the exact canonical loop-design JSON keys the linter validates (flat + staged shapes + the persist contract). |
| `references/loop-principle-map.md` | KB grounding: each decision/field → loop-principle node ids + docs + which templates/checklists to reuse, and the query_kb recipe. |
| `assets/fresh-reader-checklist.md` | **Phase 3 (VERIFY)** — the operational fresh-reader template (per-stage + design-level boxes the linter can't check). |
| `scripts/lint_loop_design.mjs` | The deterministic verifier. Flat **or** staged. CLI or `import { validate }`. |
| `scripts/render_loop_doc.mjs` | Renders a linter-valid design into a runnable runbook; validates first, refuses invalid. |
| `assets/golden-loop-design.json` | A passing **flat** fixture (the atomic single-stage unit). |
| `assets/golden-loop-design-medium.json` | A passing **staged** fixture — copy as the starting point for a decomposed design. |
| `evals/run_all.mjs` | Re-runnable adversarial battery over the linter + renderer; `node evals/run_all.mjs`. |

## Controls

- **Design-only — persist, don't execute.** Writing the loop-design JSON + the
  runbook to `.loop/` is producing the design *artifact*. Never run the designed
  loop, run the target's code, or modify the loop-principle KB.
- **Run the selection procedure.** Don't pick a shape by vibes — derive it from
  D0–D5 and emit the decision log. A design without a decision log is incomplete.
- **Emit STAGED** unless D1 genuinely finds 0 seams. The flat shape stays valid
  as the atomic single-stage unit (linter still accepts it).
- **Reject-on-no-check (per stage).** A stage with no runnable feedback signal
  FAILs the linter; the anchor holds for every stage.
- **Mandatory caps.** Every stage + the outer loop carry a finite
  `max_iterations`; the stage graph must be acyclic.
- **Self-verification gate.** Return a design only after the linter PASSes and the
  fresh-reader checklist is clean.
- **Cite, don't assert.** Back design choices with loop-principle node ids.
