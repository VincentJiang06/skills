# loop-principle — update log

## 2026-07-06 — FABLE in-session synthesis pass (owner-authorized)

Source of truth: an in-repo authoring document written directly by Claude Fable 5
at the owner's explicit request, admitted as a tier-2 `model_synthesis` source
(`ref.fable.loop_engineering_synthesis_2026_07`). Several items were confirmed
in this repo's own build history before entry (e.g. the unexercised-self-check
item reproduces loop-constructor-codex finding NB-1, fixed the same day).

### Added
- **1 FABLE reference**: `ref.fable.loop_engineering_synthesis_2026_07`
  (new file `references/fable.references.json`).
- **8 nodes** (all carry the FABLE reference):
  - `anti_pattern.green_but_wrong` (risk, tier 1)
  - `anti_pattern.unexercised_self_check` (risk, tier 1)
  - `anti_pattern.schema_terminal_placeholder` (risk, tier 2)
  - `principle.verifier_asymmetry` (feedback, tier 1)
  - `principle.positive_detection_for_invariants` (feedback, tier 2)
  - `technique.loop_until_dry` (anatomy, tier 1)
  - `technique.pipeline_no_barrier` (anatomy, tier 1)
  - `principle.effort_routing` (harness, tier 1)
- **19 typed edges** wiring the 8 nodes to existing nodes (types drawn from the
  KB enum; the authoring doc's "specializes"→`extends`, "warns-context"→
  `contextualizes`).
- **Parent/child** wiring updated on `pillar.risks`, `pillar.feedback`,
  `pillar.anatomy`, `pillar.harness`.
- **Doc frontmatter + short bilingual sections** in the risks, feedback,
  anatomy, and harness long-docs; INDEX coverage `primary_nodes` extended for
  the four pillars.

### External findings triage (`scratchpad/new-knowledge-loop.md`, Sonnet-searched)
Folded **4** as ordinary references (URL + date + real mechanism):
- `ref.anthropic.effective_harnesses_long_running` (#10, tier-1, primary Anthropic
  engineering blog) → linked from `concept.external_state_memory`.
- `ref.huntley.ralph_loop` (#6, tier-3 practitioner deep-dive; fresh-session +
  externalized-memory mechanism) → linked from `concept.external_state_memory`.
  Its anecdotal cost/token figures (#7/#8) were **dropped**, flagged in
  `reliability_notes`.
- `ref.anthropic.agent_sdk_budget_caps` (#4, tier-2; max_turns/max_budget_usd
  default to unlimited) → linked from `anti_pattern.token_blowup`.
- `ref.specbench.reward_hacking_scales_with_size` (#11, tier-2 arXiv; ~28pp/10x
  hacking gap) → linked from `anti_pattern.reward_hacking`. The 28pp figure is
  abstract-sourced only; `reliability_notes` flags re-verify-before-gating.

Dropped (reasons): #1/#2/#3/#5/#9/#19 (refinements of known ideas or
practitioner-blog framings, no strong novel primary); #7/#8 (anecdotal single-team
Ralph numbers — mechanism folded via #6, numbers not); #12/#13/#14/#15/#16/#17/#18/#20
(search-synthesis or secondary aggregation with unverified numbers, or off the
loop-principle core). Kept the fold to 4 to avoid crowding the FABLE pass.

### Gates re-run
- Baseline `node tools/run_all_checks.mjs`: GREEN before edits.
- Regenerated `build_indexes.mjs` + `generate_quality_report.mjs`; final
  `run_all_checks.mjs`: GREEN.
- Host skill battery `node skills/loop-constructor/evals/run_all.mjs`: GREEN.
