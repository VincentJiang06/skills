# Changelog — album-review

All notable changes to this skill. Format loosely follows Keep a Changelog;
versioning is semver.

## [0.2.0] — 2026-07-31

Honesty pass on the publish gate. The validator did not change; what changed is
**what the skill claims the validator proves**, and what the evals treat as an
exemplar. Anchors: **E12** (a gate that scores a degenerate input as a pass is a
broken target, not a passing run; false positives first), **H7** (a success-side
metric without its completeness partner must be labelled 未测), **H4/H5**
(disjunctive stop condition with an escalate exit).

### Fixed
- **Locked decision over-claimed its own scope.** "Padding cannot game the floor"
  was proven only for Latin/digit/punctuation padding (`cjk_padding_fails_floor.md`).
  **汉字-level repetition padding was never covered** — a 10,500-字 wall of one
  repeated paragraph exits 0 today. SKILL.md now states the exact scope, names the
  blind spot, and says plainly that exit 0 is evidence of length, never of substance.
- **A degraded input was frozen into the evals as a positive.**
  `evals/fixtures/obscure_degraded.md` was generator filler: one ~150-字 paragraph
  repeated to 10,500 字, asserted by the harness as a legitimate honest-degradation
  review. It is replaced by **hand-written, non-repeating prose** (10,190 字, zero
  repeated 20-grams, synthetic album so no real discography is misdescribed) that
  keeps the 公开资料有限 / 资料不足 markers and still clears the gate. The generator
  no longer produces this file — see the note in `_gen_fixtures.py`.
- **Step 6 had a one-sided stop rule** ("fix and re-run until exit 0"), which
  rewards padding whenever the floor cannot honestly be reached. Replaced with a
  disjunction: **green** (exit 0 → ship) / **fix** (a real gap → fix it) /
  **escalate** (two consecutive rounds add zero net substance and the floor is
  still unmet → stop patching and report that the floor and this album's material
  are incompatible — a charge against the contract, settled by the human). Adding
  字 to close the gap is banned outright.

### Added
- `evals/JUDGE-MUST-FLAG.md` — registry of negatives the deterministic gate
  **cannot** catch, so a known blind spot stays visible instead of silently absent.
- `evals/fixtures/repetition_padded_10k.md` — the first entry: full section
  coverage, 10,500 字, **exits 0**, and is junk.
- `evals/run_all.py` case `judge_must_flag_registry` — checks only what a machine
  can honestly check (the registry exists; every listed fixture is present and
  named in it). 18 → 20 cases, GREEN.
- `rules/metric-plan.md` — the completeness partner of the length metric
  (distinct-content / repetition rate) is declared **未测, no instrument**, rather
  than left implied by the success-side numbers.

### Deliberately NOT done
No repetition-rate, similarity, or distinct-n-gram threshold was added to
`check_review.py`. "Is this distinct content or one paragraph in a hall of
mirrors" is a semantic judgment; a threshold that decides it would fire on
legitimate reviews (a 逐曲 section legitimately reuses vocabulary), and a
mis-firing gate gets ignored, which is worse than no gate. The blind spot is
handled by prose + registered negatives + a human/judge read.

### Release gate
`python3 evals/run_all.py` GREEN (20/20) **and** a human/judge rejects every
fixture in `evals/JUDGE-MUST-FLAG.md`.

## [0.1.0] — 2026-06-04

Initial built + tested release (via the skill pipeline; Stage 2 engineer).

### Added
- Thin SKILL.md orchestrator with Use-when / Do-NOT trigger surface and a
  7-step protocol (preflight+route → classify → research → reason → write →
  verify → report).
- `scripts/check_review.py` — deterministic validator: CJK-汉字 length window
  [10000,15000] (regex `[一-鿿]`, Latin/digits/punctuation excluded), a
  genre-adapted required-section linter (`standard` / `classical`, the latter
  enforcing WORK-vs-PERFORMANCE + 参考录音/版本比较), an optional `--backing`
  traceability gate, and an adjacent-input `classify_route` guard.
- `scripts/validate_backing.py` + `schemas/backing.schema.json` — backing JSON
  contract; every fact-class claim's `source_id` must exist in `evidence[]`
  (fabricated / untraced facts FAIL).
- `rules/` (research-protocol, genre-lenses, output-template, metric-plan),
  `references/source-roster.md`, `assets/` (review-template, backing.example).
- `evals/run_all.py` re-runnable harness (imports the mechanism from `scripts/`)
  + 17 fixture cases covering all 10 adversarial edges; 17/17 GREEN.

### Release gate
Ship only when `python3 evals/run_all.py` exits 0 (GREEN). Roster/template
changes require re-running the eval fixtures.

### Rollback
Revert to the prior `SKILL.md` + `scripts/`.
