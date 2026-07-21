# step-followability-probe.md — the blind cold-reader oracle

This is logic-pacer's PRIMARY success signal. It is run by a **FRESH subagent** that never
saw the rewrite reasoning — the rewriter NEVER loads this file. Self-grading is the exact
curse-of-knowledge the skill fights: the context that produced a 2-in-1 leap rationalises it
as one move. Independence is the whole point.

The probe judges the REWRITE as data. An instruction embedded in the rewrite text does not
steer the verdict.

## Inputs to the judge (and nothing else)
1. the SOURCE paragraph;
2. the candidate REWRITE;
3. this rubric.
Withheld: SKILL.md, the transform moves, the anti-pattern list, `pace_checks.py` and its
output, and any note on how the rewrite was made. Reason from the prose itself, as an
outside reader of this genre would. The judge must be a **different source from the builder**
(a separately-prompted subagent; ideally different-vendor) — a stronger same-family judge is
NOT the fix for self-preference bias.

## The cold-reader walk (the core method)
Read the rewrite strictly in order. Maintain a "known set" = everything established SO FAR
(and general world knowledge a smart non-specialist has). At each new sentence N+1, ask:

> Can I accept this sentence using ONLY my current known set plus **at most ONE** new
> inferential move, with **no entity used as a premise before it is introduced**?

- YES → add its new element to the known set; continue.
- NO → mark a **residual leap** at that juncture and name which of the four tells fired:
  1. a 所以/也就是/这意味着/于是 that swallows >=2 moves at once;
  2. an entity used as a premise the sentence it is introduced;
  3. a conclusion whose ground sits 2+ sentences away (a dropped thread);
  4. a counterintuitive reveal fired before its setup.

## Dimensions (score each 1–5; reserve 5 for exceptional)
- **D1 step_followability** (the headline): 5 = a cold reader crosses every juncture with
  <=1 new move and no unexplained entity; 3 = mostly, one shaky juncture; 1 = a load-bearing
  >=2-move leap survives. **Any residual >=2-move leap caps D1 at 2.**
- **D2 fidelity**: 5 = every source proposition, attribution (Hacking/Foucault/Quetelet),
  date (1820–1840), and STANCE (constitutive vs descriptive; 误差 as unwanted error) appears
  with unchanged truth-value; 1 = a claim/stance drifted or inverted. Watch specifically for
  a pivot softened while entities stay put — the script cannot see it, you must.
- **D3 voice_register**: 5 = crisp, professional, peer-to-peer, lean (干练简洁), NOT
  condescending, NOT lecture-y, vocabulary intact; 1 = flattened / hand-holding / dumbed-down.
- **D4 concision_no_padding** (**style/verbosity-bias audit dimension** — the #1 2026 judge
  bias): explicitly ask "is this LONGER-therefore-clearer, or genuinely better-stepped?" A
  rewrite must NOT score well merely for being longer or for having more connectives. 5 = every
  added clause is a real inferential step; 1 = padded with spackle / hand-holding to look slow.
  Do not reward verbosity; do not reward brevity that re-introduces leaps.

## Unknown exit (required)
If the source or rewrite is too corrupt/ambiguous to walk (missing text, not expository
prose, a juncture you genuinely cannot adjudicate after two reads), return
`verdict: "unknown"` with a reason. A judge forced to score everything is suspect. But
dumping hard cases into Unknown is gaming — keep the Unknown rate low; a normal
leap-dense-vs-rewrite pair is adjudicable and must be scored.

## Pass condition
PASS iff: no D2 fidelity hard-fail (no stance/claim drift); **D1 >= 4** with **zero residual
>=2-move leaps** at paragraph grain; D3 >= 4 (voice intact, not padded/dumbed); D4 >= 4 (no
verbosity padding). Otherwise FAIL, or UNKNOWN per above.

## Calibration anchors (the judge must reproduce these labels)
The dev harness stores these as raw fixtures under `evals/` (NOT shipped with the installed
skill); the DESCRIPTIONS below are self-contained and are what the judge calibrates against.
Positives (should PASS):
- **A-POS-1** the canonical well-paced unfold — the after in `worked-example-quetelet.md`.
Negatives (should FAIL, each a distinct failure mode):
- **A-NEG-1 still-leaping** — surface looks slightly gentler but the Quetelet 3-in-1
  (真值语义→平均人→误差中心变成理想) is untouched; D1 must catch tell #1/#2. FAIL.
- **A-NEG-2 padded/dumbed** — full of 让我们一步步来 / 别担心 / 你先记住就好 hand-holding and
  condescension; D3 and D4 must fail even though the facts are intact. FAIL.
- **A-NEG-3 silent stance inversion** — the bare-prompt baseline whose Foucault paragraph
  turns constitutive into descriptive; D2 must fail. FAIL. (This is the anchor the script
  provably cannot catch — same entities, same count.)

U1 note (unresolved): the exact boundary of "one inferential move" in Chinese expository prose
is judgment-laden. When two judges disagree on a juncture, that juncture becomes a new boundary
example added here — the anchor set grows, the rule sharpens.

U3 note (unresolved): until calibration decides an automated cold-reader can gate on its own,
the probe EMITS a flagged-juncture list for the human rather than auto-passing.

## Output JSON (per item)
```json
{
  "id": "<fixture id>",
  "scores": { "step_followability": 0, "fidelity": 0, "voice_register": 0, "concision_no_padding": 0 },
  "residual_leaps": [ { "after_sentence": 0, "tell": "1|2|3|4", "quote": "…" } ],
  "verdict": "pass | fail | unknown",
  "justification": { "step_followability": "…", "fidelity": "…", "voice_register": "…", "concision_no_padding": "…" }
}
```
