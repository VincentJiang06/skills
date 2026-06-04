# phase-cover — Phase 1: Cover (extract everything + emit the coverage checklist)

## Goal

Capture **every** concept, definition, formula, algorithm, code snippet, and
diagram in the course, **page-aligned and traceable**, and emit the **coverage
checklist** — the completeness ledger Phase 2 reconciles against. Zero
information loss is the target; nothing is silently skipped.

## File reading rule (hard control)

**ALL PDF reading goes through the `/pdf` skill** — including **scanned /
image-only** PDFs (the `/pdf` skill handles OCR). NEVER use Python, bash, or any
direct/raw file I/O to read a PDF. If a file is not a PDF (PPTX/DOCX/image), stop
and ask the user to convert it via `/pdf` first.

## Source reference format

| Input type | Unit | Reference format |
|---|---|---|
| PDF / slide file | Page number | `Lecture X, p. Y` |
| Topic list | Section item | `Section X.Y` |
| Searched syllabus | Syllabus entry | `Module X, Section Y` |

Use one format throughout all phases; never mix, never reference a location that
does not exist.

---

## Path A — PDF slides

### Step 1: Read via the /pdf skill

Invoke the `/pdf` skill on each file (scanned/image-only included). Note the total
page count from its output.

### Step 2: Page-by-page extraction

For EVERY page, output one dense block (no padding):

```markdown
### Page X (of N) — [Slide title]

**Key content:**
- [Definitions — exact wording]
- [Formulas — $LaTeX$]
- [Algorithms — pseudocode or code block]
- [Diagrams — describe structure, name all labeled elements]
- [Tables — reproduce as Markdown]
- [Examples — reproduce in full]

**Concepts introduced:** [comma-separated]
**[THIN?]:** [concept — looks under-covered vs standard curriculum] *(omit if none)*
```

Empty/title pages still get a block (`[Title page — no substantive content]`).

### Step 3: Tier calibration

Apply the Phase-0 tier. Light: full block per page. Medium: full block + a short
lecture summary. Heavy: after each lecture, compress to a concept-inventory line
(`- [Concept] | Lecture X, pp. Y-Z | [type]`) in working memory; the full blocks
are still written to the extract file. Split (>~400p): work per-module in
batches; the checklist (below) still spans the whole course.

### Step 4: Honor the source

If a slide **contradicts** standard curriculum, do NOT silently "correct" it —
record it verbatim with its page ref and add a `[DISCREPANCY]` note (the slide
says X; standard curriculum says Y). Phase 2 carries this forward as a flagged
discrepancy, never an overwrite.

Output per PDF: `lecture-XX-extract.md` (zero-padded).

---

## Path B — Topic list

Path B is **page-less**: apply the **topic/concept-count tier** from
`phase-intake.md` Step 2 (≤~30 light / ~31–80 medium / ~81–150 heavy / >~150
split), NOT the page tier. For large lists (>~150 topics → Split), batch by
module and keep the coverage checklist spanning the **whole** course so no topic
is dropped across batches.

1. Parse into hierarchy: Top → Module, Second → Section, Third → Sub-concept.
2. Number it (`1.1`, `1.2`, `2.1`, …) and write `course-backbone.md`.
3. Show the user the structure once: "Does this look right?" — adjust if needed.
4. **Emit `coverage-checklist.md`** (the completeness ledger — see below)
   enumerating every parsed topic with its `Section X.Y` ref and weight. This is
   required on Path B, not just a later step.

## Path C — Course name only

No slides. Path C is **page-less**: apply the **topic/concept-count tier** from
`phase-intake.md` Step 2 (by the number of syllabus topics found), NOT the page
tier; for a broad course that yields >~150 topics → Split, batch by module and
keep the whole-course checklist so nothing drops across batches.

Use `subject-coverage.md` to **search a standard syllabus** and build the
outline. **First confirm a standard syllabus is identifiable** — if NO materials
were provided AND no standard syllabus can be found (niche/idiosyncratic course),
**STOP and ask the user for materials or a reference syllabus** (see
`subject-coverage.md` Mode B); do not generate an outline from thin air. When a
standard syllabus IS identifiable, build the outline and mark generated structure
as standard-curriculum. **Never fabricate a specific lecture's slide content** —
you did not see any slides; do not invent "Lecture 4 slide 12 says…". Frame
everything as standard-curriculum knowledge, and tell the user to verify against
their real syllabus.

---

## The coverage checklist (first-class artifact — REQUIRED on every path)

After extraction (Path A/B/C), emit **`coverage-checklist.md`**: a flat
enumeration of **every topic** in the course — the completeness ledger. This is
not optional; Phase 2 reconciles the notes against it.

```markdown
# Coverage Checklist: [Course Name]

> The completeness ledger. Every topic below MUST appear in revision-notes.md.
> Phase 2 reconciles against this list and flags + fills any miss before finalizing.

- [ ] [Topic 1] — `Lecture 1, pp. 3-7` — [core | important | trivial]
- [ ] [Topic 2] — `Lecture 1, p. 8` — [core | important | trivial]
- [ ] [Topic 3] — `Lecture 2, pp. 1-4` — [core | important | trivial]
...
```

Rules:
- **Enumerate every topic** found in extraction — including trivial ones (mark
  them `trivial`; they still get covered, at minimal depth, in Phase 2).
- Each entry carries its **source location** and a **weight** (core / important /
  trivial) so Phase 2 can calibrate depth without dropping anything.
- For Split-tier courses, the checklist spans the **whole** course even when
  notes are produced per-module; topics are checked off across batches so none
  is dropped.

---

## Completeness check (fast)

```
Pages in file: N  →  "### Page X" blocks: must = N
Topics found in extraction  →  every one present as a line in coverage-checklist.md
```

If a content-rich page yields < ~5 lines, re-read it. Do not skip pages you
consider unimportant.

## Anti-patterns

- **DO NOT** read PDFs with Python / raw file I/O — `/pdf` skill only, scanned too.
- **DO NOT** merge multiple pages into one block.
- **DO NOT** skip pages or omit a topic from the coverage checklist.
- **DO NOT** silently correct a slide that contradicts curriculum — flag it.
- **DO NOT** fabricate slide content on the course-name path.
