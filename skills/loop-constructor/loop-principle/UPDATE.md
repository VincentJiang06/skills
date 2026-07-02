# UPDATE.md — standing runbook: keep loop-principle current

This KB reuses the refresh procedure of its sister KB — read and follow
**`../../skill-guidance/skill-principle/UPDATE.md`** (Phases 0–5 and the
quality bar apply verbatim; installed sibling names may carry a prefix, e.g.
`vince-skill-guidance`). Only the specifics below differ.

## What differs for loop-principle

- **Baseline / validation**: `cd loop-principle && node tools/run_all_checks.mjs`
  (all gates must be green before and after), plus the `loop-constructor`
  skill's own evals.
- **Source families** (replace the spec/authoring rows of the sister table):
  - Agent-harness engineering: Anthropic engineering blog (context
    management, subagents/workflows, effort), Claude Code changelog
    (workflows, subagent orchestration, task budgets).
  - Long-running-loop practice: field notes on generator/evaluator role
    separation, contract-first loops, state-on-disk patterns (e.g.
    repo-root `LOOPS.md` and its successors), superpowers RELEASE-NOTES
    (their loop/eval harness evolution).
  - Eval-of-loops: pass@k / transcript grading / judge-hardening work as it
    applies to gated, multi-iteration loops.
- **Propagation targets**: `loop-constructor` (SKILL.md + rules + linter) and
  any `.loop/` runbook templates it emits — keep its selection procedure
  (D0–D5) and decision-log contract in sync with KB changes.
- **Fact registry**: loop bounds and gate semantics quoted in
  `loop-constructor` rules; keep a single-source rule — bounds defined once,
  referenced elsewhere (same discipline as the conductor's MAX table).

Everything else — triage classes, fold-in mechanics, record-keeping, and the
owner's quality bar — is the sister runbook, unchanged.
