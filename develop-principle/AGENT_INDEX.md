# Agent Index

Read this file first. Load deeper files only when needed.

## Core Definition

`Skill = reusable capability package for an agent.`

A skill contains trigger rules, behavior protocol, supporting materials, control boundaries, test assets, quantitative metrics, and lifecycle rules.

## Fast Routes

- Industrial design: `docs/architecture/industrial_skill_design.md`
- Testing process: `docs/testing/skill_testing_process.md`
- TDD planning: `docs/testing/tdd_for_skill_development.md`
- Quantitative metrics: `docs/metrics/quantitative_skill_metrics.md`
- Lifecycle management: `docs/operations/skill_lifecycle_management.md`
- Knowledge base architecture: `docs/operations/knowledge_base_architecture.md`

## Machine Data

- File index: `INDEX.json`
- Nodes: `knowledge_graph/nodes/*.json`
- Edges: `knowledge_graph/edges/*.json`
- References: `references/*.references.json`
- Metric catalog: `metrics/metric_catalog.json`
- Test strategy: `testing/test_strategy_matrix.json`
- Query effectiveness: `testing/query_effectiveness_cases.json`
- TDD planning: `testing/tdd_planning_matrix.json`
- Schemas: `schemas/*.schema.json`
- Templates: `templates/*.template.json`
- Checklists: `checklists/*.json`

## Loading Rule

Start with `INDEX.json`, then load only the nodes whose `id`, `tags`, or `doc_ids` match the task. Do not load all Markdown files unless the task explicitly asks for a full audit.

## Node Budget

Each graph node is intentionally short. Use `doc_ids` and `reference_ids` to expand context.

## Validation

- Structure validation: `node tools/validate_kb.mjs`
- Query effectiveness: `node tools/evaluate_query_cases.mjs`
- Context budget: `node tools/check_context_budget.mjs`
