# Blind-Judge Rubric (the independent quality oracle)

This is the **success oracle** for `humanizer-academic` rewrites. It is
deliberately **blind to the skill's removal rules**: the judge is an LLM-as-judge
that scores residual AI-ness and register preservation from the **source + rewrite
+ these dimensions ONLY**. It is **never shown** the denylists, the detector, or
`scripts/detect_ai_signals.py`. This separation is what defeats the closed-loop
trap — a rewrite that merely deletes denylist words but stays robotic must still
score badly here.

The detector's three-layer signal map is a **diagnostic dashboard, not this
oracle.** Do not import detector counts into the judgment.

## Judge protocol (how to run it)

1. **Inputs to the judge** (and nothing else):
   - the original source text,
   - the candidate rewrite,
   - the five scoring dimensions + hard-fail conditions below.
2. **Withheld from the judge:** the skill's pattern catalogues, the detector
   script and its output, this skill's prompt/SKILL.md. The judge must reason from
   the prose itself, as an outside academic reader would.
3. The judge scores each dimension 1–5, records any hard-fail, and writes a
   one-line justification per dimension grounded in the prose.
4. **Implementation:** an LLM-as-judge call (a fresh, separately-prompted
   evaluator — e.g. a subagent given only the inputs in step 1). In a manual run,
   a reviewer plays the blind judge using only those inputs.

> Provenance note: the dimensions below mirror `evals/fixtures/rubric.md` (the
> migrated legacy rubric), operationalized as a *blind* protocol with explicit
> pass thresholds.

## Scoring dimensions (1–5 each)

### 1. Residual AI-ness (inverted — 5 = reads human)
- `5`: reads as careful human scholarship; no obvious template/machine tells.
- `3`: noticeably cleaned but some scaffolding / uniformity / stance-lessness
  remains.
- `1`: still obviously machine-written (flat rhythm, hedging sprinkle, triads,
  signpost-driven paragraphs).

### 2. Academic register preservation
- `5`: serious, restrained, publishable/reviewable academic prose; **≥ the
  source's** register.
- `3`: mostly serious; a few flat or slightly casual lines.
- `1`: chatty, sloganized, or unserious (register collapse).

### 3. Semantic fidelity
- `5`: meaning, argument structure, evidence, and calibration preserved.
- `3`: core meaning preserved; some nuance/emphasis shifts.
- `1`: meaning drift or lost evidence.

### 4. Authorial texture added (stance + source-grounded specificity)
- `5`: at least one committed, calibrated claim AND ≥1 abstract summary replaced
  with a **source-present** specific; rhythm varies.
- `3`: some stance/specificity, but mostly still abstract or stance-less.
- `1`: pure deletion — flatter and emptier than the source, no texture added.

### 5. Language fit (incl. mixed-language handling)
- `5`: reads like native academic prose for the language; EN technical terms kept
  verbatim inside ZH; ZH full-width punctuation in ZH sentences, ASCII in EN.
- `3`: acceptable, occasional non-native/translated feel.
- `1`: persistent non-native phrasing or broken mixed-language usage.

## Hard-fail conditions (any one = FAIL regardless of score)

- **Invented facts / citations / quotations / numbers** not in the source
  (`fact_invention_rate > 0`).
- Removed necessary hedging or discipline-specific precision.
- Converted academic prose into casual commentary (register collapse).
- Broke mixed-language terminology / punctuation usage.

## Pass thresholds (for eval cases)

A rewrite **passes** the blind judge when ALL hold:
- no hard-fail, AND
- dimension 1 (residual AI-ness) **≥ 4**, AND
- dimension 2 (register) **≥ 4** AND **≥ the judge's score for the source on the
  same dimension** (register must not drop), AND
- dimension 3 (fidelity) **≥ 4**, AND
- dimension 4 (texture added) **≥ 3** (a pure-deletion rewrite that stays robotic
  fails here — this is the closed-loop guard), AND
- dimension 5 (language fit) **≥ 4**.

**Marginal-lift check (paired):** run the judge on the source ("without-skill")
and on the rewrite ("with-skill"); the rewrite must score strictly higher on
dimension 1 (and not lower on dimension 2). If a candidate only deletes denylist
words but the judge still rates dimension 1 ≤ 3, the metric has correctly stayed
independent of the removal rules.
