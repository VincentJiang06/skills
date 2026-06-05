# encapsulation-patterns — when a split actually saves tokens

Read this when applying the Encapsulate operation. The diagnosis rubric
flags candidates; this file tells you whether each candidate is a
recognized pattern, and what the gating condition should look like.

## The three requirements

A clean encapsulation always has all three of these. If any one is
missing, do NOT encapsulate — either harden the discriminator first, or
leave the content in place.

1. **Discriminator** — a value the model can determine in O(1) from
   context already in hand (user message, file path, prior tool output).
   "If it looks complicated" is not a discriminator; "if the user said
   audit" is.

2. **Disjoint scope** — the gated content is not needed in any other
   branch. If two modes share 60% of the same advice, the shared part
   stays in SKILL.md and only the differentials get encapsulated.

3. **Non-trivial size** — at least ~100 tokens of gated content.
   Smaller chunks pay more in indirection (load instructions, Read calls)
   than they save.

---

## Good patterns

### P1. Mode pack

**Discriminator**: which named mode the user is operating in
**Scope**: a complete workflow specific to that mode

```
SKILL.md
├── intro + mode menu
├── shared concepts (always-loaded)
└── "When in Mode X, load rules/mode-x.md and proceed"

rules/
├── mode-design.md     (gated: user wants to design)
├── mode-audit.md      (gated: user wants to audit)
└── mode-research.md   (gated: user wants citations / research)
```

**When to use**: the skill has 2-5 named modes whose workflows are
substantially different. Mode is announced explicitly by the user
("audit this", "design a new screen").

**When NOT to use**: modes share most of their content and only differ
in a few touch points. In that case, keep the shared workflow and gate
only the differences (use the Feature gate pattern instead).

**Real example**: `low-visibility-field-worker-ui` splits into
`rules/audit-mode.md` and `rules/research-mode.md` — design mode lives
in the SKILL.md body since it's the default. Each gated file is loaded
only when the discriminator (user mentions "audit" or "research") is hit.

**Token estimate**: gated content typically 50-200 lines each. Savings
on non-matching modes ≈ size of the unloaded modes minus the load
instruction overhead (~10 tokens).

---

### P2. Feature gate

**Discriminator**: a yes/no presence — a flag, a file extension, a
user-stated preference
**Scope**: the code path that only matters when the feature is requested

```
SKILL.md
└── "If the user asks for PDF output, load rules/pdf-export.md before
     formatting."

rules/pdf-export.md   (gated: only when PDF requested)
```

**When to use**: an optional feature with its own non-trivial workflow.
The discriminator is binary and concrete.

**When NOT to use**: the feature is so common that it's used on most
invocations. In that case, keep it always-loaded (or split it as a
Compress, not an Encapsulate).

**Real example**: a documentation skill might gate `rules/api-changelog-format.md`
behind "user is editing CHANGELOG.md" — most edits aren't to that file.

**Token estimate**: ~100-400 token gated chunk. High savings ratio
because the negative branch (feature not requested) is the common case.

---

### P3. Variant pack

**Discriminator**: a categorical value with mutually exclusive variants
(language: en/zh/ja; format: md/html/pdf; theme: light/dark/highcontrast)
**Scope**: the variant-specific output rules

```
SKILL.md
└── "After determining the variant, load rules/variant-{name}.md"

rules/
├── variant-en.md
├── variant-zh.md
└── variant-ja.md
```

**When to use**: clear taxonomy of variants, each with its own
formatting/wording rules, and the user picks one per invocation.

**When NOT to use**: variants share 80%+ of content. Use a single
rules/variants.md that lists all variants in a table.

**Token estimate**: scales with number of variants. Always-loaded layer
gets the discriminator + the load instruction; on-demand layer gets
1 variant per invocation.

---

### P4. Rare-path

**Discriminator**: an error or edge-case condition observed during the
workflow (e.g., "input is malformed", "no matching record found")
**Scope**: the recovery procedure

```
SKILL.md
└── "If validation returns errors, load rules/error-recovery.md"

rules/error-recovery.md   (gated: only when errors occur)
```

**When to use**: the recovery procedure is non-trivial (≥ 100 tokens)
AND the error rate is < 30% of invocations.

**When NOT to use**: errors are so common that loading the recovery
procedure most of the time anyway. In that case keep it inline.

**Token estimate**: high savings ratio because happy-path invocations
skip the gated content entirely.

---

### P5. Phase-conditional

**Discriminator**: the output of a prior phase in the same workflow
(e.g., "Step 2 produced ≥ 5 findings" → load triage instructions)
**Scope**: the procedure that handles that specific case

```
SKILL.md
└── "After scanning, if findings count > 5, load rules/triage.md"

rules/triage.md   (gated: when findings exceed threshold)
```

**When to use**: the workflow has an explicit decision point and
distinct downstream paths.

**When NOT to use**: the decision point is fuzzy or the model already
has the full procedure in mind from the rest of SKILL.md.

**Token estimate**: depends on how often the phase condition is met.
Often a 50/50 split, so save half the time.

---

## Anti-patterns

### A1. Fuzzy gate

**Symptom**: the discriminator is a vibe, not a value.

> "If the task seems complex, load rules/advanced-flow.md"

The model will read advanced-flow.md on basically every invocation
because "complex" has no boundary. No tokens saved. Worse, the model
flip-flops between branches.

**Fix**: harden the discriminator first. Either make it concrete
("if the input file is > 500 lines") or fold the content back into
SKILL.md and remove the encapsulation.

---

### A2. Micro-encapsulation

**Symptom**: a gated file under ~50 tokens of actual content.

> rules/dark-mode-color.md:
> "When dark mode, use #1a1a1a as the background."

That's one sentence. The Read call overhead exceeds the content. Move
back to SKILL.md, or merge several micro-files into one rules/theme.md.

**Fix**: combine related micro-encapsulations until each gated file is
≥ 100 tokens. If you can't reach 100, it doesn't deserve to be gated.

---

### A3. Leaky gate

**Symptom**: encapsulated file references state from a different
encapsulated file, but the gating order isn't enforced.

> rules/mode-audit.md: "Use the report template from rules/mode-design.md"

Now both files are needed even when the user only wanted to audit. Two
gates have collapsed into one. Better to extract the shared template
into a third file (e.g., rules/report-template.md) and gate both modes
on the shared file.

**Fix**: identify the shared content, hoist it to its own file (or to
SKILL.md if it's small and used by both branches), then gate the
remaining differentials.

---

### A4. Phantom gate

**Symptom**: the gating instruction in SKILL.md says "load this when X,"
but the model has no way to know X without reading the gated file first.

> SKILL.md: "Load rules/extended-format.md if the user wants the
> extended format."
> rules/extended-format.md: "The extended format includes A, B, C..."

How does the model decide whether the user wants the extended format
without having read what it is? Either explain the choice in SKILL.md
(so the model can ask) or remove the gate.

**Fix**: SKILL.md must contain enough context for the discriminator
to be evaluable. The gated file can hold the details, but the
*question* lives in the always-loaded layer.

---

## When to NOT encapsulate at all

- The skill is < 1,500 always-loaded tokens. Move on to other operations.
- The candidate content has no clear discriminator after one Harden pass.
- The candidate is referenced from SKILL.md ≥ 4 times — it's central, not optional.
- The user explicitly wants a single-file skill (some workflows depend on this).

## Verification

After encapsulating, confirm:

1. The gating sentence in SKILL.md is precise and the discriminator
   value is determinable without reading the gated file (see A4).
2. `measure_tokens.py --diff` shows the always-loaded layer shrunk by
   roughly the size of the moved content.
3. Re-read SKILL.md as a fresh reader: does it still describe the
   skill's full scope, or did the encapsulation hollow it out?
