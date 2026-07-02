# skill-conductor

> Take an idea or an existing skill all the way to "industrial" — and stop honestly when it can't clear the bar, instead of faking a pass.

**English** · [简体中文](README.md)

**What it does** — Drives a Claude Code skill through the full skill-building pipeline: guidance → engineer → zipper, end to end, with quality-gate loops. A thin orchestrator that chains the three stage skills skill-guidance, skill-engineer, skill-zipper, then re-runs skill-guidance as the final auditor.

**Why it's good** —
- **Anti-inflation final acceptance** — scores on `min(re-audit, independent-battery)`, never self-graded high; the verdict can never exceed that independent behavioral battery (the battery is the **vince-attacker** skill, invoked only after the re-audit passes).
- Loops back to the **gap-owning stage** (design-wrong → G, test-wrong → E, lossy compression → Z); a failing artifact is never passed downstream.
- **Stops honestly** (stopped_unmet) when it hits the loop cap without clearing the bar — it never relaxes a gate just to "pass."
- Runs autonomously and writes a machine-checkable run trace at `<target>/.skill-conductor/conductor-log.json`.
- **v2.0: gates ARE scripts** — Stage G/E execute the stage skills' own shipped validators (`validate_spec.mjs` / `validate_report.mjs`, the latter re-running the harness itself): builder and gatekeeper share one ruler, zero room to copy a command wrong; sibling resolution tolerates install prefixes (repo names and installed names both work).

**When to use** — "build/test/compress this skill end to end" · "run guidance → engineer → zipper" · "push this idea or existing skill through all stages"; or call `/skill-conductor`.
**Not for** — running just one stage (call that stage skill); planning only (→ skill-guidance); compression only (→ skill-zipper); blank scaffolding with no pipeline (→ skill-creator).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/skill-conductor ~/.claude/skills/`). For full function, also install `skill-guidance` and `skill-engineer`; the `skill-principle/` KB now lives inside `skill-guidance/skill-principle/`, and `skill-conductor` reuses it.

Full spec: [SKILL.md](SKILL.md)
