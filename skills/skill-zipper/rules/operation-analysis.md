# operation-analysis — Step 2 details: how to analyze each candidate

Read this when you reach Step 2 of the workflow (analyze each dimension).
Before working through the operations below, load `rules/diagnosis-rubric.md`
for smoke-test thresholds and the priority matrix.

For each operation, identify specific candidates and capture: name,
size (lines + tokens), token effect prediction, and the destination file.

---

## Compress candidates

Look for content in SKILL.md that is:
- Detailed reference material (tables, schemas, long examples)
- A complete self-contained phase that could be a standalone document
- More than ~30 lines that the model doesn't need on every invocation

For each candidate: name it, estimate line count and token count, state
what file it would move to, and predict whether the resulting on-demand
file will be Read on most invocations (token-neutral) or only some
(token-positive).

---

## Encapsulate candidates

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

---

## Enrich candidates

Look for steps where the skill currently says something like:
- "generate a report" without a template
- "format the output" with no format spec
- "commit with a conventional message" without an example
- Any multi-step procedure that should be consistent across runs

For each candidate: describe what the new file would contain, why it
saves the model from reasoning from scratch, and what the skill currently
does in its place. Pick the right directory per
`rules/progressive-disclosure-model.md`:
- Templates / skeletons / example outputs → `assets/`
- Lookup tables / bibliographies / enums → `references/`
- Deterministic logic the model invokes → `scripts/`
- Instructional prose the model reasons with → `rules/`

---

## Harden candidates

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

---

## Retrigger candidates

Load `rules/description-quality.md` and apply its 8-item diagnosis rubric to
the current frontmatter `description`. If the score is 0-4, propose a rewrite
from scratch. If 5-6, propose targeted improvements per missing item.
If 7-8, mark this dimension as "no action needed."

Retrigger has the highest impact-per-effort ratio of any operation —
do not skip it even when other operations report no candidates.

---

## When you're done analyzing

You should have, for each of the 5 operations, either:
- A list of named candidates with size estimates and target files, OR
- An explicit "no candidates" verdict with a one-sentence justification

Proceed to Step 3 (present the plan) — load `rules/plan-template.md`.
