# KB update log

One entry per refresh pass (see UPDATE.md Phase 5).

## 2026-07-06 — FABLE synthesis pass (owner-authorized; window: 2026-07-02..2026-07-06)

- Source of truth: an in-repo authoring doc written by Claude Fable 5 (the model)
  at the owner's explicit request; admitted as a tier-2 `model_synthesis` source
  under the new ADR below. Content treated as authoritative; only summaries
  trimmed to schema/budget limits, meaning unchanged.
- References added (5, all in `references/skill_engineering_extended.references.json`):
  `ref.fable.skill_engineering_synthesis_2026_07` (tier 2, the FABLE entry);
  and 4 external primary-source folds — `ref.agentskills.open_standard_2025_12`
  (Dec-2025 cross-vendor open standard, tier 1),
  `ref.claude_code.skill_listing_lifecycle` (CC listing budget/degradation +
  5k/25k compaction re-attach, tier 1),
  `ref.claude_code.invocation_controls` (disable-model-invocation /
  user-invocable, tier 1), `ref.snyk.toxicskills_2026_02` (ToxicSkills audit,
  tier 2).
- Nodes added (7): `principle.description_is_the_index`,
  `anti_pattern.sibling_trigger_overlap`, `principle.rule_at_point_of_use`,
  `principle.scripts_execute_dont_load`, `technique.import_the_validator`
  (core_nodes); `pattern.runtime_adapter_variant` (lifecycle_nodes);
  `procedure.model_knowledge_sourcing` (research_nodes). Wired bidirectionally
  into their pillars, with typed edges (adapted to the KB's edge enum:
  contains/supports/depends_on/contradicts/measures/uses) in the three edge
  files, and into the frontmatter `node_ids` of industrial_skill_design,
  knowledge_base_architecture, skill_testing_process, skill_lifecycle_management,
  and evidence_driven_skill_research (each with a short bilingual body section).
- ADR: `decisions/0002-model-synthesis-source.md` records the owner's 2026-07-06
  decision to admit model-internal synthesis (Claude Fable 5, "From FABLE") as a
  tier-2 source class with the `procedure.model_knowledge_sourcing` discipline.
  Added to INDEX.json as `decision.0002`.
- External triage (from scratchpad/new-knowledge-skills.md): folded the 4 above.
  Dropped as fashion / secondary-only / abstracts-only: #11 (>10% FP heuristic,
  blog), #12 (context-rot, blog), #13 (2.8% compression-quality figure,
  search-synthesis-flagged), #15 (900K marketplace count, low-confidence),
  #16 (POISE/SkillAttack/multimodal-scanner arXiv titles, not fetched),
  #17-#20 (monorepo scoping, !command, context:fork, Codex-vs-CC defaults —
  real but out of scope for this FABLE-focused pass; candidates for a later
  progressive-disclosure/portability update).
- Fact Registry deltas: NONE. Findings #5/#6/#14 re-confirmed the existing
  values (desc listing 1,536; listing budget ~1%; compaction 5k/25k; Snyk
  36.8%/13.4%) — all match, so no propagation to the four pipeline skills was
  needed. New sibling-vendor datum noted only, not a registry change: Codex caps
  its initial skills listing at "≤2% of context window or 8,000 chars"
  (`ref.agentskills.open_standard_2025_12` / Codex docs) — a Codex-specific cap,
  not a change to the portable 1,024 / CC 1,536 numbers. No PENDING-propagation.
- Tool fix (in-scope, this KB's tools/): `tools/build_indexes.mjs` `addToken`
  now uses `Object.prototype.hasOwnProperty` instead of `??=` — introducing the
  bare token "constructor" (from "loop-constructor") hit prototype pollution
  (`index["constructor"]` resolved to `Object.prototype.constructor`), crashing
  index generation. Robustness fix; output unchanged for existing tokens.
- Gates re-run GREEN: `node tools/run_all_checks.mjs` (KB validation 64 nodes /
  125 references / 18 metrics, query cases 27, context budget, doc
  traceability, fresh indexes). Read-only sibling sanity:
  `skills/skill-guidance/evals/run_all.mjs` → RESULT: GREEN. Not git-committed.

## 2026-07-02 — pipeline-v2 refresh (window: 2026-05-01..2026-07-02)

- Research: 2 workflow rounds × opus-xhigh subagents (official / community /
  model-guidance / eval-and-compat). Raw reports:
  `docs/skill-analysis/2026-07-02-research-round{1,2}-raw.json` (repo).
- Folded (highlights, all confirmed w/ URL+date): Agent Skills open-standard
  6-field core + limits (name ≤64, desc ≤1,024); Claude Code superset fields +
  1,536 listing truncation + ~1% shared listing budget + 5k/25k compaction
  re-attach; official skill-creator plugin eval loop (baseline delta, blind
  A/B, description tuning w/ 60/40 holdout + 3 runs); judge hardening (CoT
  safest, style bias 73–97%, swap risky); Snyk ToxicSkills security stats;
  behavioral RED = baseline-without-skill (superpowers); ALWAYS/NEVER→
  rule+rationale (H11); reasoning-brevity-caps harm (~3%, Apr postmortem).
- Dropped: marketplace catalog-size claims (scrape-inflated, unverifiable);
  ClawHub live-malware remediation status (unconfirmed past 2026-02-05).
- Propagated: pipeline-v2 refactor of the four skills (executable G/E gates,
  audit disposition, trigger-eval holdout upgrade, portability checklist —
  see each skill's CHANGELOG 2.0.0). Gates re-run green.
- Incident recorded: schema-valid placeholder ("summary":"test") from 2 of 4
  structured-output researchers → quality-bar rule #3 (schema-valid ≠ true).
