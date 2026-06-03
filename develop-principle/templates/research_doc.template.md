# Research Doc: <topic>

machine_summary_zh: <用 1-2 句写清本调研结论和对 skill/agent 工程的影响。>

machine_summary_en: <Summarize the research conclusion and engineering impact in 1-2 sentences.>

reference_ids: `ref.example`

node_ids: `pillar.design`

## 1. Research Question

- Question:
- Decision this research should support:
- In scope:
- Out of scope:
- Target user / agent:

## 2. Source Inventory

| Source id | Type | Reliability | What it is used for |
|---|---|---|---|
| `ref.example` | official_doc / paper / code / benchmark / issue | high / medium / low | <claim area> |

Rules:

- Every source used in findings must exist in `references/`.
- Do not cite raw URLs in body text when a `ref.*` id exists.
- Mark unstable sources, version-specific behavior, and date-sensitive facts.

## 3. Findings

| Finding id | Claim | Evidence ids | Confidence | Notes |
|---|---|---|---|---|
| F-1 | <directly supported claim> | `ref.example` | high / medium / low | <limits or caveats> |

Rules:

- A finding is not valid without at least one evidence id.
- Separate observed source claims from your inference.
- Do not merge conflicting sources; record the conflict explicitly.

## 4. Inferences

| Inference id | Based on findings | Engineering implication | Risk if wrong |
|---|---|---|---|
| I-1 | F-1 | <what the skill/agent should do> | <failure mode> |

Rules:

- Inferences must cite finding ids, not raw sources directly.
- Use low confidence when evidence is indirect, outdated, or environment-specific.

## 5. Decisions

| Decision id | Decision | Based on | Status | Owner |
|---|---|---|---|---|
| D-1 | <adopt / reject / defer> | I-1 | accepted / rejected / deferred | <owner> |

Rules:

- Decisions must be actionable.
- Deferred decisions must list missing evidence.

## 6. Required Asset Updates

| Asset type | Target id/path | Required change | Based on |
|---|---|---|---|
| node / doc / reference / template / checklist / test / metric | <id or path> | <change> | D-1 |

Rules:

- If no asset update is needed, explain why.
- Prefer updating existing ids over creating duplicates.

## 7. Test And Validation Plan

- Static checks:
- Query cases to add or update:
- Template/checklist/schema changes:
- Metrics or gates affected:
- Regression risks:

## 8. Unknowns And Follow-up

| Unknown | Why it matters | Next evidence to collect | Blocking |
|---|---|---|---|
| <unknown> | <impact> | <source/test/action> | yes / no |

## 9. AI Writing Constraints

- Do not present unsupported claims as facts.
- Do not hide uncertainty; use `Confidence` and `Unknowns`.
- Do not paste long source excerpts; summarize and cite `ref.*` ids.
- Do not mix source observation, inference, and decision in the same table row.
- Do not create new nodes/docs/templates unless the decision requires reuse.
- Do not change release or lifecycle assets without a validation plan.
- Keep `machine_summary_zh` and `machine_summary_en` short enough for summary cards.
- Keep the final document in this section order unless a human reviewer approves a deviation.

## 10. Final Summary

- Main conclusion:
- Accepted decisions:
- Deferred decisions:
- Assets to update:
- Validation required before implementation:
