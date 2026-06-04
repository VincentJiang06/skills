# Changelog — vince-album-review

All notable changes to this skill. Format loosely follows Keep a Changelog;
versioning is semver.

## [0.1.0] — 2026-06-04

Initial built + tested release (via the vince-skill pipeline; Stage 2 engineer).

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
