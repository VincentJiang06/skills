# Changelog

## [0.1.0-draft] — 2026-07-14

Ground-up build. One skill replaces the old four-skill pipeline (guidance / engineer / zipper / conductor), re-derived from the `skill-philosophy` KB — every rule cites a KB anchor.

- **Thin conductor** SKILL.md: performs no function itself; dispatches a fresh subagent per role, gates on the returned typed artifact, routes via min() hypotheses. Trigger discipline hardened for an EXPENSIVE skill (explicit skill-authoring requests only; hard anti-triggers incl. daily-memory-summary/journaling; trigger holdout 0/12 false-fires).
- **Five on-demand role-packs** (`roles/composer|guidance|engineer|zipper|battery.md`) — loaded only into the dispatched subagent's context, never the conductor body.
- **Five artifact schemas** (`schemas/`): SkillSpec / StructureContract / EvidenceDossier / CompressionReport / DecisionRecord — six-vendor-intersection JSON, portable.
- **Deterministic L0 gate scripts** (`scripts/validate_*`, 7 scripts): structure-only by design (schema-valid ≠ true); each carries a `--selftest` discrimination proof (traps caught).
- **O5 independent battery** (`roles/battery.md`): self-contained, distilled from the vince-attacker five lenses; SEED anti-false-negative gate, pre-registered E9 budget/marginal stop (never "N clean rounds"), different-vendor attacker at high stakes; `effective_verdict = min(re-audit, battery)`.
- **Dogfood result**: built a real tiny skill end-to-end; all five L0 gates passed on genuine (non-fixture) artifacts with a real RED→GREEN harness.
- **Honest coverage**: the dogfood was one agent playing all roles — true fresh-context per-role independence NOT exercised; the battery NOT yet run cross-vendor. Self-rated `candidate`, not `industrial`.
