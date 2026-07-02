# Writing and running eval cases (the test core)

Testing a skill means running an agent **with the skill** on realistic prompts
and checking its trajectory and output — not reading the skill and imagining it
works. This is skill-principle's `pillar.testing` / `procedure.trajectory_eval`.
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

**Confirm red** (a case green before implementation tests nothing — fix the
case):
- **Script skill** — follow `rules/verification-harness.md`: the stub must
  import cleanly, return a wrong sentinel, and produce real `FAIL <case>`
  lines in `.skill-engineer/red/red.log`. "Red by construction", missing-file
  crashes, and a bare `EXIT:1` do not count.
- **LLM-behavioral skill** — run the case prompt **without the skill** in a
  fresh context and save the failing transcript/summary to
  `.skill-engineer/red/baseline.md`: what the agent did, which acceptance
  criteria it missed. This baseline is the red artifact (and later the
  with/without evidence that the skill adds value).

## Run the cases (Step 5)

If the skill's mechanism is a **deterministic script** (e.g. a redaction CLI),
run the script directly over fixtures and assert on its output — that IS the eval;
don't spawn an LLM subagent for deterministic logic. (For such a skill, a
"should not trigger on X" requirement is a *description-level* case: put it in
the trigger_eval cases file per `rules/trigger-eval.md`, not an LLM run of the
script.) For LLM-behavioral skills, run the skill in a fresh context and
capture the trajectory.

With subagents (preferred for behavioral skills): spawn one agent per case, in parallel —

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
- Record per-case `passed` + one line of `evidence` (`text`/`passed`/`evidence`
  is also the official skill-creator grading shape — keeping these names makes
  results portable).
- **LLM-judge hardening** (when a model grades open-ended output): force the
  judge to reason before the verdict (chain-of-thought is the single safest
  strategy), and **normalize/strip markdown before comparing** — judges prefer
  markdown-formatted answers 73–97% of the time even when content is identical,
  so an unformatted-vs-formatted comparison measures style, not quality. Don't
  rely on answer-order swapping for adversarial outputs; it can discard correct
  verdicts.
- **Baseline delta (full altitude)**: for behavioral skills, also run 1–2 key
  cases *without* the skill and record the with/without difference in the
  report's metrics note — a skill whose output matches baseline isn't earning
  its context cost (this is skill-creator's benchmark pattern).

Without subagents (e.g. Claude.ai): read the skill, follow it yourself on the
prompt one case at a time, and grade. Less independent, but a real sanity check.

## Regression

Keep failures, adjacent false-trigger cases, and any production issue as a
regression set. **Seed it on the first build** with the negative/adjacent cases
(they're exactly what you rerun); add real failures as they occur. Rerun the
whole set after every change (Step 4↔5 loop and after the Step 6 refactor) so a
fix for one case doesn't silently break another (`metric.regression_escape_rate`).

## Altitude

- `lite`: 2–3 cases (positive + adjacent), grade acceptance + a key trajectory
  assertion. Inline running is acceptable only for pure LLM-behavioral skills
  with no deterministic script; note that lost independence in
  `verification.evidence`, grade strictly against the written `acceptance` /
  `trajectory_assertions`, and keep at least one negative/adjacent case.
- `full`: positive/negative/boundary per major behavior, independent subagent
  runs, full trajectory checks, a maintained regression set, and a mutation
  spot-check (break the trigger → a case must catch it).

## The gate

Step 5 is a gate, not a formality. Required cases (per altitude + the spec's
required pillars) must actually run and pass before Step 6. Capture real evidence
(pass/fail counts, command output) for the build report's `verification` block.
For deterministic/script skills, set `harness_required: true` and include the
rerunnable harness fields required by `rules/verification-harness.md`; for pure
LLM-behavioral skills with no scripts, set `harness_required: false` and say why
in `verification.evidence`. A skill reported "done" without run evals is a
draft, not a build — and `scripts/validate_report.mjs` (Step 6) will refuse the
report, for the same reasons the conductor's Stage E gate would.
