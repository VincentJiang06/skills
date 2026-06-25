# loop-principle

`loop-principle` is an agent-first knowledge base for **loop engineering** — the emerging 2025–2026 practice of designing a system that prompts the agent (discovers work, dispatches it, checks results, records state, decides the next step) instead of a human prompting it turn-by-turn.

It is a neutral, source-traceable survey, not a runnable tool. It is embedded inside `loop-constructor` and shares the mesh architecture used by `skill-principle`.

It is optimized for multi-turn agent work:

- Short machine index first: read `AGENT_INDEX.md` and `INDEX.json`.
- Compact graph nodes: stable ids + typed relations instead of duplicated long text.
- Long explanations on demand: detailed Markdown lives under `docs/`.
- Structured references: bilingual source metadata with tiers lives under `references/`.
- Confidence is first-class: every node/doc carries ✓✓ / ✓ / ◐ / ⚠ marks, and contested or refuted findings are kept visible.

## Agent placement

Infrastructure for `skills/loop-constructor/`, not a separate skill. It lives at
`skills/loop-constructor/loop-principle/` in this repo and installs as
`<agent-home>/skills/loop-constructor/loop-principle/`. Edits must pass
`node tools/run_all_checks.mjs`.

## Main paths

- `AGENT_INDEX.md`: shortest entrypoint for agents.
- `INDEX.json`: machine-readable file and coverage index.
- `docs/`: nine pillar docs + a master survey + three annotated reading lists.
- `knowledge_graph/`: 9 pillars + 73 compact nodes and 60 typed cross-pillar edges (single connected component).
- `indexes/`: generated search, route, graph-adjacency, and summary-card indexes.
- `references/`: 86-source database across 12 themed files (Osmani, OpenAI, Anthropic, Datadog, ReAct/Reflexion/Self-Refine, MemGPT/Mem0, SWE-bench, METR, …), tiered.
- `metrics/`: a 10-metric loop-quality catalog (effectiveness/autonomy/integrity/cost/control).
- `templates/`: loop-design prompt, DoD spec, multi-agent plan, escalation/run/retro records, quality rubric.
- `checklists/`: design-review, pre-flight, good-loop, safety-boundary, observability gates.
- `testing/`: query-routing cases, quality gates, context budgets, doc-traceability, search aliases, template contracts.
- `schemas/`: 13 JSON schemas for the structured files.
- `tools/`: a self-validating toolchain (`run_all_checks.mjs` must stay green).
- `reports/`, `decisions/`: generated quality report + architecture decision records.

## The nine pillars

1. **Foundations** — definition, the prompt→context→harness→loop stack, reconciling framings.
2. **Theoretical lineage** — ReAct, Reflexion, Self-Refine, the formal stop predicate.
3. **Anatomy & patterns** — Explore-Plan-Implement-Commit; retry / plan-execute-verify / explore-narrow / review / human-in-the-loop.
4. **Feedback, verification & observability** — the check that closes the loop; machine-verifiable DoD; the verification bottleneck.
5. **Harness & tooling** — five primitives + memory, hooks, worktrees, subagents, CDP-per-worktree.
6. **Governance** — stop gates, escalation, maker/checker, adversarial review, human on/in-loop, multi-agent isolation.
7. **Costs & risks** — error amplification, reward hacking, comprehension debt, cognitive surrender, context drift, security, token blowup.
8. **Adoption, rubric & misconceptions** — the roadmap, the good-loop rubric, the five misconceptions.
9. **Measurement** — quantifying loop quality across effectiveness, autonomy, integrity, cost, and control.

## Source policy

References use an independent `tier` field:

- Tier 1: method/workflow core (how to design, run, verify, stop a loop).
- Tier 2: academic lineage or empirical risk evidence.
- Tier 3: governance, risk, boundary context.
- Tier 4: secondary reporting / ecosystem signal.

## The one load-bearing idea

A fast, machine-runnable check is what closes the loop autonomously. Without one, "looks done" is the only signal and you become the verification loop ([Anthropic](https://code.claude.com/docs/en/best-practices)). The bottleneck has moved from writing code to trusting it ([Datadog](https://www.datadoghq.com/blog/ai/harness-first-agents/)) — so loop engineering is, at root, verification engineering.

## Regenerate & validate

After editing any node, edge, doc, reference, or asset:

```bash
node tools/build_indexes.mjs            # rebuild the 4 indexes
node tools/generate_quality_report.mjs  # refresh reports/kb_quality_report.json
node tools/run_all_checks.mjs           # full self-validation — must stay green
```

`run_all_checks` chains index-freshness, the quality report, `validate_kb` (schema/graph/reference/index integrity), `evaluate_query_cases` (retrieval routing), context-budget, and doc-traceability. Like skill-principle, this KB only ships when all checks pass. `node tools/query_kb.mjs "<query>"` runs local retrieval over the generated indexes.

## Provenance

Built from an adversarial deep-research run (5 angles · 25 sources · 124 claims extracted · 24 confirmed / 1 refuted). See `docs/research/loop_engineering_survey.md` and `decisions/0001-loop-principle-mesh.md`. Generated 2026-06-15.
