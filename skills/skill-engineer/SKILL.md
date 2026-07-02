---
name: skill-engineer
description: >
  BUILDS and TESTS a skill from a skill-guidance handoff spec (stage 2). Use
  when asked to implement/develop/wire a skill, make eval cases pass, or
  pointed at `.skill-guidance/handoff-spec.json`: "$skill-engineer". It
  WRITES+TESTS; not plan/audit (guidance), compress (zipper), or loop (conductor).
license: MIT
metadata:
  version: "2.1.0"
---

# skill-engineer

Turn a **guidance handoff-spec** into a **built, tested skill**, then hand it
to `skill-zipper`. **Test-driven**: failing eval cases come before
implementation, and success is reported only after the cases actually ran
green (or a blocker is recorded honestly) — self-reported pass counts are how
hollow builds ship. Autonomous, but autonomy never skips verification.
Deliverable: the built skill + `.skill-engineer/build-report.json`.

## Backing knowledge base

Ground the TDD/testing method in the shared **skill-principle** KB embedded in
sibling `skill-guidance` (default `../skill-guidance/skill-principle`) — do not
invent the method. Load `rules/kb-grounding.md` for queries and the
templates/matrices to reuse. Installed sibling names may carry a prefix:
resolve a sibling as the directory named `<name>` or ending in `-<name>`
(e.g. `vince-skill-guidance`).

## Steps

### Step 1 — Ingest the plan

Load `rules/ingest-spec.md`. Input: the target skill dir +
`<target>/.skill-guidance/handoff-spec.json`. **No spec → stop and run
`skill-guidance` first** — building without a plan is how skills drift (one
exception: the user explicitly hands you an equivalent design). Read
`recommended_design`, `prioritized_actions` (P0 first), `altitude`, and
`handoff.blocking_unknowns`; resolve or record blockers per the
gating-vs-touching rule — never silently guess past a P0 unknown.

Scaffold the skeleton (idempotent, never overwrites without `--force`):

```bash
node scripts/scaffold_skill.mjs <target-dir> --spec <target>/.skill-guidance/handoff-spec.json
```

### Step 2 — Plan red-green-refactor

Load `rules/red-green-refactor.md`. Turn the spec's actions into an ordered
TDD backlog (P0 → P1 → P2), one failing-check → minimal-implementation →
refactor cycle each. Never more rigor than the `altitude` asks.

### Step 3 — Red: write failing eval cases first

Load `rules/run-evals.md` (writing cases) and `rules/verification-harness.md`
(the hard bar). Write cases under `<target>/evals/` covering the spec's
boundary/adversarial inputs — no happy-path-only suites, no tautological
"grep SKILL.md" cases. Prove red by **running**:

- **script skill** — `evals/run_all.mjs` harness importing the `scripts/`
  mechanism, run against an importable wrong-sentinel stub; save the real
  `FAIL <case>` output to `.skill-engineer/red/red.log`.
- **LLM-behavioral skill** — run the prompt **without the skill** and save the
  failing baseline to `.skill-engineer/red/baseline.md` — the failure the
  skill must fix.

### Step 4 — Green: implement the design units

Load `rules/build-design-units.md`. Implement the 8 units from
`recommended_design` into real files, minimally, to make red pass. Thin
SKILL.md orchestrator; detail into `rules/` (progressive disclosure).

### Step 5 — Verify (the gate)

Load `rules/run-evals.md` (running + grading); the bar is
`rules/verification-harness.md`. Script skills: run the committed harness,
capture real stdout + exit code into `verification.command_output`.
Behavioral skills: run the cases fresh, grade against the written acceptance,
trajectory included. **At full altitude, or whenever triggering is a top
driver, also run the empirical trigger eval** (`rules/trigger-eval.md`). Loop
Step 4 ↔ 5 until green or a blocker is recorded — never proceed with unrun or
failing required cases.

### Step 6 — Refactor, report, self-gate

Tidy without breaking green (re-run after refactor). Load
`rules/build-report.md`; write `<target>/.skill-engineer/build-report.json`,
then gate your own report — exit 0 required:

```bash
node scripts/validate_report.mjs <target-dir>
```

This is the **same executable gate the conductor re-runs at Stage E** (schema,
all-green totals, every spec P0 done, checklist coverage, harness re-run,
genuine red log) — a report that would fail downstream never leaves this
stage. Print a 3-line summary; the report file is the real output.

## Modules

| File | When to load |
|------|--------------|
| `rules/kb-grounding.md` | Before Step 1 — KB queries + templates to reuse. |
| `rules/ingest-spec.md` | Step 1 — read the spec; gating-vs-touching for unknowns. |
| `rules/red-green-refactor.md` | Step 2 — the TDD loop + techniques by altitude. |
| `rules/run-evals.md` | Steps 3 & 5 — write, run, grade eval cases; regression. |
| `rules/verification-harness.md` | Steps 3 & 5 — the hard bar: harness, red artifact, coverage, security lint. |
| `rules/build-design-units.md` | Step 4 — the 8 units; naming/portability rules for built skills. |
| `rules/trigger-eval.md` | Step 5 — empirical trigger precision/recall; holdout tuning loop. |
| `rules/eval-exchange.md` | ONLY when the user names an eval-exchange address for a parallel agent build. |
| `rules/build-report.md` | Step 6 — report fields + the handoff to skill-zipper. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/scaffold_skill.mjs` | dir skeleton + seeded SKILL.md stub from the spec; idempotent, `--force` to overwrite. |
| `scripts/trigger_eval.mjs` | empirical trigger precision/recall; `--judge cli` real / `mock` self-test, `--runs 3`, holdout-aware. |
| `scripts/validate_report.mjs` | the executable E gate (schema, P0/coverage joins, harness re-run, red log); `--selftest`. Conductor reuses it. |

## Assets

`assets/build-report.schema.json` · `assets/trigger-eval.schema.json` — the
report + trigger-eval contracts.
