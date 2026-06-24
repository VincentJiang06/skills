---
name: course-study
description: >-
  Turn a course's materials (slides, a topic list, or a course name) into
  complete-coverage, Feynman-explained, exam-ready revision notes. Use to
  study/revise a course or build an exam cheat sheet: "revise these slides",
  "$course-study". Do NOT use to do the user's graded homework for submission.
license: MIT
model: claude-sonnet-4-6
user-invocable: true
metadata:
  version: 3.0.1
  author: claude-code
  domains:
    - education
    - study
    - exam-prep
    - learning
---

# Course Study v3.0

A lean four-phase workflow that turns a course into **complete-coverage,
Feynman-explained, exam-ready revision notes**. The #1 guarantee is
**completeness** (every topic covered, nothing silently dropped); the defining
pedagogy is the **Feynman concept block** (plain-language capsule first +
mandatory worked example).

Primary output: **`revision-notes.md`**. Optional: a one-line-per-entry
**`quick-reference.md`** cheat sheet, and PDF export (CJK/bilingual aware).

This file is a thin orchestrator — load the `rules/` module for each phase.

---

## Pipeline

```
Phase 0 Intake (single exchange)
  ├── PDF slides → Phase 1 (extract via /pdf skill)
  ├── Topic list → Phase 1 (parse into the checklist)
  └── Course name → search standard syllabus → Phase 1
Phase 1 Cover    → extract ALL content (page-aligned) + EMIT the coverage checklist (the ledger)
Phase 2 Distill  → revision-notes.md in Feynman block order; RECONCILE against the Phase-1 checklist
Phase 3 Supplement (OPTIONAL, light) → ≤~10 sourced targets for genuine gaps / thin concepts
VERIFY/REPORT    → coverage reconciled, examples present, sources traced; emit files
```

Each phase ends with a **one-line checkpoint**; proceed on no-objection. Never
spread intake across multiple messages.

- **Phase 0 — Intake:** load `rules/phase-intake.md`. One exchange: input type,
  rough page count → scale tier, output language, exam date, priority topics,
  output folder; detect web access silently.
- **Phase 1 — Cover:** load `rules/phase-cover.md`. Extract every concept
  page-aligned (PDF via the `/pdf` skill; or parse the topic list; or build the
  outline from a searched standard syllabus). **Emit the coverage checklist**
  enumerating every topic — the completeness ledger Phase 2 reconciles against.
- **Phase 2 — Distill (main deliverable):** load `rules/phase-distill.md`. Write
  `revision-notes.md` in backbone order, each concept in the **Feynman block
  order** below, with cross-topic bridges. Then **reconcile** the notes against
  the Phase-1 checklist — flag and fill any missing topic before finalizing.
- **Phase 3 — Supplement (optional, light):** load `rules/phase-supplement.md`
  only for genuine gaps / thin concepts. Cap **≤~10** targets. Dual web / no-web.

---

## The Feynman concept block (Phase 2 — mandatory order)

Every concept is written in this exact 5-part order, **plain-language capsule
FIRST** (never lead with the formal definition): **(1) capsule** → **(2)
intuition** → **(3) formal treatment** → **(4) worked example** (mandatory for
every non-trivial concept) → **(5) connections + common misconception**.

The full per-part prose lives verbatim in `rules/phase-distill.md` (Step 2).
Full template and depth calibration: `rules/phase-distill.md` and
`rules/templates.md` — load them in Phase 2.

---

## Global Rules (controls)

1. **PDF-only input via /pdf.** ALL PDF reading — including scanned / image-only
   PDFs — goes through the `/pdf` skill. NEVER raw file I/O or Python on PDFs.
   Non-PDF inputs (PPTX/DOCX/images) are converted via `/pdf` first.
2. **Completeness invariant.** Phase 2 notes are reconciled against the Phase-1
   coverage checklist before finalizing. Any extracted/checklist topic missing
   from the notes is flagged and filled — **never silently dropped or skipped.**
3. **Worked-example invariant.** Every non-trivial concept gets a concrete worked
   example. A pure-definition concept with **no feasible** example gets the
   plain-language capsule + a short note (e.g. "definitional — no worked example
   applies") — **never a fabricated/forced example.**
4. **No fabrication.** Offline supplements are marked `[Standard curriculum
   knowledge]`; ZERO invented URLs / papers / authors / slide content. Uncertain
   claims are omitted or flagged `[Uncertain — verify before exam]`. On the
   course-name path, never fabricate a specific lecture's slide content.
5. **Source traceability.** Every note traces to its source location: page (PDF,
   `Lecture X, p. Y`) or section (topic list / syllabus). Never lose it.
6. **Honor the source.** A slide that contradicts standard curriculum is
   **flagged as a discrepancy** (show the slide's claim + the standard view) —
   NOT silently "corrected" to the textbook version.
7. **Scale guard.** **Size** picks the tier — page count (PDF) or topic count
   (topic list / syllabus): large inputs (>~400 pages, or >~150 topics) → split,
   recommend per-module runs and batch; the checklist spans the whole course so
   nothing is silently dropped across batches.
8. **Scope guard.** Produce revision material, not answers to graded
   assessments. Do NOT solve / do the user's actual homework or exam questions
   for submission; offer how to approach them as a study topic instead.
9. **Output discipline.** Dense notes, no padding. `quick-reference.md` (if
   produced) is **one line per entry**, ordered by exam relevance — no prose.
   **Completeness of coverage is non-negotiable — never drop a topic to be
   brief.** If the user wants brevity, satisfy it via **depth calibration** (more
   topics at minimal capsule depth) and/or the `quick-reference.md` cheat sheet,
   never by omitting topics.
10. **Track progress.** Use a TodoList for which lectures/topics are processed.
11. **Prioritize flagged topics.** Priority topics named in Phase 0 get deeper
    treatment and appear first in `quick-reference.md`.

---

## Reference Files

| File | When to load |
|------|--------------|
| `rules/phase-intake.md` | Phase 0 — single-exchange intake, scale tier, web detection. |
| `rules/phase-cover.md` | Phase 1 — page-aligned extraction + the coverage checklist (ledger). |
| `rules/phase-distill.md` | Phase 2 — Feynman blocks, bridges, the coverage reconciliation step. |
| `rules/phase-supplement.md` | Phase 3 — optional light supplement, dual web/no-web, ≤~10 cap. |
| `rules/templates.md` | Writing rules + the Feynman concept-block & quick-reference templates. |
| `rules/subject-coverage.md` | Course-name input & standard-syllabus search; checklist baseline. |
| `rules/pdf-export.md` | Load **only** when PDF output is requested (pandoc CJK/bilingual config). |
| `rules/anti-patterns.md` | The consolidated do-NOT table (negative form of the Global Rules). |
| `rules/changelog.md` | Version history. |

---

## Anti-Patterns

The Global Rules above are the positive invariants; their negative-form
restatement — the full do-NOT table (lead-with-definition, skip-worked-example,
fabricate-example, skip-reconciliation, silently-fix-slide, drop-topic-for-brevity,
Python-on-PDF, invent-URLs, prose-in-cheat-sheet, build-Q&A-bank) — lives in
`rules/anti-patterns.md`. Each phase file reinforces the ones relevant to it.
