---
name: loop-constructor
description: >-
  Design the engineered loop for a medium/large (semi-)autonomous AI-coding task by
  decomposing it into gated sub-loops, emitted as a runnable .loop/ runbook. Use-when:
  "design an agent loop", "set up an autonomous / self-running agent workflow",
  "$loop-constructor". It DESIGNS the loop; it does NOT execute it.
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
pattern, autonomy, parallelism, cadence) into one **ordered, operational
selection procedure** — no more "use judgment + query the KB" hand-waving.

### 1. SELECT — run the decision procedure (`references/loop-selection.md`)
Answer **D0–D6 in order**; each answer determines part of the shape and is
recorded with a one-line justification (the **decision log**). The ordered
decisions: **D0** is-it-a-loop (name the runnable "done?" check or route away) ·
**D1** decompose (seam test → flat vs staged) · **D2** per-stage pattern + check
(+ `falsifiable_when`/`passing_but_wrong`) · **D3** autonomy (`in_the_loop` vs
`on_the_loop`) · **D4** parallelism (`large` fan-out vs `medium` sequential) ·
**D5** guards (caps + `on_failure` + risk guards) · **D6** iteration profile /
cadence (completeness-first vs iteration-first, a *dial* that re-tunes D2/D3/D5).
Load `references/loop-selection.md` and run the full procedure — each D-item there
is the operational decision rule. The procedure is the **selection method** — it
replaces altitude-by-vibes with a reviewable derivation. Record the answers as the
`selection_log` array.

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
Hand back: the **decision log** (D0–D6), the loop-design JSON, the lint result
(PASS), the fresh-reader verdict, a self-scored rubric
(`loop-principle/templates/loop_quality_rubric.template.json`), and residual risks.

## Grounding (KB path resolution)
The skill reads from the embedded **loop-principle KB** at `loop-principle/`
inside this skill folder. Installing `loop-constructor` installs the KB too. If
an operator deliberately overrides it with `$LOOP_PRINCIPLE`, use that absolute
path; otherwise default to `./loop-principle`. Do **not** hardcode-fail; if the
KB is absent, say so and degrade to the cited node ids in `references/`.
Retrieval recipe: `node <kb>/tools/query_kb.mjs "<topic>"`.

## Modules

| File | When to load |
|------|--------------|
| `references/loop-selection.md` | **Phase 1 (SELECT)** — the D0–D6 decision procedure that derives the loop shape + decision log. |
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
  D0–D6 and emit the decision log. A design without a decision log is incomplete.
- **Emit STAGED** unless D1 genuinely finds 0 seams. The flat shape stays valid
  as the atomic single-stage unit (linter still accepts it).
- **Reject-on-no-check (per stage).** A stage with no runnable feedback signal
  FAILs the linter; the anchor holds for every stage.
- **Mandatory caps.** Every stage + the outer loop carry a finite
  `max_iterations`; the stage graph must be acyclic.
- **Self-verification gate.** Return a design only after the linter PASSes and the
  fresh-reader checklist is clean.
- **Cite, don't assert.** Back design choices with loop-principle node ids.
