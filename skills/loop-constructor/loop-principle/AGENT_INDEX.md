# Agent Index

Read first. Load deeper files only when needed.

`Loop engineering = designing the system that prompts the agent` (finds work,
dispatches it, checks results, records state, decides next) instead of a human
prompting turn-by-turn. At its core it is verification engineering.

## Scope

Covers: a neutral, cited 2025–2026 survey of loop engineering — definition and
the prompt→context→harness→loop progression; the academic lineage (ReAct,
Reflexion, Self-Refine); loop anatomy and patterns; feedback/verification and
observability; the harness/tooling layer (hooks, worktrees, subagents, memory);
stop conditions, human placement, and multi-agent governance; costs/risks/
failure modes; a quality rubric, adoption roadmap, and misconceptions.
Does NOT: ship a runnable loop harness, write your domain code, or settle the
field's open disagreements (it surfaces them).

## Routes

- Foundations / definition: `docs/foundations/loop_engineering_foundations.md`
- Lineage (ReAct/Reflexion/Self-Refine): `docs/lineage/theoretical_lineage.md`
- Anatomy + patterns: `docs/anatomy/loop_anatomy_and_patterns.md`
- Feedback / verification / observability: `docs/feedback/feedback_verification_observability.md`
- Harness + tooling: `docs/harness/harness_and_tooling_layer.md`
- Stop conditions / human / multi-agent: `docs/governance/stop_conditions_and_multi_agent.md`
- Costs / risks / failure modes: `docs/risks/costs_risks_failure_modes.md`
- Adoption / rubric / misconceptions: `docs/practice/adoption_rubric_misconceptions.md`
- Measurement / loop-quality metrics: `docs/measurement/loop_metrics.md`
- Master survey (full report): `docs/research/loop_engineering_survey.md`
- Extended reading lists (86-source bibliography): `docs/reading/*.md`

## Data

- Files: `INDEX.json`; Indexes: `indexes/*.json`
- Graph: `knowledge_graph/nodes/*.json`, `knowledge_graph/edges/*.json`
- References: `references/*.references.json`
- Assets: `templates/*`, `checklists/*`, `testing/*`, `schemas/*`, `decisions/*`

## Loading

Start with `INDEX.json` or `indexes/summary_cards.json`. Use summary cards
first, then load matching nodes and expand via `doc_ids` / `reference_ids` and
`indexes/graph_adjacency.json`. Nodes stay short; don't load all Markdown unless
doing a full read.

## Confidence marks (used in nodes & docs)

`✓✓` verified 3–0 · `✓` verified 2–1 (contested) · `◐` sourced but not
independently verified / synthesis · `⚠` open question.

## The one load-bearing idea

A fast, machine-runnable check is what closes the loop autonomously. Without one,
"looks done" is the only signal and you become the verification loop. See
`principle.closed_loop_needs_a_check`.

## Commands

- `node tools/build_indexes.mjs` — regenerate the 4 indexes after editing nodes/edges/docs.
- `node tools/run_all_checks.mjs` — full self-validation (must stay green before shipping).
- `node tools/query_kb.mjs "<query>"` — local retrieval over the generated indexes.
