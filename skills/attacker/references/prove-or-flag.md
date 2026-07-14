# PROVE-OR-FLAG rubric (the evaluator — itself calibrated)

The single discipline that keeps the attacker honest: a finding is a *proven* breakage; everything
else is a flag. This rubric is an evaluator, so per P5 it carries golden samples and is itself
audited.

## The bar

A report item is a **FINDING** only if ALL hold:
1. **Located.** It quotes the exact target site (file + line/section), both sides for a contradiction.
2. **Reproduced.** It carries `reproduction = {steps, expected, observed}` that an *independent
   rerunner who is not the target's author* can execute and get the same break. For a code target:
   runnable steps. For an argument/design target: a strict thought-experiment any reader can re-run
   AND that a non-author actually re-ran.
3. **Consequential.** It states what downstream fails if unfixed (severity P1/P2/P3).

Anything failing any of the three is a **FLAG** (an honest suspicion), reported in a separate list.
Flags are valuable — they seed the next round — but they are NEVER counted as findings, NEVER
dressed up in finding language.

## Severity

- **P1** = core mechanism can be architecturally bypassed, or a core premise is false. Blocks.
- **P2** = a real hole needing a specific patch; catchable but default-missed.
- **P3** = edge / wording / already-governed-but-worth-noting.

## Judge topology (closes model-level self-preference, not just author-level)

- The **attacker model self-screens** its own items against this bar first.
- **Final adjudication** is by a judge that is **different-vendor from the target's author**
  (self-preference bias is model-level; a same-family judge quietly passes same-family work). At
  A33 high stakes this is mandatory; at low stakes, note in coverage_gaps that adjudication was
  same-tier.
- The judge is NEVER the target's author (author-level independence, A31) AND SHOULD NOT be the
  target author's model family (model-level, T11).

## Golden samples (≥12; calibrate the rubric before trusting it)

Each sample is `{item, correct_verdict, why}`. A judge that misgrades these is not calibrated.
Carry a `model_baseline` stamp; re-verify on model change (A37). Minimum set — MUST include the
hard cases marked ★:

1. Located+reproduced+consequential arithmetic contradiction → **FINDING P1**.
2. ★ "Thought experiment: imagine an implementer who…" with no non-author rerun → **FLAG** (the
   thought-experiment escape hatch; the #1 way flags get inflated).
3. A real cheat script that passes an existence check → **FINDING**.
4. "This feels under-specified" with no exhibited double-bind → **FLAG**.
5. ★ A contradiction where one side is a *governed tension* (in the target's tensions doc) →
   **FLAG / not-a-finding** (re-reporting a governed tension is noise).
6. Fetched source contradicts claim at stated strength → **FINDING**.
7. ★ A fabrication asserted without a first-party fetch → **FLAG** (the attacker committing the
   evidence sin it hunts).
8. Two real assets scoring identically under the target's rubric → **FINDING** (gradientless verdict).
9. A break shown only on a hypothetical instance, no real instance exercised → **FLAG**.
10. ★ A "finding" that re-reports something the target already fixed in a prior round → **not-a-finding**
    (check the target's revision lineage first).
11. Counted rot metric (additions:deletions = 70:1, N orphan refs) → **FINDING**.
12. ★ A P1-worded item whose consequence is actually cosmetic → downgrade to **P3** (severity inflation).

## Rubric budgets (anti-bloat, A41 reflexive)

Each lens prompt ≤ ~600 tokens. This rubric ≤ ~700. Golden samples ≤ ~500. If a lens needs more,
fold, don't grow. Total attacker apparatus target: < 1/3 of the previous attacker's weight.

## The rubric audits itself

This file is an evaluator. Its own non-vacuity is checked by the SEED gate (a run that misses a
planted defect is void). Its own drift is bounded by the golden samples above. Its own bias is
bounded by the different-vendor judge. There is no infinite regress: it stops at
golden-samples ← two-independent-humans-agree (T11 human tier — recorded honestly as unavailable
under a single operator, not faked).
