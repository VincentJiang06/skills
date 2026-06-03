# Writing and running eval cases (the test core)

Testing a skill means running an agent **with the skill** on realistic prompts
and checking its trajectory and output — not reading the skill and imagining it
works. This is develop-principle's `pillar.testing` / `procedure.trajectory_eval`.
Pull the templates:

```bash
cat <kb>/templates/eval_case.template.json
cat <kb>/templates/trajectory_assertion.template.json
node <kb>/tools/query_kb.mjs "轨迹 评估 工具调用 回归 金字塔" --broad
```

## Write the cases (Step 3, RED)

Derive cases from the spec's `intent` and `recommended_design.tests`. Each case:

- **prompt** — a realistic user task the skill should handle (concrete: file
  paths, names, casual phrasing — like a real user, not "do the thing").
- **acceptance** — what a correct result looks like (objectively checkable).
- **trajectory_assertions** — what should happen *along the way*: the right tool
  called with the right args, the right files loaded, dangerous actions gated.
- **files** — any input fixtures.

Cover three kinds, at minimum: a **positive** (should trigger + succeed), a
**negative / adjacent** (should NOT trigger, or should defer to a sibling skill),
and a **boundary** (the tricky edge from the scorecard's gaps). Save under
`<target>/evals/`.

**Confirm red:** run each case against the current stub/partial skill and verify
it fails (or the behavior is absent). A case green before implementation is not
testing anything — fix the case. At `lite` with inline running, "red" can be a
visual confirmation that the scaffolded stub holds only placeholder content (no
domain logic yet) — record that as red; you don't need to theatrically run an
empty skill.

## Run the cases (Step 5)

For each case, run the skill in a fresh context and capture the trajectory.
With subagents (preferred): spawn one agent per case, in parallel —

```
Task: <eval prompt>
Skill to use: <target-skill-path>/SKILL.md (read it and follow it)
Save the final output to: <workspace>/eval-<id>/output/
Report: the tool calls you made (names + key args), which skill files you loaded,
and the final result.
```

Then **grade**:
- Check `acceptance` against the saved output — programmatically where possible
  (a script beats eyeballing and is reusable across iterations).
- Check each `trajectory_assertion` against the reported tool calls / loaded
  files. Final-text-only grading misses the skill silently not triggering or
  calling the wrong tool — that is exactly what these catch. For a pure
  text-transform skill with no tool calls or side effects, "trajectory" means the
  **protocol steps were followed** (e.g. scope check → type selection → subject
  formation), verified from the agent's reasoning — not tool-call logs.
- Record per-case `passed` + one line of `evidence`.

Without subagents (e.g. Claude.ai): read the skill, follow it yourself on the
prompt one case at a time, and grade. Less independent, but a real sanity check.

## Regression

Keep failures, adjacent false-trigger cases, and any production issue as a
regression set. Rerun the whole set after every change (Step 4↔5 loop and after
the Step 6 refactor) so a fix for one case doesn't silently break another
(`metric.regression_escape_rate`).

## Altitude

- `lite`: 2–3 cases (positive + adjacent), grade acceptance + a key trajectory
  assertion; inline running is acceptable — but you lose independence (the builder
  is also the grader), so note that in the report's `verification.evidence`.
- `full`: positive/negative/boundary per major behavior, independent subagent
  runs, full trajectory checks, a maintained regression set, and a mutation
  spot-check (break the trigger → a case must catch it).

## The gate

Step 5 is a gate, not a formality. Required cases (per altitude + the spec's
required pillars) must actually run and pass before Step 6. Capture real evidence
(pass/fail counts, command output) for the build report's `verification` block.
A skill reported "done" without run evals is a draft, not a build.
