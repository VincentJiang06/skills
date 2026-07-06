# 0002 Model-Internal Synthesis as a Tier-2 Source Class

Status: accepted

Date: 2026-07-06

## Context

This KB's quality bar (UPDATE.md) says "No URL + date, no entry" and "Primary
over secondary": every claim must trace to an external, dated source. That rule
was written for web-sourced facts. It has an unhandled case: a frontier model
(here, Claude Fable 5) carries a large amount of sound, mechanism-level
engineering knowledge that is not a transcription of any single external
write-up, yet is genuinely useful and often verifiable against this repo's own
build history. Under the letter of the old rule such knowledge could not enter
the KB at all, even when the owner judged it reliable and wanted it captured.

On 2026-07-06 the owner explicitly authorized admitting model-internal synthesis
as a source: "Fable 你自己就是一个极其强大的知识库…可以直接本地写 From FABLE 作为可靠信源."

## Decision

Admit **model-internal synthesis** as a recognized **tier-2** source class,
governed by the discipline captured in node `procedure.model_knowledge_sourcing`
and applied via reference `ref.fable.skill_engineering_synthesis_2026_07`:

- The reference entry uses `source_type: model_synthesis`, names the model and
  the authoring date, and its `url` identifies the authoring model (not an
  external write-up of the claims).
- Entry requires **explicit owner authorization** (this ADR is that record for
  the 2026-07-06 pass).
- `reliability_notes` must state plainly that the content is **not
  independently web-verified**.
- Mechanism-level guidance may sit at **tier-2**. It does **not** get tier-1.
- **Numbers are re-verified on use.** Any load-bearing number stays owned by the
  Fact Registry (UPDATE.md), which remains the single source of truth; a
  model-synthesis entry never overrides a Fact Registry value.
- **Upgrade-to-tier-1 when load-bearing:** when a claim from this class becomes
  the basis for tightening a gate, first hunt a tier-1 primary source and
  cross-check before acting on it.

## Consequences

- The quality bar's "no URL + date" rule now reads: an entry needs a *traceable
  origin* — a URL+date for web facts, or a named model + authoring date + this
  ADR's owner authorization for model synthesis. Substance checks (schema-valid
  is not true) are unchanged.
- This class is deliberately narrow: it is for mechanism knowledge, not for
  fashion or unverifiable specifics. Search-synthesis-flagged figures and
  low-confidence secondary numbers are still dropped or flagged in
  `reliability_notes`, exactly as before.
- The sister KB `loop-principle` inherits this decision via its own UPDATE.md
  pointer to this runbook; it may add a one-line cross-note in its own
  `decisions/` if its conventions want a local record.
