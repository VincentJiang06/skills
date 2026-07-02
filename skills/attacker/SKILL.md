---
name: attacker
version: 0.4.0
description: >-
  Attack a product's observable behavior, or red-team an idea/argument/plan; a FRESH,
  TDD-independent subagent records ONLY proven, reproducible breakages. Use-when:
  "attack/break this feature", "red-team this product / idea", "$attacker". Do-NOT:
  write tests or fix bugs — it only finds breakages, never edits the target.
---

# attacker

Attack a product's observable behavior with everything you've got, then record
the attacks that **succeeded** — proven, reproducible breakages — so a later
round can fix them. The deliverable is a set of **attack records** (a handoff
document set), each a runnable repro plus `observed != expected` — never a fix,
never edits to the target, never a passing test suite.

The defect this skill targets is the **false-positive test suite**: a green TDD
suite on top of a broken product. The cause is **correlated error** — a test, a
mock, an "expected" fixture, even the author's framing, produced from the *same
mental model* as the impl, inherits that model's misread. The only fix is
**engineered independence** (Knight–Leveson: the specification is the dominant
common-mode channel). So the attacker runs from a context that never saw the
impl, the tests, or the author's framing. **Independence is the entire value
proposition — every other choice is downstream of protecting it.**

## Preflight (CONTEXT-gate → scope → mode → MODE-altitude → budget)

Gate order (**load `references/context-intake.md` for each step's full detail, the elicitation
prompts, and the self-research independence split**):

0. **CONTEXT — a HARD GATE (FIRST).** MUST NOT attack until (a) scope clear AND (b) context
   sufficient. If thin: **ASK**, then **SELF-RESEARCH** (independence-safe). Record in `summary.context_sources` (≥1).
1. **Scope contract.** `--scope` → `summary.in_scope` (≥1; every record tags `attack_scope` ∈ it);
   `--out-of-scope` → top-level `out_of_scope[]` (kept, NOT counted). Resolve `--target` + `--round N`.
2. **Mode — `target.type` (`product` | `idea`).** Same loop/verdict/budget; only oracle + proof shape differ.
2b. **Attack MODE — `summary.attack_mode` (`debug` | `structural` | `both`).** Orthogonal altitude;
   `structural` DROPS withhold+seam, REQUIRES `critique_basis` + a structural oracle; `both` = structural FIRST.
2c. **Scope stability + depth.** `summary.scope_change` (incremental only) + `summary.depth` (int ≥ 1).
3. **Dual hard budget** (MANDATORY): `--budget N` (**≈ 12**) + `--max-tokens T` (**≈ 60k**) + soft
   `--max-context` (**≈ 30k**). Stop at whichever hits first, **exhaust-budget mode** (ALL breaks); MAY early-exit.
4. Locate/create the **target project's** `.loop/` for records + the battery ledger (NOT under the skill dir).
5. **Round 1 → cold start**; **round>1 → CARRY-FORWARD** the OWN prior ledger (NEW surface only). Never
   loaded (product): impl / TDD suite / author framing.

## Round verdict (the loop's STOP-CONDITION)

Each round emits a machine-readable **`round_verdict`** (`broke` | `clean` |
`inconclusive`) + **`stop_reason`** (`plan_complete` | `budget_exhausted`) on the
summary the LOOP branches on:
- **`clean`** (no proven break, plan ran to completion) → the loop's **done/converged**
  signal → **STOP**. Honest caveat: `clean` ≠ proven correct; it is "no proven break
  within budget B."
- **`broke`** (≥1 proven break) → route to a **fix round**, then **re-attack**.
- **`inconclusive`** (a budget cap hit, nothing found — NOT proven correct) → a
  **qualified stop the loop owner decides on**.

## The attack round — spawn a FRESH subagent (load references/attack-process.md)

Spawn the attack as a **fresh, isolated subagent** with a curated bundle of ONLY (a) the
requirement / intended behavior and (b) the target's observable behavior (invoke + observe +
baseline). **Do NOT pass** impl source, the TDD/unit suite, or author framing — withholding is a
property of what your spawn prompt includes, audited per record by
`independence_attestation.withheld` (validator REJECTS a confirmed record missing
`implementation_source`/`tdd_suite`). Same-model author ⇒ separate fresh checker (generator ≠ judge).

Inside the subagent run the five phases — **load `references/attack-process.md` for the full
per-phase procedure**:

1. **READ** — map the surface from observable behavior; derive `expected` independently; measure a baseline.
2. **DESIGN** — reuse the inherited ledger first (round>1); derive attacks (spec-inversion + STRIDE +
   `assets/payload-library.json`); attack cheapest-highest-impact first.
3. **EXECUTE** — falsifiable experiments; blast-radius control; real seams (no mocks); structural-FIRST in `both`.
4. **PROVE** — name the **mode-appropriate** oracle (`references/oracle-menu.md`); confirm
   `observed != expected`; shrink to a 1-minimal repro; re-run it (`repro.replayed_ok`).
5. **RECORD** — proven → `records[]`; unprovable → `needs_judgment[]`; out-of-scope → `out_of_scope[]`.
   Tag `attack_scope` + `attack_kind`; roll up `ASR@n` + verdict + the v0.3.1 fields + the per-kind/mode fields.

## Regression → context-fill → DEEPEN (start of each new round)

Round > 1 follows a fixed sequence (full form in `references/attack-process.md`): **Regression
FIRST** (re-run prior repros by `regression_key`: fixed vs still-failing, the latter blocks) →
**FILL context** from that resolution (record in `summary.context_sources`) → **DEEPEN** (increment
`summary.depth`, attack within scope at greater depth / incremental new surface; NEVER restart from
scratch). Validator only checks `depth ≥ 1` + a valid `scope_change` enum.

## Verify (the round's gate — feedback_signal.check)

```bash
node scripts/validate_attack_records.mjs <project>/.loop/attack-records.jsonl
node evals/run_all.mjs        # validator unit cases + the non-vacuity self-test
```
The round is done only when the validator is green **AND** the non-vacuity
self-test passes **AND** a fresh-context checker re-reads the records cold,
re-runs the repros, and signs `assets/fresh-reader-checklist.md` (maker ≠ checker).

## Report

The attack-records document set + roll-up (template `assets/attack-record.template.md`)
become the next round's fix list. **Attacker NEVER edits the target.**

## Controls (externalized — not prose "be careful")

Each control is enforced by a script, not a "be careful"; **load `rules/loop-and-metrics.md` for
the full enforcement detail of each**:

- **Never edit the target** — handoff document set only (detect-vs-remediate boundary).
- **PROVE-OR-FLAG / REPRODUCIBLE-OR-DROP** — `scripts/validate_attack_records.mjs` (the §5 gate),
  conditional on `attack_kind` then `target.type`; unprovable/vague → `needs_judgment`.
- **Mandatory context + scope contract** — no attack until scope clear AND context sufficient; the
  v0.3.1 summary fields + `in_scope`/`out_of_scope` are validator-enforced.
- **Anti-vacuity** — a correctly-rejected malformed input or a contentless "I disagree" is NOT a finding.
- **Blast-radius / budget / abort** — smallest-unit scope, staged escalation, `--budget` cap, aborts.
- **Non-vacuity + hardened** — `evals/run_all.mjs` (planted-bug flagged + clean-control zero) +
  `scripts/check_battery_clean.mjs` + `scripts/check_release_gate.mjs`.

## Loop integration + metrics

attacker is a **sub-loop NODE**, not the loop owner: loop-constructor emits the `.loop/` runbook,
maker–checker is mandatory, and attacker is the loop's `feedback_signal.check` / STOP-CONDITION (the
verdict semantics above). It is the concrete **`roles.evaluator`** of that loop (LOOPS.md §II,
bundled as loop-constructor's `references/loops-model.md`): the fresh, adversarial context told the
artifact is broken and to prove it — the separation is *why* it grades what the builder can't. Rounds alternate attacker → fixer → fresh attacker, carrying the prior
ledger forward. **Load `rules/loop-and-metrics.md`** for the round-alternation diagram, the dual
budget, the carry-forward ledger, the metric definitions (`ASR@n`, severity histogram, the
must-be-zero false-negative / false-positive invariants), and **why the independent battery matters
*more* on Claude 4.8** (honesty ↑ ≠ self-found bugs; injection-robustness ↓).

## Modules

| File | When to load |
|------|--------------|
| `references/context-intake.md` | CONTEXT (Preflight step 0, a HARD GATE) — the context checklist (target+type, claim/thesis, constraints, success criteria, what-counts-as-a-break, in/out-of-scope, prior rounds), the mandatory-context gate + the SELF-RESEARCH-to-fill discipline (debug-vs-structural independence split), WHY more context = sharper attacks, and the elicitation prompts when context is thin. |
| `rules/loop-and-metrics.md` | Running attacker inside a loop-constructor loop (round alternation, maker–checker, regression by `regression_key`), or computing the round roll-up / metrics. |
| `references/attack-process.md` | The round — full READ→DESIGN→EXECUTE→PROVE→RECORD procedure + the fresh-context mechanism + target-adapter contract. |
| `references/oracle-menu.md` | PROVE — the kind/mode-appropriate ranked oracle taxonomy: product (implicit→differential→metamorphic→control→specified), idea (counterexample / contradiction / unmet_assumption / scope_violation / infeasibility / missing_case), and the STRUCTURAL oracle set (§S — the idea oracles that fit design critique + specified). |
| `assets/payload-library.json` | DESIGN — the §3 adversarial taxonomy as data (AFL values, unicode/CJK, business-logic catalog). |
| `assets/fresh-reader-checklist.md` | Verify — the REQUIRED manual semantic gate (maker ≠ checker). |
| `assets/attack-record.template.md` | Report — turn records into the next round's fix list. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/validate_attack_records.mjs` | `node … <records.json\|.jsonl>` — the deterministic §5 gate; **exports `validate()`** (imported by the harness). |
| `scripts/check_battery_clean.mjs` | `node … <ledger.json> [--need N]` — N-consecutive-clean battery ledger (anti copy-paste, asymptotic). |
| `scripts/check_release_gate.mjs` | `node … [--battery <ledger>]` — binds "industrial" to green run_all + non-vacuity (+ hardened). |
| `evals/run_all.mjs` | `node …` — harness; imports `validate()`, runs one case per adversarial-checklist entry + the non-vacuity self-test. |

## Schemas

| File | Usage |
|------|-------|
| `schemas/attack-record.schema.json` | draft-07 contract; prove-or-flag split `records[]` (proven) vs `needs_judgment[]` + roll-up. |
