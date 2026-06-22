---
name: attacker
description: >
  Attack a product/feature's ACTUAL observable behavior; record ONLY proven,
  reproducible breakages as attack records. Runs in a FRESH subagent given only the
  requirement + observable behavior — never the impl source, TDD suite, or author
  framing (those re-inherit the builder's blind spot → green-suite/broken-product
  false positive). Each record carries an auditable independence_attestation; a
  deterministic validator + non-vacuity self-test gate it. Pairs with loop-constructor
  (attack → fix → re-attack). Use-when: "attack this feature / try to break it",
  "red-team this product", "find what the tests miss", "$attacker", or a
  loop-constructor attack-round node. Do-NOT: (1) write/maintain unit tests / "add a
  failing test first" — that is vince-tdd (attacker DISTRUSTS it, attacks the running
  product); (2) fix the bugs — a separate fix round repairs; never edits the target;
  (3) design the loop — loop-constructor owns that; (4) debug a live MP runtime/pageData
  with no break-it framing — that is mp-cli-sup.
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

## Preflight (scope-first)

1. Resolve scope: **`--target <module/feature>`**, **`--round N`**, and the
   MANDATORY **dual hard budget** (the round is HARD-BOUNDED — no endless attack):
   - **`--budget N`** — attempts cap (rolled up as `ASR@n`).
   - **`--max-tokens T`** — per-round token-consumption cap (NOT wall-clock time).
   The round stops at **whichever cap hits first**, in **exhaust-budget mode** (one
   round reports ALL proven breaks for a batch fix — NOT stop-on-first). Never
   default to unbounded crawling — a run is cheap and re-runnable per feature.
2. Locate/create the **target project's** `.loop/` for `attack-records.jsonl` +
   the battery ledger (project-local, NOT under the skill dir).
3. **Round 1 → cold start** (`carried_from_round:null`). **Round>1 → CARRY-FORWARD:**
   load this skill's OWN prior attack ledger from `<project>/.loop/` (surface map +
   attempted-attacks + confirmed/fixed records by `regression_key`) and re-derive only
   **NEW** surface — do NOT re-plan from scratch (re-deriving the whole attack plan each
   round is token waste). Record which prior round you inherited as `carried_from_round`.
   Still **NOT** loaded: impl source / TDD suite / author framing (independence preserved).

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

Spawn the attack as a **fresh, isolated subagent**. Hand it a **curated context
bundle of ONLY**: (a) the requirement / intended behavior, and (b) the target's
observable behavior (invoke + observe + baseline — the target-adapter contract).
**Do NOT pass** implementation source, the TDD/unit suite, or author framing into
its window. Enforcement (Q1): a new subagent starts with an empty context window;
the only project content it sees is what your spawn prompt includes — so the
withholding is a property of what you choose to include, audited per record by
`independence_attestation.withheld` (the validator REJECTS a confirmed record
whose `withheld` omits `implementation_source` or `tdd_suite`). If the same model
wrote the target, route verification to a **separate** fresh checker instance
(generator ≠ judge).

Inside the subagent run **READ → DESIGN → EXECUTE → PROVE → RECORD**:

1. **READ** — map the attack surface from observable behavior (not source);
   derive intended behavior independently from the requirement; measure a
   steady-state **baseline**. No baseline ⇒ `needs_instrumentation` →
   `needs_judgment`, never a guess.
2. **DESIGN** — **reuse the inherited ledger first** (round>1): skip/deprioritize
   already-tried low-yield attacks, spend fresh budget on NEW surface + unconfirmed
   leads. Then derive attacks via spec-inversion + STRIDE breadth + the business-logic
   abuse catalog from `assets/payload-library.json`; build a small attack tree tagged
   cost/likelihood/prereq; attack cheapest-highest-impact first.
3. **EXECUTE** — frame each as a falsifiable experiment scoped to the smallest
   unit; **blast-radius control** + staged escalation + abort/stop conditions;
   attack **real seams (no mocks)** where the attack lands. **Stop at whichever
   hard cap hits first — `--budget N` (attempts) OR `--max-tokens T` (tokens)** —
   exhaust-budget mode (report ALL breaks, not first-break).
4. **PROVE** — pick from the ranked **oracle menu** (`references/oracle-menu.md`);
   state which oracle fired; confirm `observed != expected` vs baseline/control;
   shrink to a 1-minimal reproducer; **re-run it** to confirm it still fails.
5. **RECORD** — one record per **proven** defect → `records[]`; unprovable →
   `needs_judgment[]`; compute `regression_key`, dedup, roll up `ASR@n` +
   unique-finding count + severity histogram **+ the round verdict** (`round_verdict`
   + `stop_reason` + `tokens_used`/`max_tokens` + `carried_from_round`).

## Regression (start of each new round)

Re-run every prior record's repro by `regression_key`: now-passing →
`status:"fixed"`; still-failing → stays `confirmed` and **blocks**. Then attack
new surface.

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

- **Never edit the target.** Output is a handoff document set only; a separate fix
  round repairs (detect-vs-remediate boundary).
- **PROVE-OR-FLAG / REPRODUCIBLE-OR-DROP** — enforced by
  `scripts/validate_attack_records.mjs` (the §5 gate): a confirmed record must
  have observed≠expected, a non-empty repro + `minimized_input`, a named oracle,
  `non_tautology_check`, `real_collaborator_at_seam:true`, `repro.replayed_ok:true`,
  and `withheld ⊇ {implementation_source, tdd_suite}`. Unprovable → `needs_judgment`.
- **Anti-vacuity** — a correctly-rejected malformed input the contract never
  promised to handle is NOT a finding (validator rejects it in `records[]`).
- **Blast-radius / budget / abort** — smallest-unit scope, declared per record,
  staged escalation, `--budget` cap (rolled up as `ASR@n`), abort conditions.
- **Non-vacuity self-test** — `evals/run_all.mjs` runs a planted-bug fixture the
  validator MUST flag and a clean-control that MUST yield zero findings.
- **Hardened** — `scripts/check_battery_clean.mjs` (≥N consecutive clean rounds,
  unique context per round); `scripts/check_release_gate.mjs` binds "industrial".

## Loop integration + metrics

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

## Modules

| File | When to load |
|------|--------------|
| `rules/loop-and-metrics.md` | Running attacker inside a loop-constructor loop (round alternation, maker–checker, regression by `regression_key`), or computing the round roll-up / metrics. |
| `references/attack-process.md` | The round — full READ→DESIGN→EXECUTE→PROVE→RECORD procedure + the fresh-context mechanism + target-adapter contract. |
| `references/oracle-menu.md` | PROVE — the ranked oracle taxonomy (implicit→differential→metamorphic→control→specified). |
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
