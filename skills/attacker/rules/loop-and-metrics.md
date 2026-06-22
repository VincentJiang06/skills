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

## (a) Attacker is the loop's STOP-CONDITION (`feedback_signal.check`)

A loop runs `A → B → C → attack`. The attack round is the loop's branch point and
emits a machine-readable **`round_verdict`** (+ `stop_reason`) the loop owner branches
on — it is the loop's `feedback_signal.check`:

```
A → B → C → attack ─┬─ round_verdict:clean         → STOP (done / converged)
                    ├─ round_verdict:broke         → fix round → re-attack
                    └─ round_verdict:inconclusive  → loop-owner-decides (qualified stop)
```

- **`clean`** — no proven break AND the plan ran to completion (`stop_reason:plan_complete`).
  This is the loop's *done/converged* signal: **STOP**.
- **`broke`** — ≥1 proven break (`round_verdict:broke` ⟺ ≥1 confirmed record). Route to a
  **fix round**, then **re-attack** (round N+2).
- **`inconclusive`** — no proven break BUT a budget cap was hit (`stop_reason:budget_exhausted`).
  Nothing was found, but the surface was NOT exhausted — the loop owner decides whether to
  stop (qualified) or grant more budget. It is NOT a clean/converged pass.

## (b) Exhaust-budget stop mode (report all breaks, not first-break)

A round runs in **exhaust-budget mode**: it does NOT stop on the first proven break.
One round reports **ALL** proven breaks it found within the budget, so the next fix round
is a **batch fix** (fix the whole set, then re-attack), not a one-bug-per-round ping-pong.
The round terminates only when the plan completes OR a hard budget cap is reached.

## (c) The carry-forward attack ledger (the token-waste fix)

A round>1 **INHERITS its own prior attack ledger** so it does not re-derive the whole
attack plan from scratch each round (that wastes tokens). What IS inherited across rounds
(the attacker's OWN ledger only):

- the **surface map** (what was reconned),
- the **attack tree** (what was planned, with cost/likelihood/prereq tags),
- the **attempted-breaks** (what was tried, and which were low-yield / dead ends),
- the **confirmed + fixed records**, indexed by `regression_key` (for regression).

DESIGN reuses this: skip/deprioritize already-tried low-yield attacks, and spend fresh
budget on **new surface + unconfirmed leads**. The round records which prior round it built
on as **`carried_from_round`** (null only at round 1; `1 <= carried_from_round < round`
otherwise — the validator enforces this carry-forward discipline so a later round can't
cold-restart).

What is **NEVER** inherited (independence is preserved exactly as in round 1): the
**implementation source**, the **TDD/unit suite**, the **author's spec framing**. The
ledger is the attacker's own decorrelated memory, never a channel back to the builder's
mental model.

## (d) The dual hard budget + the honest caveat

The attack effort is **HARD-BOUNDED** by a **dual budget** (no endless attack), measured
as **attempts + token-consumption**, NOT wall-clock time:

- **`--budget N`** — the attempt cap (`attempts_used <= budget_n`, rolled up as `ASR@n`).
- **`--max-tokens T`** — the per-round token-consumption cap (`tokens_used <= max_tokens`).

The round stops at **whichever cap hits first**. A `stop_reason:budget_exhausted` MUST be
backed by a cap actually reached (`attempts_used >= budget_n` OR `tokens_used >= max_tokens`);
`stop_reason:plan_complete` means neither cap was exceeded — the validator enforces both.

**Honest caveat:** a `clean` verdict is **NOT** "proven correct." It means **"no proven
break within budget B."** A larger budget, a different surface, or a sharper oracle could
still find a break. The loop owner reads `clean` as *converged within the declared budget*,
not as a correctness proof.

## Metrics

Round success = every confirmed record is reproducible (validator green) AND
independently re-confirmed (fresh checker) AND the non-vacuity self-test is green.
`ASR@n` = attempts_used/budget_n; unique-finding count via `regression_key` dedup;
severity histogram; false-negative = missed planted bug (must be 0); false-positive
= fabricated finding on the clean control (must be 0); cost_per_success bounded by
the **dual budget** (`--budget` attempts + `--max-tokens` tokens).

The round roll-up additionally carries the loop-branch fields (validated by
`scripts/validate_attack_records.mjs`): `round_verdict` (broke|clean|inconclusive),
`stop_reason` (plan_complete|budget_exhausted), `max_tokens`/`tokens_used` (the token
cap), and `carried_from_round` (the inherited ledger's round). The validator enforces
their mutual consistency — `broke ⟺ ≥1 confirmed record`, `clean ⟹ plan_complete`,
`inconclusive ⟹ budget_exhausted`, `tokens_used <= max_tokens`, a `budget_exhausted`
claim backed by a cap actually reached, and the `carried_from_round` carry-forward
discipline.
