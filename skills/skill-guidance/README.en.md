# skill-guidance

> Score a skill, scope it, find the gaps — and emit a handoff spec the next stage ingests directly.

**English** · [简体中文](README.md)

**What it does** — Evaluates a Claude Code skill or skill repo: scores it, scopes it, finds the gaps — and emits a schema-validated handoff spec for `skill-engineer`. It is STAGE 1 of the skill pipeline (planning / audit); it evaluates, it does not implement.

**Why it's good** —
- A **7-pillar readiness scorecard** grounded in the `develop-principle` KB tells you whether a skill is "industrial," what's missing, and how much.
- The output is a machine-consumable **contract** (schema-validated) that stage 2 `skill-engineer` ingests directly — no verbal handoff.
- Every judgment is cited from the KB, not recalled from memory — scoring is evidence-backed and gaps land as concrete, actionable items.
- **Asks before it assumes** — a context-sufficiency gate (`detect_context_gaps.mjs` + `rules/elicitation.md`) runs before build: if a decision-critical slot is missing it **asks a human** rather than burying a guess in `blocking_unknowns` (this skill's #1 failure mode).

**When to use** — "is this skill good / industrial-grade" · "score / audit / scope this skill" · "look at this SKILL.md / repo before building"; or call `/skill-guidance`.
**Not for** — implementation / writing code (→ skill-engineer); token restructuring (→ skill-zipper); blank scaffolding (→ skill-creator).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/skill-guidance ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
