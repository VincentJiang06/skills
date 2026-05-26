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
   Read back in. Worth doing for readability even when token-neutral.

2. **Encapsulate** — move content gated by a clear condition into a
   conditionally-loaded rules file. Highest-leverage operation: directly
   shrinks the per-invocation always-loaded budget.

3. **Enrich** — create a new rules/template/script file for something the
   skill currently handles by ad-hoc reasoning each time. Makes the skill
   faster and more consistent without changing its scope.

4. **Harden** — rewrite vague instructions (in any file) to be precise.
   No structural change; improves reliability.

5. **Retrigger** — rewrite the frontmatter `description` so the skill
   triggers on the right turns and not on the wrong ones. Often the
   single highest-impact change a skill can receive.

Before reasoning about any of these, **read `rules/progressive-disclosure-model.md`**
to internalize what "always-loaded" vs "on-demand" means in this runtime.
Without that model the token-cost reasoning below is meaningless.

Always show a plan first. Wait for user confirmation before writing anything.

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

---

## Step 2: Analyze each dimension

Load `rules/diagnosis-rubric.md` first — it provides the smoke-test
thresholds and the per-operation signal lists you'll use below.

Work through each of the five operations. For each one, identify specific
candidates. Cross-reference `rules/progressive-disclosure-model.md` when
reasoning about token impact.

### Compress candidates

Look for content in SKILL.md that is:
- Detailed reference material (tables, schemas, long examples)
- A complete self-contained phase that could be a standalone document
- More than ~30 lines that the model doesn't need on every invocation

For each candidate: name it, estimate line count and token count, state
what file it would move to, and predict whether the resulting on-demand
file will be Read on most invocations (token-neutral) or only some
(token-positive).

### Encapsulate candidates

Look for content (in SKILL.md or existing rules) that is only needed
sometimes:
- Features gated by a user choice ("only if exporting to PDF")
- Error handling paths that rarely trigger
- A whole workflow branch that applies to one mode but not another
- Language packs, theme variants, format-specific output rules

For each candidate: name it, estimate token savings per typical
invocation, state the **explicit condition** that gates loading. If the
condition is fuzzy, the encapsulation is fragile — flag this as a
Harden-first candidate instead.

When a candidate looks promising, match it against the pattern library
in `rules/encapsulation-patterns.md` (P1 Mode pack / P2 Feature gate /
P3 Variant pack / P4 Rare path / P5 Phase-conditional). If it matches
none of these — and isn't a fit for the three requirements at the top
of that file — do not encapsulate.

### Enrich candidates

Look for steps where the skill currently says something like:
- "generate a report" without a template
- "format the output" with no format spec
- "commit with a conventional message" without an example
- Any multi-step procedure that should be consistent across runs

For each candidate: describe what the new file would contain, why it
saves the model from reasoning from scratch, and what the skill currently
does in its place.

### Harden candidates

Look for instructions that use vague verbs or implicit branching:
- "handle X appropriately", "process as needed", "if relevant"
- A check or guard rail with no consequence defined for failure
- A decision (if A then B) where the else case is missing
- Numeric thresholds without units or boundaries ("if it's too long")

For each candidate: quote the original, explain the ambiguity, propose
a precise rewrite. Preserve the original intent — clarify, don't change,
behavior.

For the rewrite shape, consult `rules/hardening-patterns.md` (H1 vague
verbs, H2 fuzzy conditions, H3 missing else, H4 unitless thresholds,
H5 undefined consequences, H6 implicit quality, H7 free-form judgment,
H8 implicit ordering, H9 pronoun, H10 underspecified output).

### Retrigger candidates

Load `rules/description-quality.md` and apply its diagnosis rubric to the
current frontmatter `description`. If the score is 0-3, propose a rewrite
from scratch. If 4-5, propose targeted improvements per missing item.
If 6-7, mark this dimension as "no action needed."

---

## Step 3: Present the plan

Use this format:

```
## Restructuring Plan — [skill name]

Current: SKILL.md ([N] lines, [N] tokens always-loaded)
         + [N] rules files ([N] tokens on-demand)
After:   SKILL.md (~[N] lines, ~[N] tokens always-loaded)
         + [N] rules files (~[N] tokens on-demand)

### Compress
→ Move [section name] (~[N] lines, ~[N] tokens) → rules/[filename].md
  Token effect: [neutral / saves N tokens on invocations that skip the Read]
  Rationale: [one sentence]

→ (or: Nothing to compress — SKILL.md is already lean)

### Encapsulate
→ Move [section name] (~[N] lines, ~[N] tokens) → rules/[filename].md
  Condition: only Read when [specific trigger]
  Token savings: ~[N] tokens on typical invocations that skip this path

→ (or: No clear encapsulation opportunities)

### Enrich
→ New file: rules/[filename].md  (or assets/, scripts/)
  Contains: [template, checklist, or script outline]
  Replaces: [what the skill currently does ad-hoc]
  Per-invocation token cost: ~[N] tokens when Read (acceptable because [reason])

→ (or: No enrichment needed)

### Harden
1. [file:line] "[original quote]"
   Problem: [why it's ambiguous]
   Proposed: "[precise rewrite]"

→ (or: No vague instructions found)

### Retrigger
Current description score (per rules/description-quality.md): [N]/7
→ [Rewrite from scratch / Targeted fixes for items X, Y / No action needed]
  Proposed new description:
  """
  [new description text]
  """

→ (or: Description score 6-7 — no action needed)

---
Lossless check: every line currently in SKILL.md will exist verbatim in
the new file set, OR is an explicit Harden rewrite listed above.
Verification: `scripts/diff_lossless.py <before> <after>` should report 0 LOST lines.
```

After the plan, ask:

```
Does this look right? Tell me:
- Any changes to the plan
- Which operations to skip
- Whether to write all files at once or one at a time

Say "go" to proceed.
```

---

## Step 4: Write the files

Once confirmed, write in this order to preserve losslessness:

1. **Snapshot the before state**: copy the skill directory to a temp
   location (or rely on git) so `diff_lossless.py` has something to
   compare against later.
2. **Create new files first**: write each new `rules/*.md`, `assets/*`, or
   `scripts/*` with the content it will hold. Do NOT touch SKILL.md yet.
3. **Update SKILL.md last**: remove content that has been written
   elsewhere; add references to the new files; apply Harden rewrites;
   apply Retrigger description rewrite.

Never remove content from SKILL.md until it has been written to its
destination file.

Each new rules file should follow the skeleton in
`assets/rules-template.md` (title with one-line purpose, "Read this
when" trigger, main content, anti-patterns, optional verification). Copy
the template as a starting point rather than reinventing the structure.

If the skill being restructured doesn't have a SKILL.md yet, or its
SKILL.md needs a full rewrite, use `assets/skill-md-skeleton.md` as the
starting point.

References in the updated SKILL.md:
```markdown
## Modules
- `rules/[name].md` — [when to Read it]
```

---

## Step 5: Verify

After writing, run two verification checks:

1. **Lossless check**:
   ```
   python scripts/diff_lossless.py <before_snapshot> <skill_dir>
   ```
   Expect: 0 LOST lines. Any LOST line is a bug — either restore the
   content or explicitly justify it as a Harden rewrite.

2. **Token impact**:
   ```
   python scripts/measure_tokens.py --diff <before_snapshot> <skill_dir>
   ```
   Expect: always-loaded tokens decreased (or stayed flat with a
   readability justification). On-demand tokens may grow — that's fine.

Print a summary when done:

```
Done.
  ✓ Created rules/[name].md ([N] lines, [N] tokens)  [compress/encapsulate/enrich]
  ✓ Updated SKILL.md: [before] → [after] lines, [before] → [after] tokens
  ✓ Lossless check: 0 LOST lines ([N] rewritten, [N] new)

Token impact: always-loaded shrunk by [N] tokens ([N]%) per invocation.
[Module] only loads when [condition] — saves ~[N] tokens on [typical scenario].
```

---

## Losslessness rules

The restructuring is lossless when:
- Every line removed from SKILL.md appears verbatim (or as an explicit
  Harden rewrite) in another file
- No new rules file is created without a corresponding reference added
  to SKILL.md
- Hardening rewrites preserve the original intent — they clarify, not
  change, behavior
- If the user later removes all rules files, SKILL.md still describes
  the skill's full scope (even when detail lives elsewhere)
- `scripts/diff_lossless.py` returns exit code 0

If the user asks you to delete a section with no destination, propose a
destination first. If no destination makes sense, suggest keeping the
section in SKILL.md even if it's long — losslessness trumps brevity.

---

## Modules

| File | When to load |
|------|--------------|
| `rules/progressive-disclosure-model.md` | Always — sets the mental model for what "always-loaded" vs "on-demand" means. Without this you can't reason about token cost. |
| `rules/diagnosis-rubric.md` | At Step 2, before analyzing any operation. Provides smoke-test thresholds, per-operation signal lists, and the priority matrix. |
| `rules/encapsulation-patterns.md` | When evaluating an Encapsulate candidate. Catalogue of good patterns (P1-P5) and anti-patterns (A1-A4). |
| `rules/hardening-patterns.md` | When evaluating a Harden candidate. Library of vague→precise rewrite shapes (H1-H10). |
| `rules/description-quality.md` | When applying the Retrigger operation, or any time the user mentions trigger accuracy. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/measure_tokens.py` | `python scripts/measure_tokens.py <skill_dir>` — report actual line + token counts, grouped by load discipline. Supports `--diff <before> <after>`. |
| `scripts/diff_lossless.py` | `python scripts/diff_lossless.py <before_dir> <after_dir>` — verify a restructure preserved every line. Exit 0 = lossless, exit 1 = content was lost. |

## Assets

| File | Usage |
|------|-------|
| `assets/rules-template.md` | Skeleton for a new rules file. Copy and fill in placeholders; strip HTML comments before committing. |
| `assets/skill-md-skeleton.md` | Skeleton for a new SKILL.md. Use when restructuring requires a full SKILL.md rewrite. |
