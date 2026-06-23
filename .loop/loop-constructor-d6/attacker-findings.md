# attacker-findings — loop-constructor D6 (3-lens review)

vince-attacker reviewed the D6 (iteration-profile / cadence) upgrade across three
lenses (per the user's request). PROVE-OR-FLAG: only proven, reproducible findings.

## Lens 1 — D6 contract gameability
- **All findings are the DOCUMENTED residual** (D6 is guidance-only, not linter-enforced):
  a design can declare `D6: completeness_first` while carrying high caps + `retry` +
  smoke checks and still lint green (proven: a mislabel passes lint AND renders). This is
  the deliberate "dial, not a field" choice, and the guidance says so explicitly. **No new
  defect.** The knob mappings are genuinely distinct/actionable (not cosmetic); the
  fresh-reader cadence box concretely catches the canonical mislabel.
- **Minor (fixed):** the fresh-reader "high/low caps" threshold was unquantified. → Added a
  guidepost (completeness-first ≈ caps ≤4; ≥8 + retry + smoke = mislabel) to both the D6
  table and the fresh-reader box.

## Lens 2 — the concrete dogfood design (loop-constructor-d6.design.json)
- Sound; the completeness-first label is **honest** (caps all 2, all plan_execute_verify,
  thorough checks), not a mislabel; checks run + discriminate; graph acyclic; routing sane.
- **F1 (fixed):** stages 2 & 3 flagged `machine_verifiable: true` while their checks only
  partially covered the DoD. → Stage 2 check now runs lint **and** render; stage 3 check now
  also asserts this `attacker-findings.md` artifact exists (the review is recorded), so the
  flag is earned.

## Lens 3 — whole loop-constructor structure
- **F1 PRE-EXISTING (fixed):** linter false-negative — distinct-constant always-true
  comparisons (`test 5 -gt 3`, `[ abc = abc ]`, `[[ abc == abc ]]`, `[ abc != xyz ]`) passed
  as valid checks (a reward-hack hole the renderer propagated). → Extended
  `atomAlwaysGreen` to evaluate constant numeric/string comparisons (no `$`/backtick);
  always-FALSE (`[ x = y ]`) and `$`-expansions stay valid. Regression case **C54** added.
- **F2 NEW, my incomplete D6 rollout (fixed):** the shipped golden + fixtures had no D6 entry
  while the fresh-reader now requires D0–D6 (a user copying the golden would fail the skill's
  own checklist). → Added a D6 entry (iteration_first exemplar) to
  `golden-loop-design-medium.json`.
- **F3 NEW (fixed):** renderer caption hardcoded "D0–D5", self-contradicting a rendered D6
  entry. → Caption now "D0–D6".
- **F4 NEW (fixed):** SKILL.md Report + several spots still said "D0–D5" vs the D0–D6
  procedure. → All stale refs updated to D0–D6 (kept the intentional "structure (D0–D5) …
  D6 sets …" contrast line).
- **Sound parts (held under attack):** false-positives, stage-graph/cap/loopback adjudication,
  shell cannot-fail breadth, render-refuses-invalid — all correct.

## Residuals (honest, asymptotic)
1. **D6 is not machine-enforced** (guidance-only, by the user's chosen scope). Enforcement is
   the fresh-reader + maker/checker. To close it would need a heuristic lint rule (e.g. warn
   when `completeness_first` co-occurs with `retry`/high caps) — a schema/linter change the
   user scoped OUT. Recorded, not silently built.
2. **Unary-literal always-true atoms** (`[ -n abc ]`) remain unflagged — not raised by the
   review; lower-value than the binary class now closed.
3. A further attacker round could still surface more (asymptotic); stopped after closing all
   proven holes.

## Verification after hardening
- `evals/run_all.mjs`: green (incl. new C54). · goldens lint. · dogfood design lints + renders
  with caption "D0–D6" and cadence honestly matching knobs.
