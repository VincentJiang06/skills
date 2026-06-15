# loop-principle map — 9 steps → KB grounding

This is a **thin pointer**. The substance lives in the loop-principle KB; cite
these node ids and load the templates/checklists by path instead of restating
theory. Resolve `<kb>` per SKILL.md "Grounding" (in-repo `../../loop-principle`;
after deploy, `$LOOP_PRINCIPLE` or an absolute path installed alongside).

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

## Checklists to reuse (load on demand, do not restate)

- `<kb>/checklists/loop_preflight.checklist.json` — before designing.
- `<kb>/checklists/loop_design_review.checklist.json` — review the design.
- `<kb>/checklists/good_loop_review.checklist.json` — self-score a good loop.
- `<kb>/checklists/loop_safety_boundary.checklist.json` — stop/escalate/permission.
- `<kb>/checklists/loop_observability.checklist.json` — telemetry/auditability.

All 19 node ids above were verified present in the KB at build time (grouped in
`<kb>/knowledge_graph/nodes/*.json` and resolvable via `query_kb`).
