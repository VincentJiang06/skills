# Oracle menu — how to decide "wrong" with no golden answer

Load this in the **PROVE** phase. You must name **which oracle fired** for every
finding (`record.oracle`, enum below). Pick the cheapest oracle that genuinely
discriminates a broken impl; a finding with no named oracle is not proven →
`needs_judgment`.

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
