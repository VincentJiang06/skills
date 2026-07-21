# logic-pacer

Rewrite EXISTING expository prose you already like (Chinese or English) so its reasoning
is **easier to follow, one small step at a time** — shrink the inferential **step size** and
re-anchor each step on ground the reader just gained (given-new), while **keeping the voice,
keeping the vocabulary (never dumb it down / 对齐词汇), keeping every fact/claim/stance, and
staying lean** (net length <= ~1.3x).

One-line method: **detect >=2-move leaps → unfold each into its minimal chain → subtract
ornament**. Slogan: clear means not just fast jumps, but STABLE jumps.

## Trigger (use when)
- "this paragraph's logic jumps too fast — slow it down but don't touch my voice or words"
- "make this reactor-study node's reasoning followable step by step, crisp, no padding"
- "reduce the inferential step size in this paragraph without dumbing down the vocabulary"
- `$logic-pacer`

## Anti-trigger (do NOT use → go elsewhere)
- The text **reads like AI** and needs de-roboting → `humanizer-academic` (opposite default:
  it abstains when the prose already reads human)
- You want **simpler words / vocabulary alignment / a lay summary / translation** — this skill
  explicitly refuses to do these
- **Reorder / restructure which points appear** → this skill keeps claim order, only unfolds
  the jumps between already-ordered points
- **Generate new prose from source materials** → generative writing skills
- A vague "polish/rewrite" with no specific step-size complaint → does not fire

## How it works (spine)
TRIAGE (often abstain) → unfold the leaps (six moves A–F) → subtract ornament to stay lean →
hold the hard constraints throughout → verify with a script + an independent blind subagent
probe, surfacing every flag loudly. Detail lives in `references/`, loaded on demand.

- `references/mechanisms.md` — the WHY behind the six moves; read only when a leap won't unfold
- `references/anti-patterns.md` — forbidden moves (vocab downgrade, hand-holding, transition spackle)
- `references/worked-example-quetelet.md` — full before/after on the canonical paragraph (~1.27x)
- `references/step-followability-probe.md` — blind cold-reader rubric, run by a FRESH subagent;
  the rewriter never loads it
- `scripts/pace_checks.py` — deterministic objective gates (length ratio, term diff, entity
  proxy); **executed, never read into context**

## Boundary (important, stated honestly)
- The objective script **measures, it does not decide**. The real success signal is the blind probe.
- **Fidelity (no silent claim/stance change) is a model-level invariant.** The script cannot see
  a stance inversion that keeps the same entities and proposition count (constitutive→descriptive,
  as in the Foucault case) — the skill deliberately does NOT weaken this into a scriptable check
  that would ship the failure green.
- **Paragraph/section grain, author human-reads each output**; never an autonomous whole-corpus batch.

Most-used on reactor.vincejiang.com / UniWild expository nodes. Failure cost = MEDIUM
(recoverable because the author reads every output, but corrosive across 70 nodes if habitual).
