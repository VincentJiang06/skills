# Oracle menu — how to decide "wrong" with no golden answer

Load this in the **PROVE** phase. You must name **which oracle fired** for every
finding (`record.oracle`, enum below). Pick the cheapest oracle that genuinely
discriminates a real break; a finding with no named oracle is not proven →
`needs_judgment`.

**Mode-conditional (v0.3.0).** The oracle MUST match `target.type`. **product** records
use the PRODUCT oracles (§1–§5 below); **idea** records use the IDEA oracles (§I1–§I6).
The validator REJECTS a product oracle on an idea record (and vice versa) as a mode/oracle
mismatch.

---

# Product oracles (`target.type: "product"`)

Ranked cheapest → strongest. The enum value is in `()`.

## 1. Implicit oracle `(implicit)` — cheapest, needs no spec
The system tells you it broke: crash, hang/timeout, unhandled exception,
assertion failure, sanitizer trip (ASan/UBSan/MSan turning silent corruption
into a loud, attributable failure), 500, panic, data corruption you can read.
Use first — if the target falls over on its own, you need no reference.

## 2. Differential / pseudo-oracle `(differential)` — needs a second impl or prior version
Feed the **same input** to two independent implementations, or to the **prior
version** of this target. Any divergence is a bug in at least one. This is how
Csmith found 481+ compiler bugs. Doubles as the **regression** oracle across
rounds: a prior `confirmed` record whose repro now matches the fixed behavior
flips to `status:"fixed"`.

## 3. Metamorphic / property oracle `(metamorphic)` — ONE impl, NO reference
Check a **relation** between a source run and a transformed follow-up. A violated
relation IS the bug, no golden output needed. The bridge from CVE-hunting to
functional/robustness bugs. Common relations:
- reorder-invariance (shuffle inputs → same result)
- add-then-undo identity (apply X then un-X → original) — the canonical coupon case
- conservation / total-preservation
- idempotence (apply twice → same as once)
- monotonicity
- query-narrowing-returns-subset

## 4. Control-vs-experiment `(control_vs_experiment)` — kills variance false positives
Compare the perturbed run against a **concurrent or immediately-prior untouched
control** (ChAP-style). Credit a failure only on a clear, reproducible divergence
— never a one-shot anomaly that could be normal variance. Use for flaky/timing/
load targets; pairs with the `repro.replays_total` / `replays_passed` k/n
threshold the validator enforces.

## 5. Specified oracle `(specified)` — an explicit promised value exists
The requirement states the exact correct output for this input. Compare against
it. NOTE the discipline: `expected` is derived **independently from the
requirement** (`independence_attestation.derived_expected_from`), never read off
the implementation or its tests — that would re-inherit the common-mode error.

## Anti-vacuity reminder
The oracle must check a property the feature **actually promised**. A correctly
rejected malformed input the contract never promised to handle is **not** a
finding (it must not appear in `records[]`; the validator rejects such a record).

---

# Idea oracles (`target.type: "idea"`) — attacking an argument/design/plan (debate con-side)

You are red-teaming an **idea**, not a running system. The proof shape: a steelmanned
`claim`, `expected` = what the claim predicts, `observed` = the counter outcome, a
**reasoning chain** (`repro.steps`) a fresh reader can re-check over a **minimal scenario**
(`repro.minimized_input`), `not_strawman:true`, and a critique **derived independently**
(`independence_attestation.derived_independently:true`). Anti-vacuity still applies: a vague
"I disagree" with no concrete counter (`observed == expected`) is NOT a finding →
`needs_judgment`. Pick the cheapest idea oracle that genuinely discriminates a flawed claim.

## I1. Counterexample `(counterexample)` — cheapest, the canonical idea break
Exhibit ONE concrete case inside the claim's own domain where the claimed outcome does NOT
hold. A universal claim ("every X…") falls to a single real counterexample; the minimal
scenario IS the case.

## I2. Contradiction `(contradiction)` — internal inconsistency, no external case needed
Show the claim's premises (or two of its stated commitments) cannot both hold — the argument
is self-defeating. A violated internal relation IS the break, like a metamorphic relation for
an argument.

## I3. Unmet assumption `(unmet_assumption)` — a load-bearing premise is false/unsupported
Name a premise the conclusion depends on and show it does not hold in the stated context (or
is asserted without support). If the premise fails on a real subset, the conclusion does not
follow there.

## I4. Scope violation `(scope_violation)` — the claim over-reaches its evidence/domain
The claim is supported only within a narrower domain than it asserts (over-generalization).
Show the gap between what the evidence/justification covers and what the claim concludes.

## I5. Infeasibility `(infeasibility)` — sound in principle, impossible/too costly in practice
The plan/design cannot be realized within the declared constraints (resources, time,
dependencies, physics). Show the binding constraint the plan ignores.

## I6. Missing case `(missing_case)` — an unhandled case the claim/plan must cover
Exhibit a case the claim/plan was obligated to handle (by its own scope or success criteria)
but does not — a coverage gap, the argument analogue of "what the tests miss."

## Idea anti-vacuity reminder
The oracle must attack the **actual steelmanned claim** (`not_strawman:true`), and the counter
must be **concrete** — a real counterexample / a named premise / a binding constraint, not a
restatement of disagreement. A non-discriminating critique (`observed == expected`) is NOT a
finding; route it to `needs_judgment`.
