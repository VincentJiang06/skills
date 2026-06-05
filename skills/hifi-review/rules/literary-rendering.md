# Literary Rendering (Step 7)

The user wants 文学化 description — but **accuracy is paramount**. Literary language
may *color* a fact; it may never *exceed or contradict* it.

## The anchoring rule
Every rendered sentence must map to ≥1 claim that already exists in the evidence
set, with its `provenance` and `confidence`. If a phrase has no backing claim,
delete the phrase — not the requirement. Write the structured profile first, then
the prose; the prose paraphrases the profile, it does not add to it.

## Bilingual
Render 中文 and English in parallel (中文 first, then English, or paired per
attribute). Use the canonical terms from `references/signature-glossary.md` so
wording stays consistent.

## Worked example
Profile fact: `sub_bass quanta +2 (measured, conf 0.9)`, `mid_treble −1
(measured)`, `soundstage above-average (consensus 4/5)`.

- ✅ Accurate-but-literary: "低频量感偏多、下潜扎实，高频略收敛、不咄咄逼人，声场
  开阔（4/5 评测共识）。 / Generous, well-rooted sub-bass; a slightly tucked-away
  mid-treble that never gets aggressive; a soundstage most reviewers (4/5) call
  spacious."
- ❌ Over-claim: "earth-shaking bass and holographic, reference-grade staging" —
  exceeds +2 / a 4-of-5 consensus, and "reference-grade" cites nothing.

## Forbidden
- Superlatives with no measurement/consensus backing.
- Audible-difference claims for a source measured transparent.
- Technicalities written as if measured.
- Smoothing a flagged conflict into a single confident verdict.

When evidence is thin, say so in-line ("证据不足 / insufficient evidence") rather
than writing around the gap.
