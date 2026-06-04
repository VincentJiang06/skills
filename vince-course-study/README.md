# course-study

![course-study banner](banner.jpeg)

> Turn a course into **complete-coverage, Feynman-explained, exam-ready revision
> notes** — every topic distilled into the most efficient form that still
> produces true understanding. Built for exam season.

---

## Install

```bash
clawhub install course-study
```

> Get it at **[clawhub.io](https://clawhub.io)** — the fastest way to add skills to Claude Code.

---

## What problem does this solve?

Your exam is in a few days and you have a stack of lecture slides. You don't need
another pile of bullet points copied from the slides — you need notes that make
every topic *click*, with **nothing left out**.

This skill gives you:

- **Every topic, no gaps.** Phase 1 builds a coverage checklist of every topic;
  Phase 2 reconciles the finished notes against it and fills anything missing.
  Completeness is the #1 guarantee.
- **The Feynman treatment for every concept** — explained simply first (plain
  language, no jargon), then the intuition, the formal version (LaTeX/code), a
  **mandatory worked example**, and the connections + the misconception students
  trip on.
- **Source traceability.** Every note points back to its slide page or syllabus
  section.
- **An optional cheat sheet** (`quick-reference.md`) — one line per formula,
  definition, and trap, ordered by exam relevance.
- Clean Markdown, with optional PDF export (CJK/bilingual aware).

---

## Who is this for?

Any student revising for an exam, in **any subject** — STEM, social sciences,
humanities, professional programs. Input is course materials as PDF (via the
`/pdf` skill), a pasted topic list, or just a course name.

---

## How it works

Four lean phases. You stay in control — each ends with a one-line checkpoint.

```
Phase 0 — Intake (one exchange)
  What you have, page count, language, exam date, priority topics, output folder.
  The skill picks a scale strategy and detects web access.

Phase 1 — Cover
  Every page extracted via the /pdf skill (nothing skipped or merged), and a
  coverage checklist of every topic is emitted — the completeness ledger.

Phase 2 — Distill  (the main deliverable)
  revision-notes.md: every concept in Feynman order (plain-language capsule
  first → intuition → formal → mandatory worked example → connections +
  misconception), with cross-topic bridges. Then the notes are reconciled
  against the Phase-1 checklist so no topic is dropped.

Phase 3 — Supplement  (optional, light)
  Only for genuine gaps / thin concepts: up to ~10 clearly-sourced additions.
  With web access, real retrieved sources; offline, marked
  [Standard curriculum knowledge] with nothing invented.
```

---

## What you get

**`revision-notes.md`** (always) — the complete, Feynman-explained notes.

**`quick-reference.md`** (optional) — a one-line-per-entry cheat sheet ordered by
exam relevance, for last-minute or open-book review.

**PDF** (optional) — generated with pandoc/xelatex (see `rules/pdf-export.md`),
with CJK/bilingual font handling so Chinese renders without tofu. (Reading
*input* PDFs is the `/pdf` skill's job; *generating* the output PDF is a separate
pandoc step.)

---

## Each concept block

```
Explain it simply  — plain-language capsule, no jargon (comes FIRST)
Intuition          — why it exists, what problem it solves
Formal treatment   — formula or algorithm in LaTeX or code
Worked example     — step-by-step, concrete numbers or trace (mandatory)
Connections        — what it requires, what it enables, the common misconception
```

A trivial topic is still covered (capsule + a one-liner) but not padded. A
pure-definition term with no real example gets a capsule + a note — never a faked
example.

---

## Supported input

| Input | How to provide |
|---|---|
| **PDF** (slide export, scanned, standalone) | Point the skill at it — read via the `/pdf` skill |
| PowerPoint / PPTX, Word / DOCX, images | Convert to PDF via `/pdf` first |
| Topic / concept list | Paste it — becomes the coverage checklist |
| Just a course name | Type it — the skill searches a standard syllabus to build the outline |

> All PDF reading (scanned PDFs included) goes through the `/pdf` skill. No
> Python or raw file I/O is used.

---

## Scale handling

| Course size (PDF, by page) | Strategy |
|---|---|
| ≤ 60 pages | Full extraction |
| 61–200 pages | Batch by lecture |
| 201–400 pages | Batch + compress intermediate detail |
| > ~400 pages | Recommend splitting by module |

For a **topic list or course name** (no page count), size by **topic count**
instead: ≤~30 Light / ~31–80 Medium / ~81–150 Heavy / >~150 split by module.

Large courses are batched — nothing is silently skipped, and the coverage
checklist spans the whole course.

---

## What this skill does NOT do

- Album / music review → use **vince-album-review**.
- Open-ended tutoring conversation.
- **Solving or doing your graded homework / exam questions** to submit — it
  produces revision material, not answers to assessments.
- Notes for a course with no materials *and* no identifiable standard syllabus.
- Interactive quizzing, spaced repetition, Anki export, or a standalone exam-Q&A
  bank (all dropped in v3.0 as too complex).

---

## File structure

```
course-study/
├── SKILL.md                    # Thin orchestrator: pipeline, controls, references
├── README.md                   # This file
├── evals/                      # Behavioral eval cases + written acceptance
└── rules/
    ├── phase-intake.md         # Phase 0: single-exchange intake, scale tier
    ├── phase-cover.md          # Phase 1: /pdf extraction + the coverage checklist
    ├── phase-distill.md        # Phase 2: Feynman blocks + coverage reconciliation
    ├── phase-supplement.md     # Phase 3: optional light supplement (≤~10, dual mode)
    ├── templates.md            # Writing rules + Feynman-block & cheat-sheet templates
    ├── subject-coverage.md     # Course-name input & standard-syllabus search
    ├── pdf-export.md           # PDF conversion config (loaded only when needed)
    └── changelog.md            # Version history
```

---

## Changelog

### v3.0.0 (Current) — Feynman revision-notes redesign

- New pedagogy: the **Feynman concept block** (plain-language capsule first +
  mandatory worked example).
- **Completeness invariant:** a Phase-1 coverage checklist + a Phase-2
  reconciliation step so no topic is silently dropped.
- Lean 4-phase pipeline (Intake → Cover → Distill → Supplement); synthesis folded
  into Phase 2 as bridges.
- Phase 3 Supplement lightened and capped at ≤~10 targets.
- **Dropped** interactive quizzing, spaced repetition, Anki export, and the
  standalone exam-Q&A bank.
- Added behavioral eval cases.

### v2.0.0
- Exam Ready package (Quick Reference + Exam Q&A Appendix); priority topics.

### v1.1.0
- PDF-only input via the `/pdf` skill; single-exchange intake; batching.

### v1.0.0
- Initial four-phase Extract → Synthesize → Expand → Study workflow.
