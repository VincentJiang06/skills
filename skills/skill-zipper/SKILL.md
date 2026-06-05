---
name: skill-zipper
description: >
  Restructure an existing Claude Code skill for token efficiency, reliability,
  and trigger accuracy. Use when a skill is too long, needs splitting/token
  reduction, has vague rules, fails to trigger, or needs structure audit. Do NOT
  use for creating skills from scratch (skill-creator), measuring output quality
  across runs, or non-skill writing/editing.
---

# skill-zipper

Restructure an existing Claude Code skill without losing content. The five
operations are **Compress**, **Encapsulate**, **Enrich**, **Harden**, and
**Retrigger**; analyze which apply, then propose a plan.

Before reasoning about any of these, **read `rules/progressive-disclosure-model.md`**
to internalize what "always-loaded" vs "on-demand" means and the role of
each directory (`rules/`, `references/`, `assets/`, `scripts/`). Without
that model the token-cost reasoning below is meaningless.

Direct user mode: always show a plan first and wait for "go" before writing.
Pipeline mode: if invoked by **skill-conductor** as **Stage Z**, the user's
end-to-end pipeline request is the approval. Use only conservative lossless
writes, then report token impact and diff evidence.

---

## Step 1: Read the skill

Ask for the skill directory path (or accept it if already provided).

Read:
- `SKILL.md` (required — stop if missing)
- All existing `rules/*.md` files
- The names of files in `scripts/`, `assets/`, `references/` (note what exists; don't read bodies unless needed for analysis)

Run `scripts/measure_tokens.py <skill_dir>` and capture the output. This
gives you the actual always-loaded vs on-demand split.

Print a one-line inventory plus always-loaded/on-demand token totals.

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
diff + token impact), classify any LOST / REWRITTEN lines, and print the done
summary.

---

## Losslessness rules

The restructure is lossless when removed SKILL.md lines appear elsewhere
verbatim, or are explicitly classified as Harden/Retrigger rewrites or Enrich
extractions; every new rules file is referenced from SKILL.md; rewrites preserve
intent; and `diff_lossless.py` exits 0 or all LOST / REWRITTEN lines are
classified.

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
| `scripts/measure_tokens.py` | `python3 scripts/measure_tokens.py <skill_dir>` — line + token counts grouped by load discipline. Supports `--diff <before> <after>`. |
| `scripts/diff_lossless.py` | `python3 scripts/diff_lossless.py <before> <after>` — verify a restructure preserved every line. Exit 0 = verbatim lossless, exit 1 = LOST/REWRITTEN needs classification. |

## Assets

| File | Usage |
|------|-------|
| `assets/rules-template.md` | Skeleton for a new rules file. Copy and fill in placeholders; strip HTML comments before committing. |
| `assets/skill-md-skeleton.md` | Skeleton for a new SKILL.md. Use when restructuring requires a full SKILL.md rewrite. |
