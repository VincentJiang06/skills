# phase-distill — Phase 2: Distill (the main deliverable)

## Goal

Produce **`revision-notes.md`**: complete-coverage, Feynman-explained,
exam-ready notes. Follow the backbone (lecture/section order), write each
concept in the **Feynman block order**, weave in cross-topic bridges, then
**reconcile against the Phase-1 coverage checklist** so nothing is dropped.

This is the deliverable the student actually uses. It is denser and richer than
the Phase-1 extract — it adds capsules, examples, and connections.

---

## Step 1: Build the skeleton from the backbone

Every backbone unit (lecture page-group or section) becomes a heading, in order.
A reader can hold the slides in one hand and the notes in the other and see a 1:1
correspondence.

```markdown
# [Course Name] — Revision Notes

## About these notes
[What they cover, how they're structured, what sources they draw from.]

## Lecture 1 / Module 1: [Title]
### 1.1 [Topic] (Lecture 1, pp. 3-7)
...
```

Source-location format: `(Lecture 1, pp. 3-7)` for PDF input, `(Section 1.2)`
for a topic list / syllabus. Every concept carries one.

---

## Step 2: Write each concept in the Feynman block order

The order is **mandatory** and the **plain-language capsule is FIRST** — never
lead with the formal definition.

The five parts, in order:

1. **Plain-language capsule** — explain it simply, as if to a smart friend with
   no jargon. One short paragraph. (This is FIRST, always.)
2. **Intuition** — why it exists, what problem it solves, an analogy if it helps.
3. **Formal treatment** — the precise version: LaTeX formula or code, symbols
   defined.
4. **Worked example** — a concrete, step-by-step example (numbers plugged in /
   algorithm traced). **Mandatory** for every non-trivial concept.
5. **Connections + common misconception** — prerequisites and what it enables; a
   cross-topic bridge where useful; one thing students typically get wrong.

```markdown
### [Concept Name] ([source location])

**Explain it simply:** [Plain-language capsule — as if to a smart friend, no
jargon. One short paragraph. THIS COMES FIRST.]

**Intuition:** [Why it exists, what problem it solves. Analogy if it helps.]

**Formal treatment:**
[The precise version — $LaTeX$ formula or code block. Define each symbol/variable.]

**Worked example:**
[Concrete, step-by-step. For algorithms: trace it. For formulas: plug in numbers.
MANDATORY for every non-trivial concept — see the worked-example rule below.]

**Connections & misconception:** [Prerequisites + what this enables; a cross-topic
bridge where useful; one thing students commonly get wrong.]
```

### Depth calibration (completeness without padding)

Every checklist topic appears — but depth scales with weight:

| Weight | Treatment |
|---|---|
| Core / exam-critical | Full Feynman block, all five parts |
| Important supporting | Capsule + formal + worked example + one connection |
| **Trivial / minor** | **Capsule + a one-liner ONLY** — still present (completeness), **NOT padded** into a full block |

A trivial topic (e.g. "a bit = 0 or 1") is covered at minimal depth — it must
appear in the notes, but do not inflate it into the full block.

**Brevity vs completeness.** Completeness of coverage is non-negotiable — **never
drop a topic to be brief.** If the user asks for short / one-page output, satisfy
it via **depth calibration** (cover more topics at minimal capsule depth) and/or
the `quick-reference.md` cheat sheet — never by omitting topics.

### Worked-example rule (invariant)

A concrete worked example is **mandatory for every non-trivial concept**.
**Escape hatch:** a **pure-definition** concept with **no feasible** worked
example (e.g. a definitional/philosophical term) gets the plain-language capsule
+ a short note like *"Definitional — no worked example applies."* **Never
fabricate a fake/forced example** to satisfy the rule.

### Discrepancy carry-forward

If Phase 1 flagged a `[DISCREPANCY]` (a slide contradicting standard
curriculum), present BOTH in the note — the slide's claim (with its source) and
the standard view — marked as a discrepancy. Do NOT silently "correct" the slide
to the textbook version; the exam may test the slide's framing.

---

## Step 3: Insert cross-topic bridges

At lecture/module boundaries (and wherever it aids understanding), insert a
bridge connecting concepts — the connective tissue the slides only imply:

```markdown
---
> **Bridge:** Lecture 3 framed the problem of [X]. Lecture 4 now presents [Y] as
> a solution — the shift is from understanding the problem to designing a
> mechanism. [Y] assumes [Z] from Lecture 2 (Lecture 2, pp. 4-6).
---
```

Bridges turn a set of notes into a coherent learning narrative. (This folds in
the cross-lecture connection work; there is no separate synthesis document.)

---

## Step 4: Reconcile against the coverage checklist (completeness gate)

**Before finalizing**, diff the notes against `coverage-checklist.md` from Phase
1. This is a real step, not a spot-check:

1. For **each** checklist topic, confirm it appears in the notes. Tick it off.
2. Any topic **missing** from the draft → **flag it and fill it** (at depth
   appropriate to its weight) before the notes are considered done.
3. A topic is **never silently dropped**. If a topic genuinely cannot be covered
   (e.g. the slide was unreadable even via `/pdf`), say so explicitly with a
   `[Uncertain — verify before exam]` note — do not just omit it.

Record the reconciliation outcome at the end of the notes:

```markdown
## Coverage reconciliation
- Checklist topics: N — all present in these notes. ✓
- Filled during reconciliation: [list any that were initially missed, now added]
- Flagged (uncoverable / uncertain): [list with reason, or "none"]
```

The completeness invariant — every checklist topic present — is the #1
guarantee. Do not finalize until it holds.

---

## Step 5: Output

Write `revision-notes.md` in format-agnostic Markdown per `templates.md`. If the
user asked for a cheat sheet, also emit `quick-reference.md` per the template in
`templates.md` (one line per entry, ordered by exam relevance — no prose). For
PDF export, load `pdf-export.md` and convert with pandoc/xelatex per
`pdf-export.md` (the `/pdf` skill is for reading input PDFs, not generating this
output).

> **No standalone exam-Q&A bank.** v3.0 deliberately drops the heavy exam-Q&A
> product (and interactive quizzing / spaced repetition / Anki). The deliverable
> is the notes plus the optional one-line cheat sheet.

---

## Writing style

- **Concise but complete.** Every sentence earns its place; cut filler.
- **Capsule-first, then precise.** Accessible plain language before the formal
  treatment, always.
- **Active voice, correct terminology**, defined on first use.
- **Code and formulas are first-class** — formatted, never truncated.

## Anti-patterns

- **DO NOT** lead a concept with the formal definition — capsule first.
- **DO NOT** skip the worked example for a non-trivial concept.
- **DO NOT** fabricate an example for a pure-definition term — capsule + a note.
- **DO NOT** finalize without the Step-4 reconciliation; never silently drop a topic.
- **DO NOT** pad a trivial topic into a full block — capsule + one-liner.
- **DO NOT** silently correct a slide that contradicts curriculum — flag it.
- **DO NOT** break the backbone order (forward/back links are fine).
- **DO NOT** build a separate exam-Q&A bank — it was cut.
