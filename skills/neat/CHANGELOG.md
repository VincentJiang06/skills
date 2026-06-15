# Changelog — neat-freak

All notable changes to this skill.

## v1.1.0

Added executable verification and externalized controls.

- **scripts/kb_audit.mjs** — deterministic anti-bloat/anti-rot linter encoding the
  prose invariants as machine-checkable gates (MEMORY.md byte/line HARD ceilings,
  single-memory + CLAUDE.md SOFT ceilings, relative-time leakage with code-block +
  substring exemption, memory-vs-docs inversion, broken-index-link with anchor/`./`
  normalization + unicode-safe existence). Emits JSON `{violations,hardFail,skipped,
  summary}`; CLI exits non-zero on any HARD violation.
- **evals/run_all.mjs** — re-runnable harness importing kb_audit, one `PASS/FAIL`
  line per case over `evals/fixtures/`, exits 0 iff all pass. Covers all 13
  adversarial boundary edges + contract + metamorphic/idempotency.
- **evals/trigger_cases.json** — labeled trigger precision/recall set (positives +
  adjacent negatives) for `scripts/trigger_eval.mjs`.
- **rules/** — Modules split: `kb-audit-usage.md`, `leakage-and-size-policy.md`,
  `controls.md`; SKILL.md gains a Modules table.
- **Description** — added an explicit "Do NOT use for…" boundary (no over-trigger on
  bare 整理/tidy with no dev context, code cleanup, pasted-text reformat); body gains
  a "When NOT to use / 不适用" section.
- **Controls + Lifecycle** sections added (destructive-op guardrails, git-recovery
  one-liner, release gate = evals green).

## v1.0.0

Initial cross-platform behavioral protocol (第零~第五步), three-audience knowledge
model, promote/graduate mechanism, references/agent-paths.md + references/sync-matrix.md.
