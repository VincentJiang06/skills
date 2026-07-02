# skill-zipper

> Losslessly restructure an existing skill — leaner on tokens, more reliable, better-triggering, without changing its behavior.

**English** · [简体中文](README.md)

**What it does** — Restructures an existing Claude Code skill for token efficiency, reliability, and trigger accuracy, losslessly: trims size, straightens structure, tightens vague rules, and fixes triggering — all without changing its behavior.

**Why it's good** —
- **Lossless-diff + token-delta proof**: what changed and how much was saved, quantified — not "feels shorter" but script-verified.
- A "**describe WHEN to use it, not the workflow**" rubric that fixes mis-triggering.
- **Refuses to churn an already-clean skill** — no restructuring for its own sake, no needless churn.

**When to use** — a skill is too long / needs splitting to cut tokens · vague rules · fails to trigger or mis-triggers · wants a structure audit; or call `/skill-zipper`.
**Not for** — creating skills from scratch (→ skill-creator); measuring output quality across runs; non-skill writing / editing.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/skill-zipper ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
