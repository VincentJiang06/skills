# loop-and-metrics — loop-constructor integration + round metrics

Read this when running attacker as a node inside a loop-constructor loop
(the round alternation, maker–checker, regression by `regression_key`), or
when computing the round roll-up (`ASR@n`, severity histogram, the
must-be-zero false-negative / false-positive invariants).

## Loop integration (with loop-constructor)

attacker is a **sub-loop NODE**, not the loop owner. loop-constructor designs the
loop and emits the `.loop/` runbook. **Maker–checker is mandatory** (separate
fresh checker re-runs the repros). The **verification gate is `feedback_signal.check`**
above. Alternation: round N (attacker) emits records → round N+1 (a separate fix
skill/agent — attacker never fixes) repairs → round N+2 (fresh attacker) re-runs
prior repros by `regression_key` then attacks new surface.

```
round N    attacker  → READ/DESIGN/EXECUTE/PROVE/RECORD → attack-records.jsonl (proven breaks)
round N+1  fixer     → repairs the proven breaks (separate skill/agent)
round N+2  attacker  → regression by regression_key + new surface
```

## Metrics

Round success = every confirmed record is reproducible (validator green) AND
independently re-confirmed (fresh checker) AND the non-vacuity self-test is green.
`ASR@n` = attempts_used/budget_n; unique-finding count via `regression_key` dedup;
severity histogram; false-negative = missed planted bug (must be 0); false-positive
= fabricated finding on the clean control (must be 0); cost_per_success bounded by
`--budget`.
