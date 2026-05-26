# develop-principle

`develop-principle` is an agent-first knowledge base for industrial skill development.

It treats a skill as a reusable capability package for agents: trigger rules, execution protocol, supporting materials, control boundaries, test assets, quantitative metrics, and lifecycle governance.

The library is optimized for multi-turn agent work:

- Short machine index first: read `AGENT_INDEX.md` and `INDEX.json`.
- Compact graph nodes: use stable ids and relations instead of duplicating long text.
- Long explanations on demand: detailed Markdown lives under `docs/`.
- Structured references: source metadata lives under `references/`.
- Testable artifacts: checklists, templates, metrics, and test strategy files are machine-readable.

## Main Paths

- `AGENT_INDEX.md`: shortest entrypoint for agents.
- `INDEX.json`: machine-readable file and coverage index.
- `docs/`: long-form design, testing, TDD, and metrics guidance.
- `knowledge_graph/`: compact nodes and edges for retrieval.
- `references/`: bilingual reference database with source summaries.
- `schemas/`: JSON schemas for core structured files.
- `templates/`: reusable planning, evaluation, and metric templates.
- `checklists/`: release and review gates.
- `testing/`: test planning matrices.
- `metrics/`: metric catalog and formulas.
- `decisions/`: architecture decision records.

## Source Policy

References use an independent `tier` field:

- Tier 1: method and workflow core.
- Tier 2: benchmark, evidence, or transferable theory.
- Tier 3: governance, risk, and boundary context.
- Tier 4: context or watchlist.

## Coverage

This library covers four required goals:

1. Industrial-grade skill design principles and standards.
2. Skill testing process design.
3. TDD planning for skill development.
4. Quantitative skill metrics and operational practice.

It also includes lifecycle infrastructure for industrial use: release gates, versioning, registry/distribution, observability, rollback, deprecation, and evidence-gated updates.

## Validation

Run:

```bash
node tools/validate_kb.mjs
node tools/evaluate_query_cases.mjs
node tools/check_context_budget.mjs
```

`evaluate_query_cases.mjs` simulates 20 skill-design requirements and verifies that the public indexes can route each requirement to relevant docs, graph nodes, and execution assets.

`check_context_budget.mjs` enforces the low-context contract for entrypoints, graph node summaries, and query fixtures.
