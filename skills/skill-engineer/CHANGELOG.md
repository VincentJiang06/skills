# Changelog — skill-engineer

## 2.0.0 — 2026-07-02

Pipeline-v2 refactor (design: `.loop/pipeline-v2.design.md`).

- **New executable E gate** `scripts/validate_report.mjs`: schema validation,
  all-green totals, spec-P0 join, adversarial-checklist coverage join, harness
  **re-run** (stale `command_output` fails), genuine-red-log check.
  `--selftest` proves discrimination (9 traps). Step 6 self-gates with it; the
  conductor runs the same script at Stage E.
- **trigger_eval upgraded to the official skill-creator loop**: `--runs N`
  majority voting and `"holdout": true` cases with an independently-gated
  held-out slice (anti-overfitting). Schema extended (`runs`, `split`,
  per-case `votes`/`holdout`). Trigger eval is now part of Step 5 at full
  altitude (was a side note).
- **Behavioral RED defined**: for pure LLM-behavioral skills the red artifact
  is a baseline-without-skill transcript (`.skill-engineer/red/baseline.md`) —
  closes the long-standing "what is red for prose skills" gap.
- **Security lint** (verification-harness §5): secrets / shell-injection /
  undeclared fetch / interactive-script sweep, any hit = P0 gap.
- **Naming & portability rules** for built skills (build-design-units):
  dir==name, ≤64 chars, reserved-word ban, portable 6-field core vs
  Claude-Code-only fields, `compatibility` prerequisites, non-interactive
  relative-path scripts; `allowed-tools` is CLI-only (SDK ignores it) — never
  the sole control.
- **LLM-judge hardening** in grading: CoT-forced verdicts, strip markdown
  before comparison (style bias is 73–97%), no order-swap on adversarial
  outputs; with/without-skill baseline delta at full altitude.
- SKILL.md rewritten: 1,702 → ~1,498 always-loaded tokens; run-evals vs
  verification-harness "supersedes" tension resolved (one bar, one workflow);
  gating-vs-touching restructured as a decision table.

## 1.x — pre-2026-07

See git history (initial build 2026-06; verification-harness anti-gaming
hardening + trigger_eval port, 2026-06-21..23).
