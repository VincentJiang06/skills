---
name: attacker
description: >
  Attack a product's ACTUAL observable behavior, OR red-team an idea/argument/plan
  (debate con-side); record ONLY proven, reproducible breakages as attack records. A
  FRESH, TDD-independent subagent attacks within a declared ATTACK SCOPE
  (--scope/--out-of-scope). Product mode sees only the requirement + observable
  behavior, never the impl/TDD suite/author framing (re-inheriting the builder's blind
  spot → false green); idea mode takes the claim but critiques it independently. Each
  record carries an auditable independence_attestation, gated by a deterministic
  validator. Pairs with loop-constructor (attack→fix→re-attack). Use-when: "attack/break
  this feature", "red-team this product", "red-team an idea/argument/plan", "$attacker".
  Do-NOT: (1) unit tests / "add a failing test first" — vince-tdd (attacker DISTRUSTS
  it, attacks the running product); (2) fix bugs — a fix round repairs, never edits the
  target; (3) design the loop — loop-constructor; (4) debug a live MP runtime with no
  break-it framing — mp-cli-sup.
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

## Preflight (CONTEXT → scope → mode → budget)

0. **CONTEXT (do this FIRST — load `references/context-intake.md`).** Take in a rich
   context bundle: the **target** (product OR idea) + its **type**, the **claim /
   requirement**, **constraints**, **success criteria**, **what counts as a real break**,
   the **in/out-of-scope** domains, and **prior rounds**. **ACTIVELY ENCOURAGE more
   context: when the provided context is thin or ambiguous, PROMPT the user for the
   missing specifics — the more precise the context, the sharper and better-scoped the
   attack. ASK rather than guess.** This is independence-safe: in **product** mode you
   still exclude impl/tests/author framing; in **idea** mode the idea + its justification
   IS the input, but the attacker derives its critique **independently**. Optionally record
   a one-line `summary.context_digest` attesting what the round's attacks were grounded in.
1. **Scope (the ATTACK-SCOPE CONTRACT).** Declare WHICH domains/layers are attacked:
   - **`--scope <descriptor>…`** → `summary.in_scope` (≥1 RICH free-form descriptors, e.g.
     "UI rendering errors", "page navigation/logic transitions") — the only domains a
     finding may target. Every confirmed record tags its **`attack_scope`** (one of these).
   - **`--out-of-scope <descriptor>…`** → `summary.out_of_scope` (may be empty) — declared
     exclusions. An observation found OUTSIDE scope goes in the **top-level `out_of_scope[]`**
     bucket: **kept, but NOT counted as a finding and NOT gated**. ("Attack the UI" → hits
     UI rendering + page navigation, NOT backend logic.)
   - Also resolve **`--target <module/feature|idea>`** and **`--round N`**.
2. **Mode — `target.type` (`product` | `idea`).** **product** = a running feature
   (the v0.1–0.2 path: product oracles + the impl/TDD firewall + a real seam). **idea** =
   an argument/design/plan (debate con-side): the proof shape is **claim + observed≠expected
   + reasoning chain + minimal scenario + `not_strawman` + an idea oracle + a critique
   derived independently** — SAME loop/round-verdict/budget/carry-forward, only the oracle +
   proof shape change. The validator gates each record by its mode (see `references/oracle-menu.md`).
3. **Dual hard budget** (MANDATORY — the round is HARD-BOUNDED, no endless attack):
   - **`--budget N`** — attempts cap (rolled up as `ASR@n`).
   - **`--max-tokens T`** — per-round token-consumption cap (NOT wall-clock time).
   The round stops at **whichever cap hits first**, in **exhaust-budget mode** (one
   round reports ALL proven breaks for a batch fix — NOT stop-on-first). Never
   default to unbounded crawling — a run is cheap and re-runnable per feature.
4. Locate/create the **target project's** `.loop/` for `attack-records.jsonl` +
   the battery ledger (project-local, NOT under the skill dir).
5. **Round 1 → cold start** (`carried_from_round:null`). **Round>1 → CARRY-FORWARD:**
   load this skill's OWN prior attack ledger from `<project>/.loop/` (surface map +
   attempted-attacks + confirmed/fixed records by `regression_key`) and re-derive only
   **NEW** surface — do NOT re-plan from scratch (re-deriving the whole attack plan each
   round is token waste). Record which prior round you inherited as `carried_from_round`.
   Still **NOT** loaded (product mode): impl source / TDD suite / author framing
   (independence preserved).

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
   **product:** attack **real seams (no mocks)** where the attack lands; **idea:** run
   the reasoning over the **minimal scenario/case**. **Stop at whichever hard cap hits
   first — `--budget N` (attempts) OR `--max-tokens T` (tokens)** — exhaust-budget mode
   (report ALL breaks, not first-break).
4. **PROVE** — pick from the **mode-appropriate** ranked **oracle menu**
   (`references/oracle-menu.md`): **product** oracles (implicit→differential→metamorphic→
   control→specified) OR **idea** oracles (counterexample / contradiction /
   unmet_assumption / scope_violation / infeasibility / missing_case). State which fired;
   confirm `observed != expected` (idea: `expected`=what the claim predicts, `observed`=the
   counter); shrink to a 1-minimal reproducer / minimal scenario; **re-run it** (a fresh
   reader re-checks the reasoning) to confirm it still fails (`repro.replayed_ok`).
5. **RECORD** — one record per **proven** defect → `records[]`; unprovable / vague →
   `needs_judgment[]`; out-of-scope discovery → `out_of_scope[]` (kept, not counted). Tag
   each record's **`attack_scope`** (∈ `summary.in_scope`); compute `regression_key`,
   dedup, roll up `ASR@n` + unique-finding count + severity histogram **+ the round
   verdict** (`round_verdict` + `stop_reason` + `tokens_used`/`max_tokens` +
   `carried_from_round`). Idea-mode records carry `claim` + `not_strawman` +
   `independence_attestation.derived_independently`; product-mode records carry
   `real_collaborator_at_seam` + `withheld ⊇ {implementation_source, tdd_suite}`.

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
  `scripts/validate_attack_records.mjs` (the §5 gate), **mode-conditional** on
  `target.type`: every confirmed record needs observed≠expected, a non-empty repro +
  `minimized_input`, `repro.replayed_ok:true`, a **mode-appropriate** named oracle,
  `non_tautology_check`, and a non-empty **`attack_scope` ∈ `summary.in_scope`**.
  **product** additionally requires `real_collaborator_at_seam:true` + `withheld ⊇
  {implementation_source, tdd_suite}`; **idea** additionally requires `claim` +
  `not_strawman:true` + `independence_attestation.derived_independently:true` (and does
  NOT require the product-only fields). Unprovable → `needs_judgment`.
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
| `references/context-intake.md` | CONTEXT (Preflight step 0) — the context checklist (target+type, claim/thesis, constraints, success criteria, what-counts-as-a-break, in/out-of-scope, prior rounds), WHY more context = sharper attacks, how it feeds DESIGN, and the elicitation prompts to use when context is thin. |
| `rules/loop-and-metrics.md` | Running attacker inside a loop-constructor loop (round alternation, maker–checker, regression by `regression_key`), or computing the round roll-up / metrics. |
| `references/attack-process.md` | The round — full READ→DESIGN→EXECUTE→PROVE→RECORD procedure + the fresh-context mechanism + target-adapter contract. |
| `references/oracle-menu.md` | PROVE — the mode-appropriate ranked oracle taxonomy: product (implicit→differential→metamorphic→control→specified) + idea (counterexample / contradiction / unmet_assumption / scope_violation / infeasibility / missing_case). |
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
