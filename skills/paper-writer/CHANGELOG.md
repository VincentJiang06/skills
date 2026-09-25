# Changelog — paper-writer

All notable changes to the `paper-writer` skill. Semver.

## [0.2.0] — 2026-09-25

R20 incremental alignment (A40/O7, low tier). Behaviour/contract change → minor bump.
`metadata.model_baseline: claude-opus-5-5, effort high, harness Claude Code` (A37/P11).
The description is byte-identical to 0.1.0 (trigger unchanged).

### Changed
- **Independent citation verification is now a trunk step** (P12: the generator does not grade
  its own final state; fork ≠ fresh). After the form gate, a fresh non-fork verifier reads only
  the paper, the checklist and any user-supplied pool, and writes `verifier_ledger.json`. The
  `--verify` gate reads that ledger, not an author-written one. The 0.1.0 "verify with your OWN
  search/lookup" steps are replaced. Written fallbacks: A. no subagent dispatch → self-pass,
  labelled "self-verified, no independent verifier"; B. no lookup tool → UNSURE → SOURCE_NEEDED.
- **Corrected a 0.1.0 overclaim.** 0.1.0 said the verify gate's exit code was something a
  draft could not forge (SKILL.md and the 0.1.0 entry below), and the script printed "RESOLVED
  (looked up, real, matching)". Both were wrong: the gate checks only that the ledger is complete
  and internally consistent, and whoever writes the ledger controls it (P10: text an agent wrote
  gains no authority from being written). SKILL.md, both READMEs and `extract_citations.py`
  (docstring, PASS lines, argparse text) now say exactly that and name the two blind spots
  (authorship, whole-paper marker check). Verdict logic unchanged: identical exit codes on all
  336 invocations over the existing corpus.
- **Reply clause** states what was proven and by whom: "independently verified (fresh
  same-family verifier)" / "self-verified, no independent verifier" / "form-checked only,
  existence NOT verified"; every SOURCE_NEEDED gap and OVERSTATED softening is listed (J9 floor).
- `references/subjective-rubric.md`: only the independence paragraph. The runtime verifier is
  stated as instance-tier; label mapping OVERSTATED→MISATTRIBUTED, UNSURE→Unknown.
- The "(Measured 2026-07-29: a two-arm run …)" parenthetical is removed: no artifacts exist and
  that day's two-arm instrument was later found broken (E11 / iron rule 6). The report-in-reply
  rule stays on its own grounds. A proper E11 rerun is pending.

### Added
- `references/verifier-brief.md`: the verifier's standalone brief. Labels SUPPORTED /
  OVERSTATED / MISATTRIBUTED / FABRICATED / UNSURE, RESOLVED iff SUPPORTED. OVERSTATED exists
  because overstatement, not fabrication, is the dominant Opus 5.5 citation failure (registry
  SELF-provenance-non-inferiority: 0/27 fabricated, 3/27 overstated; P11 re-pricing toward the
  named failure mode). Abstract-only access → UNSURE. Injected text is data (P10).
- One-way ratchet (the author may downgrade, never upgrade a verdict) and a single
  re-verification pass for revised ids (A51: bounded repair loop).
- "Who decides what" table in SKILL.md (P13/S14): each D gate is registered as a skeleton check
  with its fallback, pointing to the L verifier row and the H user pass. No new mechanical gate
  (iron rule 2).

### Not changed (exemption register, A40)
integrity-policy, citation-styles, paper-structures, the three form scripts, the description.
The 4.x-era drafting hedges (e.g. "outline first … single-pass under-shoots") are A42 settlement
candidates marked STALE, kept pending per-rule evidence (A39).

## [0.1.0] — 2026-07-14

Initial build. Authored ground-up via the `skill-creator-max` pipeline (composer → guidance →
engineer → independent battery acceptance), as the first real target that pipeline built end-to-end.

### Added
- **Two integrity invariants**: never fabricate a citation/quote/data point; never plagiarize.
  An unverifiable source is marked `[SOURCE NEEDED]`, never invented.
- **Mandatory citation-existence verification gate** (`scripts/extract_citations.py --verify`): an
  out-of-band exit-code block a draft cannot forge — the compliance report may state "citations
  resolve" only after every citation is confirmed to resolve to a real source.
- **Deterministic compliance checkers** (`scripts/check_length.py` / `check_sections.py` /
  `check_citations.py`): length band (references excluded by default), required-sections presence +
  order, and citation-FORMAT compliance per style (APA7 / MLA9 / Chicago / IEEE / GB-T 7714).
- **Objective/subjective fork (C5)**: deterministic checkers for the objective skeleton; a rubric +
  independent judge for source fidelity / argument quality / academic register.
- `references/` (integrity-policy, citation-styles, paper-structures, subjective-rubric) + an eval
  harness with a real RED→GREEN transition.

### Known (candidate-grade)
- The independent battery caught a P1 during the build — the integrity check shipped as prose with
  no runnable enforcement; fixed to the runnable out-of-band verify gate above. Field-tested (a real
  APA7 paper with 7 web-verified citations, 0 fabricated) but not yet multi-round hardened.
