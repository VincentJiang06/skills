---
name: vince-skill-engineer
description: >
  Build and test a Claude Code skill from a vince-skill-guidance handoff spec.
  Use when the user wants to implement/develop/wire a skill, make eval cases
  pass, turn a handoff-spec into files, or points at
  `.skill-guidance/handoff-spec.json`. Stage 2 of the vince-skill pipeline. Do
  NOT use for planning/auditing (vince-skill-guidance), compression
  (vince-skill-zipper), or blank scaffolding without a spec.
---

# vince-skill-engineer

Turn a **guidance handoff-spec** into a **built, tested skill**, then hand it to
`vince-skill-zipper`. This is the implementation + test stage: it writes files
and runs evals. It is **test-driven** — failing eval cases come before
implementation — and it **gates on real verification**: never report success
until the eval cases have actually been run and passed (or a blocker is
recorded). See develop-principle's `principle.executable_acceptance`.

It runs **autonomously** (no human-in-the-loop confirmation), but autonomy is
not a license to skip verification. The deliverable is a built skill plus a
`build-report.json` that `vince-skill-zipper` (or the user) consumes.

## Backing knowledge base

Ground the build in the local **develop-principle** KB (the `develop-principle/`
sibling library; default `../develop-principle`). Do not invent the TDD/testing
method — pull it:

```bash
node <kb>/tools/query_kb.mjs "TDD red green refactor eval case 契约 变异" --broad
node <kb>/tools/query_kb.mjs "skill 测试 轨迹 回归 金字塔" --broad
```

Reuse its templates instead of duplicating them: `templates/eval_case.template.json`,
`templates/tdd_plan.template.md`, `templates/trajectory_assertion.template.json`,
and the matrices in `testing/` (`test_strategy_matrix.json`, `tdd_workflow.json`).

## Steps

### Step 1 — Ingest the plan

Load `rules/ingest-spec.md`. Locate the input: a
`<target>/.skill-guidance/handoff-spec.json` and the target skill dir. **If there
is no spec, stop and run `vince-skill-guidance` first** — this stage builds *from
a plan*, it does not invent one. Read `recommended_design`, `prioritized_actions`
(P0 first), `altitude`, and `handoff.blocking_unknowns`. Resolve blockers or
record them; do not silently guess past a P0 unknown.

Scaffold the skeleton (idempotent, never overwrites without `--force`):

```bash
node scripts/scaffold_skill.mjs <target-dir> --spec <target>/.skill-guidance/handoff-spec.json
```

### Step 2 — Plan red-green-refactor

Load `rules/red-green-refactor.md` and pull develop-principle's `tdd_plan` /
`test_strategy_matrix`. Turn the spec's `prioritized_actions` into an ordered
TDD backlog: each action becomes (failing check → minimal implementation →
refactor). Sequence P0 → P1 → P2, and never more rigor than the `altitude` asks.
Keep the ordered backlog as a short working list (in-context is fine; at `full`
altitude persist it to `<target>/.skill-engineer/tdd-plan.md`). This ordering is
the spine the rest of the build follows — quick, not ceremony.

### Step 3 — Red: write failing eval cases first

Load `rules/run-evals.md` (the **Write the cases** section) **and
`rules/verification-harness.md`** (the hard bar — it supersedes softer wording
here). From `intent` + `recommended_design.tests`, write eval cases under
`<target>/evals/` (cover the spec's boundary/adversarial inputs, not just happy
paths; no tautological "grep SKILL.md" cases). For a script skill, also write the
re-runnable harness `evals/run_all.mjs`. Confirm they **fail** against the current
stub by **actually running them and saving the failing output** to
`<target>/.skill-engineer/red/red.log` — "red by construction" without that
artifact does not count as tests-first.

### Step 4 — Green: implement the design units

Load `rules/build-design-units.md`. Implement the 8 units from
`recommended_design` into real files — trigger→frontmatter, protocol→Steps,
resources→`references/`, controls, tests→`evals/`, etc. — minimally, to make the
red cases pass. Keep SKILL.md a thin orchestrator; push detail into `rules/`
(progressive disclosure, per `low_context_kb`).

### Step 5 — Verify (the gate)

Load `rules/run-evals.md` (the **Run the cases** section) and obey
`rules/verification-harness.md`. For a **script skill**, run the committed
`evals/run_all.mjs` harness and capture its real stdout + exit code into the
build-report's `verification.command_output` (with `harness_ran: true`,
`harness_path`); pass counts come from that run, never a mental simulation. For a
pure LLM-behavioral lite skill, run the cases and grade against the written
acceptance. Loop Step 4 ↔ Step 5 until the cases pass or a blocker is recorded.
**Do not proceed with unrun or failing required cases** — and a script skill with
no re-runnable harness is treated as unverified.

### Step 6 — Refactor and report

Tidy without breaking green (re-run after refactor). Then load
`rules/build-report.md` and `assets/build-report.schema.json` and write
`<target>/.skill-engineer/build-report.json`: what was built, eval results +
evidence, which `prioritized_actions` are done/deferred/blocked, and
`handoff.next_skill = "vince-skill-zipper"`. Print a 3-line summary; the report
file is the real output.

## Modules

| File | When to load |
|------|--------------|
| `rules/ingest-spec.md` | Step 1 — read the handoff-spec, handle a missing spec, turn actions into a backlog. |
| `rules/red-green-refactor.md` | Step 2 — the TDD loop for skills and how to pull develop-principle's tdd/test assets. |
| `rules/run-evals.md` | Steps 3 & 5 — write eval cases, run them with-skill, grade, check trajectories, regression. |
| `rules/verification-harness.md` | Steps 3 & 5 — the hard bar: a committed re-runnable harness + captured output for script skills, a real red artifact, no tautological tests, boundary coverage. Supersedes softer wording. |
| `rules/build-design-units.md` | Step 4 — implement each of the 8 design units into real files; progressive-disclosure conventions. |
| `rules/build-report.md` | Step 6 — the build-report fields and the handoff to vince-skill-zipper. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/scaffold_skill.mjs` | `node scripts/scaffold_skill.mjs <target-dir> [--spec <spec.json>] [--altitude lite\|full] [--force]` — create the dir skeleton + a seeded SKILL.md stub. Idempotent; never overwrites without `--force`. |

## Assets

| File | Usage |
|------|-------|
| `assets/build-report.schema.json` | The JSON contract for the report `vince-skill-zipper` (or the user) consumes. The report you emit must conform. |
