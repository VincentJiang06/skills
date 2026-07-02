# KB update log

One entry per refresh pass (see UPDATE.md Phase 5).

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
