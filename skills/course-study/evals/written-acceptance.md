# Written acceptance — course-study (v3.0)

This is a **pure LLM-behavioral `lite` skill**: no executable harness, no
`scripts/` directory. Each eval case in `eval-cases.json` is graded by **behavioral
reasoning** — read `SKILL.md` + the cited `rules/` module, follow it on the
case's `prompt`, and check the resulting behavior/output against the case's
`acceptance`. Grading asserts on **behavior**, never on a bare SKILL.md
string-grep.

To keep the design invariants those cases depend on from silently regressing,
`evals/grade.mjs` pins each case's `red_probe` predicates over the skill's own
authored rules. It is **not** the skill's mechanism (the skill has no
deterministic algorithm) — it is a reusable acceptance-checker:

- Against the **OLD** design (`/tmp/vince-course-study-OLD`): 11 cases FAIL →
  `.skill-engineer/red/red.log` (the RED artifact). The 8 adversarial edges that
  fail are the genuinely new guarantees; the 3 that already pass on OLD
  (offline-marker, >400-split, CJK export) are carry-forward invariants and are
  honestly shown PASS in red.log, not faked red.
- Against the **NEW** design (repo root): **21/21 PASS** (`node evals/grade.mjs .`).

**Iteration 2 (regression fixes):** 5 new `reg_*` cases lock the 5 adjudicated
bug fixes. They were red-first against the pre-fix state and the OLD backup
(`.skill-engineer/red/red-2.log`), then green after the fixes; all 16 prior cases
(incl. the 11 adversarial edges, verbatim) stay PASS.

Each predicate is behavior-distinguishing: it flips to FAIL if the protocol step
it protects is deleted (e.g. remove the Phase-2 reconciliation step →
`reconciliation_step` fails → `adv_coverage_reconciliation` goes red).

---

## How each case is graded (behavioral evidence)

### Happy path & capability

- **happy_path_pdf_web** — Running the skill on a 3-PDF / ~90-page OS course
  yields: a single Phase-0 intake; Phase-1 reads each PDF via `/pdf` and emits
  `coverage-checklist.md`; Phase-2 writes `revision-notes.md` with every concept
  in Feynman order (capsule first, mandatory worked example) and a source
  location, then reconciles against the checklist. Evidence: SKILL.md pipeline +
  the Feynman block section; `phase-cover.md` "coverage checklist" artifact;
  `phase-distill.md` Steps 2 & 4.
- **cap_feynman_order_mandatory** — A gradient-descent block leads with "Explain
  it simply" before intuition/formal. Evidence: SKILL.md "plain-language capsule …
  FIRST, always"; `phase-distill.md` Step 2 order.
- **cap_worked_example_mandatory** — A Bayes'-theorem block includes a numeric
  worked example. Evidence: `phase-distill.md` "Worked-example rule (invariant)".
- **cap_supplement_cap_10** — Phase 3 caps targets at ≤~10 and asks if more.
  Evidence: `phase-supplement.md` "Hard cap: ≤ ~10".
- **cap_pdf_only_input** — A `.pptx` is not read raw; the skill routes through
  `/pdf` (convert first). Evidence: SKILL.md control #1; `phase-cover.md` file
  reading rule.

### Adversarial (one per checklist edge — see `checklist_coverage` in build-report)

- **adv_course_name_only** — Course-name path searches a standard syllabus, builds
  the outline + checklist, and never fabricates a specific lecture's slide
  content. Evidence: `phase-cover.md` Path C; `subject-coverage.md`; control #4.
- **adv_offline_no_fabrication** — Offline Phase 3 marks `[Standard curriculum
  knowledge]`, invents zero URLs/papers/authors. Evidence: `phase-supplement.md`
  Mode B.
- **adv_trivial_topic_minimal** — A trivial topic is present but at capsule +
  one-liner depth, not padded. Evidence: `phase-distill.md` depth-calibration
  table (trivial row) + completeness.
- **adv_oversized_split** — >400 pages → per-module split recommended, batched, no
  silent drops. Evidence: `phase-intake.md` Split tier; SKILL.md control #7.
- **adv_slide_contradicts_curriculum** — A contradicting slide is flagged as a
  `[DISCREPANCY]` (both views shown), not silently corrected. Evidence:
  `phase-cover.md` Step 4; `phase-distill.md` "Discrepancy carry-forward";
  control #6.
- **adv_scanned_pdf_routing** — A scanned/image-only PDF is read via `/pdf` (it
  handles OCR), never raw I/O. Evidence: `phase-cover.md` file reading rule
  ("scanned / image-only … the /pdf skill handles OCR").
- **adv_cjk_pdf_export** — Bilingual + PDF → `pdf-export.md` applies xelatex +
  CJKmainfont so Chinese renders without tofu. Evidence: `pdf-export.md`.
- **adv_pure_definition_no_fake_example** — A pure-definition term gets capsule +
  "Definitional — no worked example applies", never a fake example. Evidence:
  `phase-distill.md` worked-example escape hatch; control #3.
- **adv_coverage_reconciliation** — A topic missing from the draft is flagged and
  filled in the Step-4 reconciliation before finalizing; never silently dropped.
  Evidence: `phase-distill.md` Step 4; SKILL.md control #2.
- **adv_adjacent_refuse** — "Solve my take-home exam to submit" is declined (offer
  to make it a study topic instead); album-review phrasing defers to
  album-review. Evidence: SKILL.md description Do-NOT list + control #8.
- **adv_quick_reference_one_line** — `quick-reference.md` is one line per entry,
  ordered by exam relevance; no standalone exam-Q&A bank. Evidence: `templates.md`
  cheat-sheet template; `phase-distill.md` "No standalone exam-Q&A bank".

### Regression (iteration 2 — one per adjudicated bug fix)

- **reg_pdf_output_pandoc** (Bug 1) — Bilingual notes + PDF: course PDFs are READ
  via `/pdf` (input); the OUTPUT notes PDF is GENERATED with pandoc + xelatex (CJK
  config) per `pdf-export.md`. No file routes the OUTPUT conversion through `/pdf`
  instead of pandoc. Evidence: `pdf-export.md` INPUT-vs-OUTPUT note + pandoc/xelatex
  body; `phase-distill.md` Step 5; `templates.md` PDF-conversion note; `phase-cover.md`
  keeps `/pdf` as the input reader.
- **reg_scale_topic_count** (Bug 2) — A ~200-topic list (Path B) and a broad
  course name (Path C) pick the tier by TOPIC COUNT (pages undefined): >~150 →
  Split, batched, whole-course checklist, nothing dropped. Evidence: `phase-intake.md`
  Step 2 topic/concept-count tier; SKILL.md control #7 ("Size picks the tier —
  page count (PDF) or topic count"); `phase-cover.md` Path B/C.
- **reg_web_detection** (Bug 3) — Web mode is decided at intake by WebSearch/WebFetch
  tool availability; uncertain → defaults offline (user may override); supplement
  agrees on who decides. Evidence: `phase-intake.md` Step 3; `phase-supplement.md`
  Step 0.
- **reg_no_syllabus_refusal** (Bug 4) — Niche offline course, no materials AND no
  findable standard syllabus → STOP and ask for materials/syllabus; do not invent
  an outline. Evidence: `subject-coverage.md` "STOP if no materials AND no
  identifiable standard syllabus"; `phase-cover.md` Path C; SKILL.md description Do-NOT.
- **reg_brevity_vs_completeness** (Bug 5) — "Keep it short / one page" → every
  topic still covered (none dropped); brevity via depth calibration + the cheat
  sheet. Evidence: SKILL.md control #9 + Anti-Patterns row; `phase-distill.md`
  "Brevity vs completeness".
