# Blind-Judge Rubric (the independent quality oracle) — PER-MODE v2

This is the **success oracle** for `humanizer-academic` rewrites. It is
deliberately **blind to the skill's removal rules**: the judge is an LLM-as-judge
that scores from the **source + rewrite + the dimensions below ONLY**. It is
**never shown** the denylists, the detector, or `scripts/detect_ai_signals.py`.
This separation defeats the closed-loop trap — a rewrite that merely deletes
denylist words but stays robotic must still score badly here.

> **v2 — two tracks, because "good" differs by genre.** The skill has two modes
> (`academic` 论文 / `popsci` 科普). The judge runs the **track that matches the
> piece's mode**. Three dimensions are shared; **three (register, texture,
> completeness) are mode-specific** — judging popsci by the academic register
> dimension would wrongly penalize legitimate craft (rhetorical questions, "you",
> analogy), and vice-versa. Each track adds a **完成度 / completeness** dimension:
> does the rewrite read as a *complete, finished* exemplar of its genre, not just
> a de-slopped fragment.

The detector's signal map is a **diagnostic dashboard, not this oracle.** Never
import detector counts into the judgment.

## Judge protocol (how to run it)

1. **Inputs to the judge** (and nothing else): the original source text; the
   candidate rewrite; the **mode** (`academic` | `popsci`); the matching track's
   six dimensions + hard-fails below.
2. **Withheld from the judge:** the skill's pattern catalogues, the detector
   script and its output, SKILL.md. Reason from the prose itself, as an outside
   reader of that genre would.
3. Score each of the six dimensions **1–5**, record any hard-fail, write a
   one-line prose-grounded justification per dimension, then emit the **output
   JSON** (below).
4. **Implementation:** a fresh, separately-prompted LLM-as-judge (a subagent
   given only the step-1 inputs). Maker ≠ judge: the agent that produced the
   rewrite must not score it.

## Strictness calibration (v2.1 — reserve 5 for exceptional) + paired judging

A lenient judge that scores everything 4.8–5.0 cannot measure improvement. Use the
**full scale** and **reserve 5 for the exceptional**:

- **5 = exceptional.** A careful human professional in this genre would **publish
  it unchanged**. Not "no visible flaws" — a *specific* excellence (a genuinely apt
  analogy, a sharp committed claim, prose that earns its rhythm). Default to 4, not
  5; a 5 must be justified by a named strength, not the absence of problems.
- **4 = good, minor issues.** Solid and publishable after a light edit; one or two
  flat lines, a slightly generic close, a missed chance to ground an abstraction.
- **3 = acceptable but clearly improvable.** Does the job but reads workmanlike;
  noticeable residual uniformity / thin texture / an arc that sags.
- **2 = weak.** Real problems on this dimension. **1 = fails the dimension.**

> Be a strict editor, not a polite reader. On a typical good rewrite most
> dimensions land at **4**; 5s are earned and sparse. If you are tempted to give
> straight 5s, re-read for the one thing that would make a professional tweak it.

**Paired judging (source vs rewrite) — score BOTH.** For every item, score the
**source** and the **rewrite** on all six dimensions, and report:
- the **rewrite's** absolute scores (these feed `overall_mean` and the per-mode
  `completeness_mean` the loop gates on), AND
- the **lift** = rewrite − source on dim 1 (ai_ness) and dim 6 (completeness).

A rewrite that is merely *polite* but no more **complete/human** than its source
shows lift ≈ 0 and must **not** pass — the gate rewards real movement, not absolute
niceness. Record `lift_ai_ness` and `lift_completeness` per item.

---

## Shared dimensions (identical in both tracks)

### 1. Residual AI-ness (inverted — 5 = reads human)
- `5`: reads as careful human writing; no obvious template/machine tells.
- `3`: noticeably cleaned but some scaffolding / uniformity / stance-lessness remains.
- `1`: still obviously machine-written (flat rhythm, hedging sprinkle, reflexive
  triads, signpost-driven paragraphs, generic uplift close).

### 3. Semantic fidelity
- `5`: meaning, argument structure, evidence, and calibration preserved.
- `3`: core meaning preserved; some nuance/emphasis shifts.
- `1`: meaning drift or lost evidence.

### 5. Language fit (incl. mixed-language handling)
- `5`: reads like native prose for the language; EN technical terms kept verbatim
  inside ZH; ZH full-width punctuation in ZH sentences, ASCII in EN.
- `3`: acceptable, occasional non-native/translated feel.
- `1`: persistent non-native phrasing or broken mixed-language usage.

---

## Track A — `academic` (论文)

### 2A. Academic register preservation
- `5`: serious, restrained, publishable/reviewable academic prose; **≥ the
  source's** register.
- `3`: mostly serious; a few flat or slightly casual lines.
- `1`: chatty, sloganized, or unserious (register collapse).

### 4A. Authorial texture (stance + source-grounded specificity)
- `5`: ≥1 committed, calibrated claim AND ≥1 abstract summary replaced with a
  **source-present** specific; rhythm varies.
- `3`: some stance/specificity, but mostly abstract or stance-less.
- `1`: pure deletion — flatter and emptier than the source, no texture added.

### 6A. Completeness / 完成度 (academic)
- `5`: reads as a **complete, finished scholarly passage** — a coherent argument
  arc, nothing substantive dropped, hedging/precision intact, section logic and
  load-bearing transitions whole; a reviewer would treat it as a finished unit.
- `3`: substantively complete but with a thin patch — a dropped qualifier, a
  transition that no longer carries its logical work, or a slightly truncated arc.
- `1`: feels partial or gutted — the de-slopping removed substance, leaving a
  fragment, a broken argument, or missing connective logic.

**Track A passes** when ALL hold: no hard-fail; **1 ≥ 4**; **2A ≥ 4** and **≥ the
source's** dim-2A score (register must not drop); **3 ≥ 4**; **4A ≥ 3** (a
pure-deletion robotic rewrite fails here — the closed-loop guard); **5 ≥ 4**;
**6A ≥ 4** (a de-slopped fragment that lost substance fails here).

---

## Track B — `popsci` (科普) — grounded in `references/popsci-register.md`

> The popsci failure modes are **two-sided**: collapse *downward* into
> clickbait/hype/listicle (AI's default), and collapse *upward* into stiff
> jargon-walled fake-academic (the over-correction). Good popsci sits between,
> with its craft intact. Judge accordingly.

### 2B. Popsci register fit (credible AND engaging — both directions)
- `5`: clear, engaging, **credible** science writing (the *Conversation* / NASA /
  Quanta / 中文维基科普 register). **Craft preserved** — a real rhetorical question,
  "you"/第二人称, a load-bearing analogy, a curious voice are present where the
  source had them. **No** clickbait/hype/emoji/listicle-shell AND **not** stiffened
  into fake-academic.
- `3`: credible but the voice is flattened (craft scrubbed into literal jargon) OR
  a little hype/scaffolding survives.
- `1`: clickbait/hype/listicle (downward collapse) OR stiff jargon-wall (upward
  collapse) — either kills good popsci.

### 4B. Popsci texture/voice (explanatory craft, source-grounded)
- `5`: ≥1 vivid analogy or concrete everyday example that **carries real
  explanatory load** (and is true to the source), a curious human voice, varied
  rhythm; the abstraction is grounded.
- `3`: some grounding/voice, but mostly abstract exposition.
- `1`: flat literal exposition, no analogy/example/voice. (A figurative analogy
  that *glosses a mechanism the source already describes* is craft, not
  fabrication; only an analogy that smuggles in a NEW or FALSE factual claim
  triggers the fabrication hard-fail.)

### 6B. Completeness / 完成度 (popsci)
- `5`: reads as a **complete, publishable science-journalism piece** — a clear
  through-line from a real hook to a payoff, the phenomenon **fully explained for
  a smart non-specialist**, honest about uncertainty, and a **grounded close** (an
  open question / real implication — NOT an empty "the future is bright" uplift).
  An editor would run it.
- `3`: explains the core but feels unfinished — a missing step in the explanation,
  an abrupt end, or a generic uplift wrap standing in for a real close.
- `1`: partial or hollow — a de-slopped skeleton that no longer explains the thing,
  or just an intro with no payoff.

**Track B passes** when ALL hold: no hard-fail; **1 ≥ 4**; **2B ≥ 4**; **3 ≥ 4**;
**4B ≥ 3**; **5 ≥ 4**; **6B ≥ 4** (an incomplete or hollow explainer fails here).

---

## Hard-fail conditions (any one = FAIL regardless of score; both tracks)

- **Invented facts / citations / quotations / numbers / dates / named entities**
  not in the source (`fact_invention_rate > 0`). A *figurative analogy* that
  glosses a mechanism the source already states is **craft, not fabrication** —
  only NEW factual claims fail.
- Removed necessary hedging or discipline-specific precision.
- **Register collapse:** academic → casual commentary; popsci → clickbait/hype OR
  stiff fake-academic (craft destroyed).
- Broke mixed-language terminology / punctuation usage.

## Marginal-lift check (paired, both tracks)

Run the judge on the source ("without-skill") and the rewrite ("with-skill"); the
rewrite must score **strictly higher on dimension 1** (and **not lower** on the
mode's register dim 2A/2B and completeness dim 6A/6B). A candidate that only
deletes denylist words but stays flat/uniform must still get dim 1 ≤ 3 — the
metric correctly stays independent of the removal rules.

## Output JSON (what the judge emits — feeds baseline.json / candidate.json)

Per item:
```json
{
  "id": "<corpus file id>",
  "mode": "academic | popsci",
  "scores": { "ai_ness": 0, "register": 0, "fidelity": 0, "texture": 0, "language": 0, "completeness": 0 },
  "hard_fail": null,
  "overall_mean": 0.0,
  "verdict": "pass | fail",
  "justification": { "ai_ness": "…", "register": "…", "fidelity": "…", "texture": "…", "language": "…", "completeness": "…" }
}
```
- `overall_mean` = mean of the six 1–5 scores (0 if `hard_fail`).
- **`completeness_mean`** (the loop's tracked per-mode metric) = the mean of
  `overall_mean` across all items of that mode. Report it per mode
  (`academic.completeness_mean`, `popsci.completeness_mean`) plus the per-mode
  `lifted` count (verdict == pass) and `non_lifted_ids`.
