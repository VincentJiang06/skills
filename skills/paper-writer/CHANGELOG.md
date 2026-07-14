# Changelog — paper-writer

All notable changes to the `paper-writer` skill. Semver.

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
