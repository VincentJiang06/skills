# loop-principle map — 9 steps → KB grounding

This is a **thin pointer**. The substance lives in the loop-principle KB; cite
these node ids and load the templates/checklists by path instead of restating
theory. Resolve `<kb>` per SKILL.md "Grounding": default to the embedded
`loop-principle/` directory inside this skill; `$LOOP_PRINCIPLE` may override it.

## Retrieval recipe

```
node <kb>/tools/query_kb.mjs "<topic>"            # standard retrieval
node <kb>/tools/query_kb.mjs "<topic>" --broad    # wider net
```

Start from `<kb>/AGENT_INDEX.md` and `<kb>/indexes/summary_cards.json`, then
expand into the node files under `<kb>/knowledge_graph/nodes/*.json` and the docs
under `<kb>/docs/`.

## Anchor

- `principle.closed_loop_needs_a_check` — a fast machine-runnable check is what
  closes a loop autonomously. No check ⇒ not a loop.
- `principle.machine_verifiable_dod` — "done" must be a predicate a script can
  evaluate, not prose.

## Step → node ids → reuse

| # | Step | Grounding node ids | Reuse by path |
|---|------|--------------------|---------------|
| 1 | Definition of Done | `principle.machine_verifiable_dod` | `<kb>/templates/dod_spec.template.json` |
| 2 | Pattern | `doc.anatomy.loop_anatomy_and_patterns`, `pattern.retry_loop` | `<kb>/docs/anatomy/loop_anatomy_and_patterns.md` |
| 3 | Feedback signal | `concept.feedback_signal_spectrum`, `principle.closed_loop_needs_a_check` | `<kb>/docs/feedback/feedback_verification_observability.md` |
| 4 | Stop conditions | `procedure.stop_gate`, `procedure.escalation_triggers` | `<kb>/checklists/loop_safety_boundary.checklist.json` |
| 5 | Human placement | `principle.human_on_vs_in_loop`, `principle.autonomy_by_blast_radius` | `<kb>/docs/governance/stop_conditions_and_multi_agent.md` |
| 6 | Maker/checker | `principle.maker_checker_separation`, `principle.adversarial_review_subagent` | `<kb>/checklists/loop_design_review.checklist.json` |
| 7 | Harness primitives | `concept.harness`, `technique.git_worktree_isolation`, `concept.external_state_memory`, `technique.hooks_as_deterministic_gate` | `<kb>/docs/harness/harness_and_tooling_layer.md` |
| 8 | Risk guards | `anti_pattern.reward_hacking`, `anti_pattern.error_amplification`, `anti_pattern.context_drift`, `anti_pattern.token_blowup`, `anti_pattern.permission_blast_radius` | `<kb>/docs/risks/costs_risks_failure_modes.md` |
| 9 | Emit + self-score | `procedure.canonical_loop` | `<kb>/templates/loop_design.template.md`, `<kb>/templates/loop_quality_rubric.template.json` |

## Decomposition (medium/large altitude) → node ids → reuse

A medium/large task is **a tree/sequence of gated sub-loops**, not one flat loop.
Before filling `stages[]`, SURFACE the KB's existing decomposition substance —
do **not** re-author a splitting method. Retrieval recipe:

```
node <kb>/tools/query_kb.mjs "decompose break large task into milestones gated phases"
```

| Concern | Grounding node ids | Reuse by path |
|---|------|--------------------|
| Split before doing (the "plan ≠ execute" defense against diligently building the wrong thing) | `principle.separate_planning_from_execution`, `procedure.explore_plan_implement_commit` | `<kb>/docs/anatomy/loop_anatomy_and_patterns.md` |
| Each stage's inner loop (plan → small steps → verify each, revise mid-flight) | `pattern.plan_execute_verify` | `<kb>/docs/anatomy/loop_anatomy_and_patterns.md` |
| How far to scale the effort (manual → semi-auto → tooled → multi-agent → org) | `procedure.adoption_roadmap` | `<kb>/docs/practice/adoption_rubric_misconceptions.md` |
| Large-altitude parallel fan-out (roles / isolation / shared-state ledger) | `pattern.multi_agent_orchestra` | `<kb>/templates/multi_agent_plan.template.json`, `<kb>/docs/governance/stop_conditions_and_multi_agent.md` |
| The staged spine itself (gate after every stage; never advance past a failing gate) | `procedure.canonical_loop` (already cited at step 9, here as the per-stage anchor) | — |

> **Surface vs author.** The splitting *theory* lives in these 5 KB nodes — cite
> them, don't restate. The staged *schema* (the `stages[]` array, `depends_on`
> edges, the gate-after-every-stage rule, the acyclic/reachability requirement)
> is structure authored in this skill (`references/loop-design-shape.md`): the KB
> has no node describing a gated staged-sub-loop schema, so the skill owns it.

## Checklists to reuse (load on demand, do not restate)

- `<kb>/checklists/loop_preflight.checklist.json` — before designing.
- `<kb>/checklists/loop_design_review.checklist.json` — review the design.
- `<kb>/checklists/good_loop_review.checklist.json` — self-score a good loop.
- `<kb>/checklists/loop_safety_boundary.checklist.json` — stop/escalate/permission.
- `<kb>/checklists/loop_observability.checklist.json` — telemetry/auditability.

> **`loop_design.template.md` is the per-STAGE frame.** That KB template renders
> *one* flat plan-execute-verify loop — i.e. a single stage. The staged envelope
> (`stages[]` / `depends_on` / `loop_altitude` / per-stage `on_failure`) is the
> skill's own shape in `references/loop-design-shape.md`, and the rendered runbook
> comes from `scripts/render_loop_doc.mjs`, not from the KB template directly.

All grounding ids above (the 9-step table + the Decomposition table) were verified
present in the KB at build time and resolve via `query_kb`: **node** ids
(`principle.* concept.* pattern.* procedure.* technique.* anti_pattern.*`) live in
`<kb>/knowledge_graph/nodes/*.json`; **doc** ids (the `doc.*` entries, e.g.
`doc.anatomy.loop_anatomy_and_patterns`) are long-docs under `<kb>/docs/`, not
nodes — they appear here for their grounding content, shown with their path in the
"Reuse by path" column.
