# changelog — Version History

## v3.0.0 (Current) — Feynman revision-notes redesign

Deliberate scope change: a **simpler, exam-focused course-revision skill**.

- **New pedagogy: the Feynman concept block.** Every concept is written
  plain-language **capsule FIRST**, then intuition → formal (LaTeX/code) →
  **mandatory worked example** → connections + common misconception. No leading
  with the formal definition.
- **Completeness as a checkable invariant.** Phase 1 Cover emits a **coverage
  checklist** (the ledger); Phase 2 Distill **reconciles** the notes against it
  and flags + fills any missing topic before finalizing — nothing silently dropped.
- **Lean 4-phase pipeline:** Phase 0 Intake → Phase 1 Cover → Phase 2 Distill →
  Phase 3 Supplement (optional, light). Folded the old cross-lecture synthesis
  into Phase 2 as bridges; no separate synthesis document.
- **Phase 3 Supplement lightened + capped at ≤~10 targets** (was 15); dual
  web / no-web with citation discipline and the `[Standard curriculum knowledge]`
  offline marker preserved.
- **Primary output `revision-notes.md`**; optional one-line-per-entry
  `quick-reference.md` cheat sheet.
- **Intake simplified** to a single exchange — dropped the Standard-vs-Exam-Ready
  package choice.
- **DROPPED (rejected as too complex):** interactive quizzing, spaced repetition,
  Anki/flashcard export, adaptive diagnosis, and the **standalone exam-Q&A bank**.
- Added explicit Do-NOT / adjacent negatives to the description (not album review,
  not open-ended tutoring, not solving graded homework/exam questions).
- Added **behavioral eval cases** under `evals/` (happy-path + capability + one
  per adversarial edge).

## v2.0.0
- Exam Ready output package (Quick Reference Sheet + Exam Q&A Appendix).
- Priority topic support; exam date at intake.
- Simplified modes: Standard vs Exam Ready (removed interactive/session features).

## v1.1.0
- Added compression tiers for large courses.
- Improved PDF handling with the `/pdf` skill.
- Added subject-coverage search for any discipline.

## v1.0.0
- Initial release: Extract → Synthesize → Expand → Study workflow.
