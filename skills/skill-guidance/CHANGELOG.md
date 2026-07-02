# Changelog — skill-guidance

## 2.0.0 — 2026-07-02

Pipeline-v2 refactor (design: `.loop/pipeline-v2.design.md`).

- **New executable spec gate** `scripts/validate_spec.mjs`: schema subset +
  consistency (7 pillars, score↔status, ratio/points arithmetic, verdict vs
  ratio bands + required-pillar cap, checklist `→` format, gap→action mapping,
  TODO/TBD ban). `--selftest` proves discrimination. The conductor reuses it as
  Stage G's gate; Step 7 requires exit 0 before emit.
- **Explicit dispositions (Step 0)**: plan-interactive / plan-pipeline /
  audit. Audit runs skip elicitation and write to
  `.skill-guidance/post-build-audit.json` (no more clobbering the build spec
  during final acceptance).
- Fixed `assets/handoff-spec.example.json`: it violated the required-pillar cap
  rule (altitude=full + metrics=absent must cap the verdict at draft, but it
  said candidate) — undetected while the rule lived only in prose.
- SKILL.md rewritten: 1,655 → ~1,415 always-loaded tokens; Modules table step
  labels fixed (spec-format is Step 7, not 6); sibling naming (installed
  `vince-` prefix) documented.
- Rules clarity: elicitation now has three dispositions; comparables' `<kb>`
  pointer corrected; scorecard/altitude name the script that enforces their
  arithmetic/cap tables.

## 1.x — pre-2026-07

See git history (initial industrial build via the conductor pipeline, 2026-06;
elicitation gate added in the skill-pipeline debug loop, 2026-06-23).
