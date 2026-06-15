# Loop Run Report / 循环运行报告

A copy-paste auditable summary a loop should emit when it stops. Derived from `procedure.escalation_triggers` and `procedure.loop_quality_rubric`. Keep it factual: report failures with output, skipped steps as skipped.

```
LOOP RUN REPORT
Goal:           [the DoD goal]
Outcome:        success | failure-stop | escalated
Root cause:     [for fixes/debug: the confirmed root cause, not a guess]
Files changed:  [list]
Checks run:     [cmd → pass/fail, with output snippet on fail]
Iterations:     [count]  (metric.iterations_to_acceptance)
Cost:           [tokens / tool calls / time]  (metric.cost_per_resolution)
Human steps:    [where a human intervened, if any]  (metric.human_intervention_rate)
Checker verdict:[what the independent reviewer flagged; what was accepted/deferred]
Residual risk:  [what is NOT covered; known gaps; follow-ups]
Reward-hack self-check: [confirm no tests deleted/weakened; diff inspected, not just green]
```

## Notes
- Fill **Outcome** honestly — an escalated or failed run is a successful *loop*, just not a successful *task*.
- The **Reward-hack self-check** line operationalizes `anti_pattern.reward_hacking`: a run that passed by weakening a test is a failed run.
- Feed the numbers into `metrics/metric_catalog.json` so the loop's quality is tracked over time, not just per run.
