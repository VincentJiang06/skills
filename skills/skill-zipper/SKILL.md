---
name: skill-zipper
description: >
  COMPRESSES an existing skill LOSSLESSLY for token efficiency, reliability, and
  trigger accuracy. Use when a skill is too long, needs token reduction or
  splitting, has vague rules, or fails to trigger: "$skill-zipper". WITHOUT
  losing content; not build (engineer), audit (guidance), or scaffold
  (skill-creator).
license: MIT
metadata:
  version: "2.0.0"
---

# skill-zipper

Restructure an existing skill without losing content. The five operations are
**Compress**, **Encapsulate**, **Enrich**, **Harden**, and **Retrigger**;
analyze which apply, then propose a plan.

A comprehensive pass refines **every part** — the `description`, SKILL.md,
every `rules/`/`references/` file — **and the load architecture**
(always-loaded vs on-demand). The `description` is highest-leverage: it sits
in the skills index on every turn and has hard length limits
(`rules/description-quality.md`). `measure_tokens.py` sizes everything and
emits Architecture flags — never ship what the flags call BAD.

Before reasoning about token cost, **read
`rules/progressive-disclosure-model.md`** — it defines always-loaded vs
on-demand and each directory's role; without that model the cost reasoning
below is meaningless.

Direct user mode: always show a plan first and wait for "go" before writing.
Pipeline mode: if invoked by **skill-conductor** as **Stage Z**, the user's
end-to-end pipeline request is the approval. Use only conservative lossless
writes, then report token impact and diff evidence.

---

## Step 1: Read the skill (every part)

Resolve the skill directory path: use it if provided; in direct user mode ask
for it; in pipeline mode a missing path is a stage failure to report, not a
question to ask.

Run `scripts/measure_tokens.py <skill_dir>` **first** and capture: the
**description** char/token size, the always-loaded vs on-demand split, and the
**Architecture flags** block — the flags tell you which parts need work.

Then read, to refine **every part** (not just SKILL.md):
- `SKILL.md` — required (stop if missing), **including its frontmatter `description`**.
- All `rules/*.md` and `references/*.md` bodies — Compress/merge/dedup
  candidates (a references file may duplicate SKILL.md).
- `scripts/`, `assets/`, `schemas/` — note what exists; read a body only when a
  flag (oversized / orphan) or the analysis points at it.

Print a one-line inventory: description size, always/on-demand totals, flags.

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
verbatim or are explicitly classified (Harden/Retrigger rewrite, Enrich
extraction, plan-listed known-content deletion); every new rules file is
referenced from SKILL.md; rewrites preserve intent; and `diff_lossless.py`
exits 0 or all LOST / REWRITTEN lines are classified.

If the user asks you to delete a section with no destination, propose a
destination first. If no destination makes sense, suggest keeping the
section in SKILL.md even if it's long — losslessness trumps brevity.

---

## Modules

| File | When to load |
|------|--------------|
| `rules/progressive-disclosure-model.md` | Always — the always-loaded vs on-demand model and each directory's role; prerequisite for any token-cost reasoning. |
| `rules/diagnosis-rubric.md` | At Step 2, before analyzing any operation. Smoke-test thresholds, per-operation signal lists, priority matrix. |
| `rules/operation-analysis.md` | At Step 2, alongside the diagnosis rubric. Per-operation candidate criteria and cross-references to pattern libraries. |
| `rules/encapsulation-patterns.md` | When evaluating an Encapsulate candidate. Catalogue of good patterns (P1-P5) and anti-patterns (A1-A4). |
| `rules/hardening-patterns.md` | When evaluating a Harden candidate. Library of vague→precise rewrite shapes (H1-H10). |
| `rules/description-quality.md` | When applying the Retrigger operation, or any time the user mentions trigger accuracy. |
| `rules/plan-template.md` | At Step 3, before printing the plan. Exact format and confirmation prompt. |
| `rules/write-procedure.md` | At Step 4, before writing any file. Write order, dry-run procedure, anti-patterns. |
| `rules/verification-checklist.md` | At Step 5, after writing. Two-layer verification (script + human) and the done summary format. |
| `rules/portability-checklist.md` | When the skill must run beyond Claude Code, pre-publication, or when frontmatter changes — the portable core vs Claude-Code-only fields. |

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
