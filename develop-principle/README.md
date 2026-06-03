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
- `indexes/`: generated search, route, graph-adjacency, and summary-card indexes.
- `references/`: bilingual reference database with source summaries.
- `schemas/`: JSON schemas for core structured files.
- `templates/`: reusable planning, evaluation, and metric templates.
- `checklists/`: release and review gates.
- `testing/`: test planning matrices.
- `metrics/`: metric catalog and formulas.
- `reports/`: generated quality and coverage reports.
- `decisions/`: architecture decision records.

## Source Policy

References use an independent `tier` field:

- Tier 1: method and workflow core.
- Tier 2: benchmark, evidence, or transferable theory.
- Tier 3: governance, risk, and boundary context.
- Tier 4: context or watchlist.

## Coverage

This library covers these goals:

1. Industrial-grade skill design principles and standards.
2. Evidence-driven research / 资料搜集: breadth + depth source gathering, reliability grading, and claim traceability.
3. Skill testing process design.
4. TDD planning for skill development.
5. Quantitative skill metrics and operational practice.

It also includes lifecycle infrastructure for industrial use: release gates, versioning, registry/distribution, observability, rollback, deprecation, and evidence-gated updates, plus a registry of popular public skill repos (`references/skill_repos.registry.json`) to learn from on demand.

It does NOT write the skill's domain content for you, tune prompt wording, make buying/UX/product decisions, or run another tool's runtime.

## Validation

Run:

```bash
node tools/run_all_checks.mjs
```

Useful single checks:

```bash
node tools/build_indexes.mjs
node tools/query_kb.mjs "skill 发布前 release gate rollback"
node tools/scaffold_agent_principle.mjs init --target ../my-agent-project
node tools/evaluate_query_cases.mjs
```

`query_kb.mjs` uses those generated indexes to return matching docs,
nodes, assets, references, compressed summaries, and expansion hints for
a local agent query.

`scaffold_agent_principle.mjs` creates a consumer-side `AGENT.md` and
`.agent-principle/principle.mjs` wrapper so another local project can use
this KB for `plan`, `query`, and `audit` commands.

`run_all_checks.mjs` validates structure, generated index freshness,
query routing, context budgets, and doc traceability.
