# Intent and maturity

## Detect intent

Read the frontmatter `description` and the SKILL.md body, then state plainly:

- **summary** — one sentence: what this skill lets an agent do.
- **in_scope / out_of_scope** — what it should and shouldn't handle. Infer
  out-of-scope from any "Do NOT use for…" text and from the trigger phrasing.
- **primary_user** — who/what invokes it (a human? another agent? a CI step?).
- **triggers_observed** — the concrete phrases/contexts the description claims to
  trigger on. Note if they're testable (have positive *and* negative cases) or
  only abstract.

If intent is genuinely ambiguous (e.g. a stub with a one-line description),
record your best reading plus the ambiguity in `blocking_unknowns` — do not stall.

## Classify maturity

`scripts/score_skill.mjs` returns a `maturity_hint`; confirm or override it by
reading. Use these definitions:

| Maturity | Looks like | Implication |
|---|---|---|
| `stub` | Frontmatter + a few lines; no modules, no tests. A "blank idea" expressed as a SKILL.md. | Lean toward **full** from-scratch planning — there's little to evaluate, much to design. |
| `draft` | Real body and maybe some modules, but no test/eval assets and thin controls. | Evaluate what exists; recommend the missing units. Altitude from stakes. |
| `mature` | Body + modules + test/eval assets. | Evaluation + comparable research; surface gaps and polish, not a rebuild. |

Maturity is an input to altitude (Step 5), not the whole decision — a mature but
high-stakes skill may still warrant full rigor, and a stub utility may stay lite.

## A note on "blank idea" input

A thin stub SKILL.md is a first-class input, not an error. When maturity is
`stub`, Step 3's scorecard will be mostly `absent` — that's expected. The value
you add is the **recommended design** (Step 6), which for a stub is essentially a
from-scratch plan across all 8 design units, seeded by comparable research.

But distinguish this from a target with **no SKILL.md at all**: a stub (minimal
frontmatter, no body) is valid input; a directory with zero SKILL.md is out of
scope and the agent must refuse at Step 1 (it never reaches this rule).
