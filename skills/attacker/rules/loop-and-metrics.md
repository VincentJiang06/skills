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

**The verdict semantics carry over to IDEA mode unchanged** (same loop / round-verdict /
budget / carry-forward — only the oracle + proof shape differ): idea-mode **`broke`** = a
proven flaw in the idea was found (≥1 confirmed idea record); **`clean`** = the idea could not
be broken within budget (robust-so-far, **NOT** "proven true" — exactly the honest caveat
below); **`inconclusive`** = a budget cap hit with no flaw found.

## (a2) Attacker IS the loop's `roles.evaluator` (LOOPS.md §II, bundled as loop-constructor's `references/loops-model.md`)

loop-constructor's staged design carries three separated roles — planner, generator,
evaluator — and the **evaluator** is defined as a *fresh, adversarial* context
(`separate_context: true`, `adversarial: true`) told the artifact is broken and to
prove it. **attacker is the concrete implementation of that evaluator role.** The
separation is enforced per record via `independence_attestation`, in the **mode's own
form**: debug/product attacks run behind the withhold firewall — a subagent that never
saw the impl / TDD suite / author framing, deriving `expected` independently
(`independence_attestation.withheld`); **structural** critique necessarily SEES the
structure (you must see it to critique it — the firewall is deliberately dropped
there), so its independence is `derived_independently: true` + `critique_basis` (own
reading against an external principle/goal, the maker's framing never adopted as
settled). The constant across modes: **the verdict never comes from the maker's own
context.** So when a loop-constructor runbook names `roles.evaluator`, the attack
round IS that role: the two skills are one mechanism — the loop *declares* the
separation, attacker *enforces* it. (A generator grading its own work is the
sycophancy §II warns about; attacker is the structural fix.)

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

### The round>1 SEQUENCE: regression-first → context-fill → DEEPEN (v0.3.1)

This is the SAME carry-forward ledger, now with an explicit ordered sequence each round>1 follows:

1. **Regression FIRST** — re-run prior records' repros by `regression_key` (fixed vs still-broken).
2. **Use that resolution to FILL context** — what's fixed / still-broken is the freshest context
   for THIS round; record it in **`summary.context_sources`**.
3. **Then go DEEPER** — increment **`summary.depth`** (int ≥1) and attack within scope at greater
   depth / incremental new surface. **NEVER restart from scratch.**

**Scope stability** is recorded in **`summary.scope_change`** (`initial`|`stable`|`expanded`|
`narrowed`): each round stays stable OR expands **incrementally** — never a wild jump. The
"is the expansion really incremental?" judgment is protocol/fresh-reader; the validator only checks
the `scope_change` enum is valid and `depth ≥ 1` (monotonic depth across rounds is a discipline).

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

## (e) Why the independent battery matters MORE on Claude 4.8 (not less)

4.8's system card (Anthropic, 2026-05-28) reports honesty **up** — the model self-reports
its own defects far more readily than prior generations (fails to flag an important issue
in its own code ~3.7% of the time, ≈4× better than 4.7; uncritically-reported flawed
results ≈0, a first). The tempting inference is "a model this honest needs less external
adversarial checking." That inference is wrong, and both reasons make the independent
battery *more* load-bearing, not less:

1. **Honesty ≠ bug-finding.** Self-reporting a flaw you already see is not the same as an
   independent adversary *finding* a flaw you don't. Correlated error (Knight–Leveson) is
   invisible to the mind that produced it no matter how honest — a misread spec yields a
   matching impl AND a matching self-assessment. Only a context that never saw the impl
   breaks the correlation. This is *why* the withhold-firewall exists, not decoration.
2. **Injection-robustness regressed.** The same card reports agentic prompt-injection
   robustness regressed vs 4.7 (Gray Swan red-teaming ASR ≈9.6% vs 6.0%; deployment
   safeguards close the gap, but the raw-model surface is weaker). Injection /
   adversarial-input is precisely the class a self-grading build is blindest to — the
   surface where the model is now weaker is the surface the independent battery covers.
   Keep adversarial-input payloads first-class in DESIGN: `assets/payload-library.json`
   carries the *input* classes (metacharacters, boundary, sequence, …) but **no LLM
   prompt-injection payloads** — when the target has an LLM-integrated surface, add
   those to the attack plan explicitly.

Net: a more honest model is a better *fixer* once handed a proven break; it is not a
substitute for the fresh adversary that produces the break. The battery stays.

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

**v0.3.1 summary fields** (also required on a user-supplied summary, validated): `attack_mode`
(debug|structural|both — gates every record's `attack_kind`), `context_sources` (≥1 non-empty
strings), `scope_change` (initial|stable|expanded|narrowed), and `depth` (int ≥1). Per-record,
`attack_kind` (structural|debug) must be permitted by `attack_mode`, and a **structural** record
swaps the firewall (no withheld/seam) for `critique_basis` + `derived_independently:true` + a
structural oracle — the **debug** gates (product|idea) are unchanged and the structural relaxations
do not leak into them.

## Controls (externalized — not prose "be careful") — the full list

SKILL.md keeps a one-line pointer to each control; this is the full enforcement detail.

- **Never edit the target.** Output is a handoff document set only; a separate fix
  round repairs (detect-vs-remediate boundary).
- **PROVE-OR-FLAG / REPRODUCIBLE-OR-DROP** — enforced by
  `scripts/validate_attack_records.mjs` (the §5 gate), **conditional on `attack_kind` then
  `target.type`**: every confirmed record needs observed≠expected, a non-empty repro +
  `minimized_input`, `repro.replayed_ok:true`, a **kind-appropriate** named oracle,
  `non_tautology_check`, a non-empty **`attack_scope` ∈ `summary.in_scope`**, and an
  **`attack_kind`** the round's `summary.attack_mode` permits (debug→debug, structural→structural,
  both→either — REJECT otherwise). **debug/product** additionally requires
  `real_collaborator_at_seam:true` + `withheld ⊇ {implementation_source, tdd_suite}`;
  **debug/idea** additionally requires `claim` + `not_strawman:true` + `derived_independently:true`;
  **structural** additionally requires `critique_basis` + `derived_independently:true` + a
  **structural oracle** (and DROPS withheld/seam — a product behavioral oracle on a structural
  record is REJECTED). Unprovable / vague → `needs_judgment`.
- **Mandatory context + self-research** — the attacker MUST NOT attack until scope is clear AND
  context is sufficient; `summary.context_sources` (≥1) attests where the round's context came from
  (user-provided / self-researched). `summary.attack_mode`, `scope_change`, and `depth` are required
  on a user-supplied summary (validator-enforced).
- **Attack-scope contract** — `summary.in_scope` (≥1 descriptors) + `out_of_scope`
  declare WHICH domains are attacked; a confirmed record whose `attack_scope` is empty or
  not in `in_scope` is REJECTED; out-of-scope observations live in the top-level
  `out_of_scope[]` (kept, never counted as findings).
- **Anti-vacuity** — a correctly-rejected malformed input the contract never
  promised to handle (product), or a vague "I disagree" with no concrete counter
  (idea), is NOT a finding (validator rejects it in `records[]`).
- **Blast-radius / budget / abort** — smallest-unit scope, declared per record,
  staged escalation, `--budget` cap (rolled up as `ASR@n`), abort conditions.
- **Non-vacuity self-test** — `evals/run_all.mjs` runs a planted-bug fixture the
  validator MUST flag and a clean-control that MUST yield zero findings.
- **Hardened** — `scripts/check_battery_clean.mjs` (≥N consecutive clean rounds,
  unique context per round); `scripts/check_release_gate.mjs` binds "industrial".

## Loop integration + metrics — the SKILL.md summary prose (verbatim)

SKILL.md keeps a compact statement of attacker's role + a pointer here; this is that prose.

attacker is a **sub-loop NODE**, not the loop owner: loop-constructor designs the
loop and emits the `.loop/` runbook, **maker–checker is mandatory**, and attacker is
the loop's **`feedback_signal.check`** / **STOP-CONDITION**: `A→B→C→attack`; a `clean`
attack pass is the loop's *converged* signal (STOP), `broke` routes to a fix round then
re-attack, `inconclusive` (budget hit, nothing found) is a qualified stop the loop owner
decides. Rounds alternate attacker → fixer → fresh attacker (regression by
`regression_key`, then new surface, **carrying forward the prior attack ledger** so the
plan is never re-derived from scratch). Round success = validator green AND fresh-checker
re-confirmed AND non-vacuity self-test green. For the full round-alternation diagram, the
dual budget, the carry-forward ledger, and the metric definitions (`ASR@n`, severity
histogram, the must-be-zero false-negative / false-positive invariants), load
`rules/loop-and-metrics.md`.
