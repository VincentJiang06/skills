<!--
  Copy this file to SKILL.md when creating a new skill. Strip these HTML
  comments before committing.

  Target sizes:
    - Frontmatter description: 60-150 tokens
    - Body: under 150 lines / 1,500 always-loaded tokens (use rules/ for the rest)
-->

---
name: {skill-kebab-name}
description: >
  {Verb-first scope sentence — what this skill does.}
  Use when {primary trigger condition}. Triggers on phrases like
  "{phrase 1}", "{phrase 2}", "{phrase 3}".
  Do NOT use for {anti-trigger scope}; use {other-skill} instead.
  {Optional: domain markers — file extensions, library names.}
---

# {skill name}

<!--
  Opening paragraph: 2-3 sentences. What the skill does, the guiding
  principle, and any non-negotiable invariant. The reader has just
  loaded this on a turn that matched the description — anchor them.
-->

{Two-to-three-sentence intro.}

The guiding principle is **{key principle, one phrase}**.

<!--
  If your skill has named modes / operations / phases, list them here
  as a numbered list with one line each. The detail for each goes
  either inline below or in a gated rules/mode-*.md file (see
  encapsulation-patterns: P1 Mode pack).
-->

There are N operations. Analyze which apply:

1. **{Operation 1}** — {one-line purpose}
2. **{Operation 2}** — {one-line purpose}

Before reasoning about any of these, **read `rules/{foundational-rules-file}.md`**.

---

## Step 1: {first phase name}

<!--
  Each step is a heading. Steps should be numbered. If a step grows
  beyond ~30 lines, consider compressing it into a rules/ file.
-->

{What to do in this step.}

## Step 2: {second phase name}

{What to do in this step.}

## Step N: Verify

<!--
  Most skills benefit from an explicit verification step that names
  scripts or checks to run. Be specific about commands and expected
  exit codes.
-->

1. {Check 1 — command + expected output}
2. {Check 2}

---

## Modules

<!--
  Table of rules/ files with their load conditions. This table is how
  Claude decides whether to Read a given file. Be specific about the
  trigger.
-->

| File | When to load |
|------|--------------|
| `rules/{always-loaded-foundation}.md` | Always — {why} |
| `rules/{gated-rules-file}.md` | When {specific trigger} |

## Scripts

<!--
  Table of scripts/ files with their usage. Include the exact command.
-->

| File | Usage |
|------|-------|
| `scripts/{name}.py` | `python3 scripts/{name}.py <args>` — {what it does} |

## Assets

<!--
  Table of assets/ files. These are typically templates the skill copies
  from, not files it reads instructionally.
-->

| File | Usage |
|------|-------|
| `assets/{name}.md` | Copy as starting point for {what} |

## Non-negotiable rules

<!--
  Optional but powerful: a short numbered list of invariants the skill
  must never violate. Keep this list under 10 items. Each item should
  start with a clear NEVER / MUST / ALWAYS.
-->

1. **{NN-01}**: {invariant}
2. **{NN-02}**: {invariant}
