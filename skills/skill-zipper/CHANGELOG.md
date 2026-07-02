# Changelog — skill-zipper

## 2.0.0 — 2026-07-02

Pipeline-v2 refactor (design: `.loop/pipeline-v2.design.md`).

- **New `rules/portability-checklist.md`**: the maximally-compatible profile —
  the Agent Skills open standard's 6 portable frontmatter fields (with the
  name/description limits as of mid-2026), Claude-Code-only fields flagged as
  progressive enhancement, non-interactive/relative-path/self-declared-deps
  script rules, `skills-ref validate`.
- **Description guidance updated to mid-2026 reality**: dual hard limits
  (portable 1,024 / Claude Code listing 1,536 incl. `when_to_use`), the shared
  ~1% skill-listing context budget (bloat hurts *sibling* skills), `name` is
  display-only (dir = command; reserved-word rules), the "Description Trap"
  named, trigger-eval verification now uses `--runs 3` + holdout selection.
- **Hardening additions**: H11 (bare ALWAYS/NEVER/MUST → rule + rationale, per
  official guidance) and a new diagnosis signal distinguishing reasoning-text
  brevity caps (reliability anti-pattern, −3% in Anthropic's April postmortem)
  from legitimate output-format contracts.
- **Compress addition**: "content the model already knows" is now an explicit
  delete-class ("assume Claude is smart").
- **Progressive-disclosure model updated**: compaction re-attach lifecycle
  (first ~5k tokens/skill, 25k cap — front-load load-bearing instructions),
  references one level deep, ToC for >100-line files.
- **Retrigger scale unified** to the 8-item rubric (0-4 rewrite / 5-6 targeted
  / 7-8 ship) — diagnosis-rubric and plan-template said 7-item, evals said
  8-item; they now agree.
- **Pipeline-mode fixes**: plan-template no longer stalls Stage Z waiting for
  "go"; Step 1 doesn't ask for a path in pipeline mode.

## 1.x — pre-2026-07

See git history (5-operation design 2026-06; measure_tokens description sizing
+ architecture flags, 2026-06-24).
