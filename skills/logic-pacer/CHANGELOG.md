# Changelog — logic-pacer

All notable changes to this skill. Versioning is semantic; the version of record lives in
`SKILL.md` frontmatter `metadata.version`.

## 1.0.0

First build (skill-creator-max engineer stage).

- SKILL.md spine: triage-abstain-gate · transform-a-f (six moves) · concision-length ·
  hard-constraints · verify-and-output. Thin orchestration + pointers; detail in references/.
- Trigger: slow the LOGIC pace of already-admired expository prose (reduce inferential step
  size, given-new re-anchoring) while keeping voice + vocabulary + facts/claims/stance and
  staying lean (net <= ~1.3x). Anti-trigger: de-AI (→humanizer-academic), simplify-words /
  对齐词汇, summarize/translate, reorder points, generate-new.
- references/: mechanisms (six-mechanism theory), anti-patterns (forbidden moves),
  worked-example-quetelet (canonical before/after, 1.267x), step-followability-probe
  (blind fresh-subagent cold-reader rubric).
- scripts/pace_checks.py: deterministic objective gates (length ratio, protected-term diff,
  fidelity-anchor presence proxy) with a --selftest that plants traps and proves discrimination.
  Read-only; measurement, not oracle.
- Evidence: red-before-green behavioral baseline (bare prompt), 24-case layer-tagged corpus,
  blind probe 4/4 alignment on the anchor set.
- Known design boundary: a silent stance/claim inversion that preserves entities and
  proposition count is UNSCRIPTABLE — kept as a model-level fidelity invariant + the blind
  probe, deliberately NOT downgraded to a countable check.
- Fix (battery breach, P2/P3): pace_checks fidelity was Quetelet-hardcoded and went vacuously
  "clean" on any other input. Generalised the fidelity gate to a corpus-independent check
  (every source Latin-name + digit-run must survive, works on any prose); made the
  register/downgrade word list OPTIONAL via `--terms FILE`, and — without it — the script now
  reports register as "not checked" instead of a false "none/clean". SKILL.md verify step-1
  description corrected to match. Added an off-corpus regression to run_harness.py proving the
  vacuity is closed (dropped name/date flagged generically; downgrade reported not-checked).
