# Agent Index

Read first. Load deeper files only when needed.

`Skill = reusable agent capability package`: trigger, protocol, resources,
evidence base, controls, tests, metrics, lifecycle.

## Scope

Covers: industrial skill design; evidence-driven research / 资料搜集 (breadth +
depth, source grading, claim traceability); testing; TDD; quantitative metrics;
low-context KB + retrieval; lifecycle (release / version / rollback /
deprecation); plus a registry of popular public skill repos to learn from.
Does NOT cover: writing the skill's domain content for you, prompt wording,
buying / UX / product calls, or running another tool's runtime.

## Routes

- Design: `docs/architecture/industrial_skill_design.md`
- Research / 资料搜集: `docs/research/evidence_driven_skill_research.md`
- Testing: `docs/testing/skill_testing_process.md`
- TDD: `docs/testing/tdd_for_skill_development.md`
- Metrics: `docs/metrics/quantitative_skill_metrics.md`
- Lifecycle: `docs/operations/skill_lifecycle_management.md`
- KB + Retrieval: `docs/operations/knowledge_base_architecture.md`, `docs/operations/local_retrieval_workflow.md`
- Reading lists: `docs/research/skill_engineering_reading_list.md`, `docs/research/skill_ops_reading_list.md`, `docs/research/skill_reference_library.md`

## Data

- Files: `INDEX.json`; Indexes: `indexes/*.json`
- Graph: `knowledge_graph/nodes/*.json`, `knowledge_graph/edges/*.json`
- References: `references/*.references.json`; Skill repos: `references/skill_repos.registry.json`
- Metrics: `metrics/metric_catalog.json`; Tests: `testing/*.json`
- Schemas / Templates / Checklists: `schemas/*`, `templates/*`, `checklists/*`

## Loading

Start with `INDEX.json` or indexes. Use `summary_cards.json` first, then load
matching nodes and expand via `doc_ids` / `reference_ids`. Nodes stay short.
Don't load all Markdown unless doing a full audit.

## Retrieval breadth / depth

`query_kb.mjs "<q>"` defaults to low-context `standard`; pass `--broad` /
`--exhaustive` (or `--routes` / `--hops` / `--limit` / `--max-tier` / `--kinds`)
for 超多资料搜集. Output `search_plan` echoes the active breadth/depth.

## Commands

- `node tools/query_kb.mjs "<query>"` · `node tools/run_all_checks.mjs`
- `node tools/scaffold_agent_principle.mjs init --target <dir>`
- `node tools/fetch_skill_reference.mjs <repo.id> <skill-path>` — fetch a public skill to learn from
