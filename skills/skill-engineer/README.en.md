# skill-engineer

> Takes a skill-guidance handoff spec and actually builds and tests the skill — red-green-refactor, with evals that really run green.

**English** · [简体中文](README.md)

**What it does** — Builds and tests a Claude Code skill from a skill-guidance handoff spec (`.skill-guidance/handoff-spec.json`) — red-green-refactor: write failing evals first, turn the spec into files until the evals pass, then run an independent fresh-agent battery. It is **STAGE 2 of the pipeline (implementation)**.

**Why it's good** —
- Deterministic-script eval + mutation spot-checks: not "looks good to me" but a re-runnable harness that actually executes, judged by exit code.
- A `trigger_eval` that actually RUNS the skill via `claude -p` to measure real trigger-rate against a baseline — not a hunch about what would fire.
- An independent battery, blind to the build rules, catches what the self-tests miss.
- Test-driven: a required case that wasn't really run, or a script skill with no re-runnable harness, counts as unverified — it won't report success.
- **v2.0: the E gate is executable** — self-gates with `validate_report.mjs` (P0/adversarial-checklist joins, harness **re-run on the spot**, red-log check), the same script the conductor runs; trigger_eval gains 3-vote majority + held-out anti-overfitting; behavioral RED = a baseline-without-skill transcript; pre-ship security lint (secrets / injection / undeclared fetch).

**When to use** — "implement / develop / wire this skill" · "make the eval cases pass" · "turn this handoff-spec into files" · when pointing at `.skill-guidance/handoff-spec.json`; or call `/skill-engineer`.
**Not for** — planning / auditing (→ skill-guidance); token compression / restructuring (→ skill-zipper); blank scaffolding with no spec (→ skill-creator).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/skill-engineer ~/.claude/skills/`). For full function, also install `skill-guidance`; the `skill-principle/` KB now lives inside `skill-guidance/skill-principle/`, and `skill-engineer` reuses it.

Full spec: [SKILL.md](SKILL.md)
