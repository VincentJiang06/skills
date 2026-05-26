---
name: vince-skill-zipper
description: >
  Restructure an existing Claude Code skill for token efficiency, reliability,
  and triggering accuracy. Use when the user says "my skill is too long",
  "split this skill", "reduce token usage", "make this rule precise",
  "my skill isn't triggering", "audit this skill's structure", or shows
  you a SKILL.md and asks how to improve it. Applies five lossless
  operations: Compress, Encapsulate, Enrich, Harden, Retrigger.
  Do NOT use for creating skills from scratch (use skill-creator),
  measuring skill output quality across runs (use skill-track), or
  general writing/editing requests unrelated to a Claude Code skill.
---

# vince-skill-zipper

Restructure an existing Claude Code skill. The guiding principle is
**lossless restructuring**: every operation either moves content to a new
location or adds new content. Nothing is ever deleted without being placed
somewhere else first.

There are **five** operations. Analyze which apply, then propose a plan:

1. **Compress** — move verbose content from SKILL.md into an on-demand
   rules file. Saves always-loaded tokens *if* the content isn't always
   Read back in.
2. **Encapsulate** — move content gated by a clear condition into a
   conditionally-loaded rules file. Highest-leverage operation.
3. **Enrich** — create a new rules / template / script / reference file
   for something the skill currently handles by ad-hoc reasoning.
4. **Harden** — rewrite vague instructions to be precise.
5. **Retrigger** — rewrite the frontmatter `description` so the skill
   triggers on the right turns. Often the single highest-impact change.

Before reasoning about any of these, **read `rules/progressive-disclosure-model.md`**
to internalize what "always-loaded" vs "on-demand" means and the role of
each directory (`rules/`, `references/`, `assets/`, `scripts/`). Without
that model the token-cost reasoning below is meaningless.

Always show a plan first. Wait for user confirmation before writing.

---

## Step 1: Read the skill

Ask for the skill directory path (or accept it if already provided).

Read:
- `SKILL.md` (required — stop if missing)
- All existing `rules/*.md` files
- The names of files in `scripts/`, `assets/`, `references/` (note what exists; don't read bodies unless needed for analysis)

Run `scripts/measure_tokens.py <skill_dir>` and capture the output. This
gives you the actual always-loaded vs on-demand split.

Print a one-line inventory plus the measurement summary:

```
skill-track — SKILL.md (59 lines, 620 tokens always-loaded)
              + 6 rules files (640 lines, 6,120 tokens on-demand)
              Always-loaded share: 9.2%
```

## Step 2: Analyze each dimension

Load `rules/diagnosis-rubric.md` for smoke-test thresholds and the
priority matrix. Then load `rules/operation-analysis.md` for the
per-operation signal lists.

Walk through each of the 5 operations (Compress / Encapsulate / Enrich /
Harden / Retrigger) and capture candidates per the rules file.

## Step 3: Present the plan

Load `rules/plan-template.md`. Render the plan using the exact format
in that file. End with the confirmation prompt and wait for "go".

## Step 4: Write the files

Once the user approves, load `rules/write-procedure.md`. Follow the
3-step write order (snapshot → new files → SKILL.md). If the user
requested a dry-run, use the dry-run procedure in that same file.

## Step 5: Verify

Load `rules/verification-checklist.md`. Run both scripts (lossless
diff + token impact), classify any LOST lines, and print the done
summary.

---

## Losslessness rules

The restructuring is lossless when:
- Every line removed from SKILL.md appears verbatim (or as an explicit
  Harden/Retrigger rewrite, or as an Enrich extraction to a new
  artifact) in another file
- No new rules file is created without a corresponding reference added
  to SKILL.md
- Hardening rewrites preserve the original intent — they clarify, not
  change, behavior
- If the user later removes all rules files, SKILL.md still describes
  the skill's full scope (even when detail lives elsewhere)
- `scripts/diff_lossless.py` returns exit 0, or every LOST line is
  explicitly classified per `rules/verification-checklist.md`

If the user asks you to delete a section with no destination, propose a
destination first. If no destination makes sense, suggest keeping the
section in SKILL.md even if it's long — losslessness trumps brevity.

---

## Modules

| File | When to load |
|------|--------------|
| `rules/progressive-disclosure-model.md` | Always — sets the mental model for what "always-loaded" vs "on-demand" means, and the role of each directory. Without this you can't reason about token cost. |
| `rules/diagnosis-rubric.md` | At Step 2, before analyzing any operation. Smoke-test thresholds, per-operation signal lists, priority matrix. |
| `rules/operation-analysis.md` | At Step 2, alongside the diagnosis rubric. Per-operation candidate criteria and cross-references to pattern libraries. |
| `rules/encapsulation-patterns.md` | When evaluating an Encapsulate candidate. Catalogue of good patterns (P1-P5) and anti-patterns (A1-A4). |
| `rules/hardening-patterns.md` | When evaluating a Harden candidate. Library of vague→precise rewrite shapes (H1-H10). |
| `rules/description-quality.md` | When applying the Retrigger operation, or any time the user mentions trigger accuracy. |
| `rules/plan-template.md` | At Step 3, before printing the plan. Exact format and confirmation prompt. |
| `rules/write-procedure.md` | At Step 4, before writing any file. Write order, dry-run procedure, anti-patterns. |
| `rules/verification-checklist.md` | At Step 5, after writing. Two-layer verification (script + human) and the done summary format. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/measure_tokens.py` | `python scripts/measure_tokens.py <skill_dir>` — line + token counts grouped by load discipline. Supports `--diff <before> <after>`. |
| `scripts/diff_lossless.py` | `python scripts/diff_lossless.py <before> <after>` — verify a restructure preserved every line. Exit 0 = lossless, exit 1 = content lost. |

## Assets

| File | Usage |
|------|-------|
| `assets/rules-template.md` | Skeleton for a new rules file. Copy and fill in placeholders; strip HTML comments before committing. |
| `assets/skill-md-skeleton.md` | Skeleton for a new SKILL.md. Use when restructuring requires a full SKILL.md rewrite. |
