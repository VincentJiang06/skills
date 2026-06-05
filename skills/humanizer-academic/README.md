# humanizer-academic

Bilingual academic rewriting skill for English, Chinese, and mixed-language prose. It removes AI-writing
signals across lexical, structural, and statistical layers while **preserving scholarly register**, and adds
defined academic human texture (authorial stance, source-grounded specificity, controlled asymmetry)
without inventing facts.

It keeps full English-humanizer coverage, adds Chinese-specific AI-writing detection rules, and defaults to
an academic register instead of the casual "add personality" drift common to general humanizers.

## Layout

- `SKILL.md` — skill entry point
- `references/` — English rules, Chinese rules, and academic-register guidance
- `scripts/` — the detect-only AI-signal scanner and helpers
- `evals/` — trigger/behavior eval cases
- `_meta.json`, `CHANGELOG.md` — version metadata and change history

## Evaluation harness

A bilingual benchmark — ten AI-generated papers (5 model families × 2 languages on one shared research
topic), a rubric, scoring scripts, and reports — lives in
[`experiments/humanizer-academic-eval/`](../../experiments/humanizer-academic-eval/). Use it to check that a
rewrite (1) reduces obvious AI patterns, (2) preserves meaning and academic seriousness, and (3) avoids
over-humanizing into casual prose.

## Install

From the repo root:

```bash
cp -R skills/humanizer-academic ~/.claude/skills/
```
