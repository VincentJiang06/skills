# diagnosis-rubric — how to look at a skill and know what's wrong

Read this at Step 2 of the workflow, after running `measure_tokens.py`.
This file gives you a structured scorecard so the analysis doesn't depend
on hunches.

## The two-minute smoke test

Before any deeper analysis, read these numbers from `measure_tokens.py` — it
reports the **description** size and an **Architecture flags** block (next
section) on top of the load-split:

| Metric | Healthy | Concerning | Bad |
|--------|---------|------------|-----|
| **Description chars** — in the available-skills index on EVERY turn; the single most always-loaded text | < 320 (~80 tok) | 320–1024 | **> 1024 — Claude Code TRUNCATES it** |
| SKILL.md lines | < 150 | 150-300 | > 300 |
| SKILL.md tokens | < 1,500 | 1,500-3,000 | > 3,000 |
| Always-loaded share of total | < 20% | 20-40% | > 40% |
| Number of distinct "modes" implied in SKILL.md | 1 | 2-3 | ≥ 4 |

Two or more "concerning" or any single "bad" → restructuring is worth the effort.
All "healthy" → skip restructuring; focus on Harden + Retrigger only.

**Absolute size guards the share alarm.** A skill with no rules files
will report 100% always-loaded share by definition — that single metric
in isolation will flag every small single-file skill as "bad." So
short-circuit the share row: if SKILL.md lines < 150 *and* tokens <
1,500, ignore the always-loaded share entirely. The skill is healthy
in absolute terms; the share is a meaningless ratio at this scale.
Only treat share > 40% as bad when at least one of (lines, tokens) is
already in the concerning or bad band.

## Architecture flags — refine every part, not just SKILL.md's prose

`measure_tokens.py` ends with an **Architecture flags** block. This is what makes
the refinement *comprehensive* — it covers the description + every part + the load
architecture, not only SKILL.md. Act on every `✗ BAD`; weigh every `• warn`. Each
flag maps to an operation:

| Flag | What it means | Operation |
|------|---------------|-----------|
| `[description]` over hard limit / dilution | the single most always-loaded text is truncated or bloated | **Retrigger + Compress** the description → `description-quality.md` |
| `[always-loaded]` SKILL.md over budget | too much enters context on every invocation | **Encapsulate** detail into on-demand `rules/`/`references/` |
| `[on-demand]` file large | one `rules/`/`references/` file is heavy to Read | **Compress** it, or split it into focused files |
| `[orphan]` referenced nowhere | dead weight, or a missing "load when" pointer | delete it (confirm truly unused — lossless) **or** add the SKILL.md pointer |

Then ALSO eyeball the parts the flags can't size: are two `rules/` files saying
the same thing (merge)? does a `references/` file duplicate content already in
SKILL.md (extract, don't duplicate)? is a script's contract undocumented? A
comprehensive pass refines the description, SKILL.md, **and** every on-demand part.

## Per-operation diagnosis

For each of the 5 operations, the question to ask and the signal to look for:

### Compress — "Is SKILL.md needlessly verbose?"

| Signal | Where to look |
|--------|---------------|
| Tables longer than 8 rows | Anywhere in SKILL.md |
| Code blocks longer than 15 lines | Anywhere |
| A heading section whose body exceeds 30 lines | Section by section |
| Examples that illustrate the same point ≥ 3 times | Repetition is the giveaway |
| Reference material (enums, codes, lookup tables) | These belong in references/ |

**Decision**: candidate → estimate token cost via tiktoken on the section
text → state the target file. If the moved content will be Read on every
invocation anyway (e.g., the model needs the table for every plan), label
the candidate "cosmetic compress" — worth doing for readability but mark
it as token-neutral.

### Encapsulate — "Is there a clear gate that skips part of the work?"

A clean encapsulation needs **three things**:

1. **A discriminator** — a value the model can determine in O(1) from
   what's already in context (e.g., user said "audit", not "design").
2. **A disjoint scope** — the gated content is not needed in any other
   branch.
3. **Non-trivial size** — at least ~100 tokens. Smaller chunks aren't
   worth the indirection cost.

| Signal | Pattern |
|--------|---------|
| The skill has named modes (Design / Audit / Research, Read / Write / Review) | Mode-pack pattern |
| A feature is gated by a user choice or file presence | Feature-gate pattern |
| There are multiple output formats (English/Chinese, Markdown/JSON, A4/Letter) | Variant-pack pattern |
| Error handling for a rarely-triggered failure mode | Rare-path pattern |
| A workflow phase only runs when the prior phase produced X | Phase-conditional pattern |

For details on each pattern (when appropriate, when NOT, examples), load
`rules/encapsulation-patterns.md`.

**Decision**: if all three requirements are met → encapsulate; otherwise
compress or leave as-is. Fuzzy discriminators ("if it looks complex")
should be hardened first, then re-evaluated for encapsulation.

### Enrich — "Is the model reinventing the same thing on every run?"

| Signal | What's missing |
|--------|----------------|
| "Generate a report" without a format spec | A report template |
| "Format the output" without an example | An output skeleton |
| "Write a commit message following our style" | A worked example or template |
| Multi-step procedures that take prose explanation each time | A checklist file |
| Numeric specs that change ("ensure ≥ X") | A constants file |
| Schema validation done by description, not by JSON schema | A schema file |

**Decision**: when the existing skill instructs the model to produce
structured output but doesn't show the structure, enrich. The new file
goes in `assets/` (templates) or `references/` (lookup data) or
`scripts/` (validators). Don't put template *content* in rules/ — that's
for instructional prose, not artifacts.

### Harden — "Is there an instruction the model could reasonably misinterpret?"

| Pattern | Quick fix |
|---------|-----------|
| "handle X appropriately" | Specify the error class + the recovery action |
| "if relevant", "if applicable" | Specify the condition |
| "ensure quality", "make it good" | Specify the measurable property |
| "as needed" | Specify the trigger |
| `if A then B` (else case missing) | Specify what happens when ¬A |
| Numeric threshold without units | Add units and boundary semantics |
| "process the X" with no algorithm | Specify the steps or link to one |
| "use best judgment" | Either replace with a decision rubric, or leave it but document that this is intentional latitude |

For a fuller library of vague→precise rewrites, load `rules/hardening-patterns.md`.

**Decision**: every match is a candidate. Quote it verbatim, state the
ambiguity, propose a precise rewrite. Never silently change a vague
instruction — surface every rewrite for user review.

### Retrigger — "Does the description make the skill load on the right turns?"

Apply the scorecard from `rules/description-quality.md`:

| Score | Verdict |
|-------|---------|
| 0-3 | Rewrite from scratch |
| 4-5 | Targeted fixes on the missing items |
| 6-7 | No action |

Common failure modes:
- Buried verb (description starts with "A powerful tool that...")
- Zero trigger phrases (the model has to infer when to invoke)
- No anti-triggers next to a sibling skill with overlap
- Length under 60 tokens (under-specified) or over 200 tokens (signal dilution)

**Decision**: even if every other operation reports "nothing to do",
Retrigger is still worth checking. It's the cheapest change with the
highest leverage on whether the skill runs at all.

## Priority matrix

When multiple operations have candidates, do them in this order:

```
            HIGH IMPACT
                │
   Retrigger ◄──┤──► Encapsulate
                │
                │
       Harden ◄─┼─► Enrich
                │
                │
          (none)│► Compress (cosmetic)
                │
            LOW IMPACT
                │
  ──────────────┼──────────────►
  LOW EFFORT          HIGH EFFORT
```

- **Retrigger** is low effort, very high impact — do first.
- **Harden** is low effort, medium impact — do second, often required
  before Encapsulate can have a clean discriminator.
- **Encapsulate** is medium effort, high impact — the main token win.
- **Enrich** is medium effort, medium impact — improves output quality.
- **Compress (lazy)** rides along with Encapsulate naturally.
- **Compress (cosmetic)** is optional; only if SKILL.md has become hard
  for a human author to navigate.

## Anti-patterns in diagnosis itself

Avoid these failure modes when *doing* the diagnosis:

| Anti-pattern | Why it's bad |
|--------------|--------------|
| Recommending Compress purely to "make SKILL.md shorter" | Without a lazy-load condition, total tokens don't change |
| Recommending Encapsulate with a fuzzy discriminator | The model will load both branches anyway, defeating the savings |
| Recommending Enrich for content that's already in references/ | Duplicate; check first |
| Skipping Retrigger because "the description looks fine" | Run the rubric; "looks fine" is the failure mode |
| Recommending Harden on every "could be clearer" line | Only rewrite when the original is genuinely ambiguous, not just terse |
