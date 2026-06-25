# 0001 Low-Context Knowledge Base Architecture

Status: accepted

## Context

The primary reader of this library is an agent that develops skills across many turns. Large JSON blobs or long always-loaded Markdown files would waste context and reduce adherence.

## Decision

Use `skill-principle/` as the root directory and organize it as a low-context knowledge base:

- `AGENT_INDEX.md` is the shortest human/agent entrypoint.
- `INDEX.json` maps goals, files, and reference tiers.
- `knowledge_graph/nodes/*.json` stores compact bilingual nodes.
- `knowledge_graph/edges/*.json` stores id-to-id relations.
- Long explanations live under `docs/`.
- Structured references live under `references/`.
- Templates, checklists, metrics, and testing matrices are separate execution assets.

## Consequences

Agents should load the shortest relevant path first, then expand through `doc_ids` and `reference_ids`. Long explanations must not be duplicated into nodes. If a node becomes long, it must be split into a short node plus a Markdown document.

