# 0001 — Loop-Principle as an agent-first mesh knowledge base

Status: accepted · Date: 2026-06-15

## Context

A deep-research run produced a comprehensive, vendor-neutral, cited survey of *loop engineering* (the 2025–2026 practice of designing a system that prompts the agent, rather than prompting it turn-by-turn). The output needed a durable home that another agent can consume cheaply across many turns — not a single long Markdown file.

## Decision

Persist the report as `loop-principle/`, mirroring the `develop-principle` architecture (a 网状 / mesh structure):

- **Compact graph** (`knowledge_graph/nodes/*`, `edges/*`) holds short bilingual nodes (8 pillars + ~47 nodes) and typed cross-pillar edges (defines / uses / mitigates / warns / enables / generalizes / contradicts). Long text lives in `docs/`, referenced by stable id.
- **Long docs** (`docs/<pillar>/*.md`) hold the report content, one focused doc per pillar plus a master survey (`docs/research/loop_engineering_survey.md`). Each carries machine front-matter (`machine_summary_*`, `node_ids`, `reference_ids`) so the index builder can produce summary cards.
- **References** (`references/*.references.json`) hold the source database with tiers 1–4 and reliability notes, preserving the research's confidence marks and caveats (OpenAI 403 mirrors, anachronism, vendor self-interest, refuted claim).
- **Generated indexes** (`indexes/*`) are built by `tools/build_indexes.mjs` (copied unchanged from develop-principle — it is path-relative): search index, graph adjacency, route map, summary cards.
- **Assets**: `templates/` (loop-design prompt + quality rubric), `checklists/` (good-loop review + safety boundary), `testing/query_effectiveness_cases.json` (routing), `schemas/` (node/reference/checklist).

## Consequences

- An agent starts at `AGENT_INDEX.md` → `indexes/summary_cards.json`, then expands only the nodes/docs it needs — low context per turn.
- Confidence and disagreement are first-class: nodes and docs carry ✓✓ / ✓ / ◐ / ⚠ marks; contested findings (observability-as-control-layer) and the refuted taxonomy claim are kept visible, not smoothed over.
- Regenerate indexes after any node/edge/doc change: `node tools/build_indexes.mjs`.
- This KB documents loop-engineering theory; it is descriptive, not a runnable loop harness.
