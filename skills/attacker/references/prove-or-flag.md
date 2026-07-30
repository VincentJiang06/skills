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

- The **attacker model self-LABELS** its items against this bar — classify-not-delete: it
  proposes finding/flag + severity and may NOT drop an item it noticed. Frontier models obey
  "only report proven/severe" literally and silently under-report; a suppressed candidate is
  unrecoverable, a mislabeled one is. Deletion authority sits solely with the adjudicator.
- **Final adjudication** is by a judge that is **different-vendor from the target's author**
  (self-preference bias is model-level; a same-family judge quietly passes same-family work).
  Quantified, not asserted: PBT-Bench (2605.15229) finds the hardest defects are *model-specific*
  with **no single model covering all of them** — a one-model battery has a structurally
  uncoverable residue (KB `WEB-VerifierEng` / E12). The honest bound from the same source line:
  an independent judge is not generally *stronger* than re-running the generator (MAS-ProVe) — you
  are buying **different blind spots**, not more capability. At A33 high stakes this is mandatory;
  at low stakes, note in coverage_gaps that adjudication was same-tier.
- The judge is NEVER the target's author (author-level independence, A31) AND SHOULD NOT be the
  target author's model family (model-level, T11).

## Golden samples (≥14; calibrate the rubric before trusting it)

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
13. ★ An anomaly the striker demonstrably noticed (present in its working notes/draft) but absent
    from the report "because it couldn't be proven" → **report-defect** (coverage violation): it
    must appear as a FLAG; dropping is the adjudicator's power, never the striker's.
14. ★ A prior finding "closed" by editing only the sentence that named it, while the original
    reproduction still breaks → **FINDING at the original severity** (fix-audit axis C: cosmetic
    repair is not repair). Same verdict if the claim was deleted and the mechanism left intact.

## Rubric acceptance (this rubric is a measurement spec, and it can be gamed)

Before trusting this rubric — or any judgment card the attacker writes for a target — accept it on
**four axes**, not one (KB E12 / `WEB-RubricAudit`, `WEB-VerifierEng`):

1. **Structural sufficiency** — items do not overlap (overlapping items double-count and are the
   first of the four low-FP principles).
2. **Reliability** — inter-rater κ/α on the golden samples.
3. **Preference fit** — does the score track what the owner actually wants?
4. **Adversarial robustness (the axis usually skipped)** — an **exploit test**: hand the rubric to
   an actor trying to score high while failing the spirit, and measure whether they can.

**κ/α does not imply anti-gaming — they are orthogonal axes.** Measured: driving the exploit rate
down by 10pp moved inter-judge α **almost not at all**. So "our judge agrees with humans 0.85, the
rubric is validated" is a one-axis claim; the exploit axis is untested and may be wide open. A
rubric shipped without an exploit result is `rubric_grade: consistency-only` — say so.

**Score one item at a time.** Batch scoring (one judge, many items in one call) has a **measured**
accuracy cost; the token saving is real and so is the loss. Judgment cards are per-item by default;
batching is an explicit, recorded downgrade, not the silent default.

**Feed-back vs acceptance must be separately accounted.** Handing the rubric's reasoning back to
the thing being scored lifts its score a lot (0.47→0.85) — legitimate as an *improvement* tool,
illegitimate as *acceptance*. Acceptance scores come from a fresh judge that never fed back (A31).

## Rubric budgets (anti-bloat, A41 reflexive)

Each lens prompt ≤ ~600 tokens. This rubric ≤ ~900 (raised from 700 in 0.7.0 to carry the
acceptance axes — an ADD paid for by evidence, logged in CHANGELOG rather than hidden). Golden
samples ≤ ~500. If a lens needs more, fold, don't grow. Total attacker apparatus target: < 1/3 of
the previous attacker's weight.

## The rubric audits itself

This file is an evaluator. Its own non-vacuity is checked by the SEED gate (a run that misses a
planted defect is void). Its own drift is bounded by the golden samples above. Its own
**exploitability** is bounded by pointing the Gaming lens at this file (axis 4 above — the golden
samples alone only bound axis 2). Its own bias is bounded by the different-vendor judge. There is
no infinite regress: it stops at
golden-samples ← two-independent-humans-agree (T11 human tier — recorded honestly as unavailable
under a single operator, not faked).
