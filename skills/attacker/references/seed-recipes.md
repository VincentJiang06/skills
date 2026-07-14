# SEED recipes (the anti-false-negative gate)

PROVE-OR-FLAG filters false *positives*. SEED filters false *negatives* — a blind attacker producing
zero findings, indistinguishable from "target clean", which the stop condition would reward as
convergence. Before each lens run, plant ≥1 known seed defect (or attach a known-dirty control). A
run that misses its seed is **void** — not counted toward the stop condition.

## Seed structure (so hit/miss is decidable without an uncalibrated judge)

```
seed = { location, claim_keywords[], kind, expected_severity }
```
- `location`: where the defect is planted (file+section).
- `claim_keywords`: 2–4 tokens the attacker's report must contain to count as a hit.
- Hit/miss decision = **deterministic match** (does any finding's location overlap AND ≥1 keyword
  appear?) + **human fallback** for near-misses (variant wording, right area wrong keyword). The
  matcher is deterministic on purpose — the void-gate must NOT itself be an uncalibrated LLM judge.

## Recipes per target type

- **Skill / design doc (like this one).** Plant a real defect of the lens's kind: for Coherence,
  a two-constraint arithmetic contradiction; for Gaming, an existence-check with an obvious cheat;
  for Evidence, one stale/overstated citation; for Reality, one rule that can't be transcribed; for
  Foundation, one un-clocked v0 parameter. Keep a small library of pre-written seeds per lens.
- **Codebase.** Inject a known bug on a branch (off-by-one, a swallowed error, a missing null-check)
  — the classic mutation-testing seed. Attacker must surface it.
- **Argument / plan.** Insert one known fallacy or one un-sourced strong claim. Attacker must name it.
- **Cheapest universal seed.** Attach a *separate known-dirty control target* alongside the real one
  and require the attacker to rank them — if it can't tell the planted-bad from the real, it is blind.

## Void handling

- Attacker misses its seed → run is `void`, excluded from E9 counting, re-dispatched (fresh context,
  possibly a stronger/different model — a weak model failing to find the seed is itself a signal:
  record `attacker_capability: below-seed` in coverage_gaps).
- Attacker hits its seed → run counts; strip the seed finding from the real report.
- The seed hit-rate doubles as the **capability probe** for the cross-vendor acceptance test: it
  measures the "weak attacker finds less" risk directly, not just independence.
