# Structural & Statistical Signals — the layers a lexical denylist misses

> Authored heuristics (not a sourced classifier). The lexical catalogues
> (lexical-en.md, lexical-zh.md) catch *words*. This file covers the
> two layers that survive word-level scrubbing and are the clearest remaining
> tells of machine authorship: **structural scaffolding** and **statistical
> uniformity**. `scripts/detect_ai_signals.py` measures both; use it for a
> before/after diagnostic delta, NOT as the pass/fail oracle.

---

## A. Structural layer (pattern families, not vocabulary)

These are shapes. They can be present with a perfectly clean vocabulary.

### A1. Rule-of-three scaffolding / forced triads
Three parallel items where the argument does not contain exactly three. EN: "X, Y,
and Z" stacked across a paragraph; three mirrored subheads. ZH: 三个名词短语并列、
三层递进副标题。
**Fix:** drop one, convert one to a concrete example, or dissolve into prose.
Controlled asymmetry (academic-pack.md §4).
**Detector:** measured by the `rule_of_three` structural family (EN "X, Y, and/or
Z"; ZH 甲、乙、丙) — an authored heuristic; conservative on two-item lists, but it
may over-match a 4+ item list via its trailing three items, so read density, not a
single hit.

### A2. Signpost / connector overload
The paragraph is carried by discourse markers, not content. EN: First,/Second,/
Finally,; "on the one hand … on the other"; "In conclusion". ZH: 首先/其次/最后、
此外、综上所述、由此可见。
**Fix:** keep transitions that do real logical work (然而/因此/相比之下 / however,
therefore, by contrast); delete the ones that only announce sequence. If a
paragraph needs a numbered scaffold to cohere, the underlying logic is usually
missing — fix the logic, not the label.

### A3. Mechanical paragraph shape
Every paragraph is topic-sentence → three supports → restated wrap. The "tell" is
that the *shape* repeats regardless of the content's weight.
**Fix:** vary shape (academic-pack.md §3). Some paragraphs make one point; some
accumulate; not all need a thesis sentence.

### A4. Bold-label lists / report-template section shells
Markdown answer-format leaking into prose: `**2025年：** …`, `**Growth Driver
Analysis:** …`, stacked `**Label:**` bullets, emoji bullets.
**Fix:** in academic prose, prefer paragraphs. Keep headings that aid navigation;
do not render the whole document as "bold label + bullet".

### A5. Report-shell meta-sentences
Sentences that announce structure instead of doing the work: "This paper examines
…", "The following section discusses …", 本文拟……、下文将从……展开、研究背景与意义。
**Fix:** cut the announcement and start with the claim, method, or evidence.

### A6. Contrast / negative-parallelism frames (the #1 modern frame tell)
"not just X, but Y" / "It's not X. It's Y." / "less about X than Y" / 不是……而是……/
并非……而是……/ 这不仅是……更是……/ X 的本质是……/ 真正的 X 是……: deny a strawman,
then "reveal" an elevated restatement as insight. Post-2024 models lean on this
family hardest — as raw vocabulary tells decay with each model generation, this
frame (with A1–A3) carries more of the evidential weight than any word list.
**Fix (academic mode — mandatory, with a quota):** default to the direct claim —
delete the negated half, keep the actual assertion. **At most ONE surviving
contrast frame per document**, and only where the source genuinely argues both
sides (the denied position is a real, cited position, not a strawman). Over
quota = the rewrite is not done. Popsci: judge by density; an earned contrast is
craft, stacked contrasts are the tell.
**Detector:** the `negative_parallelism` family counts EN + ZH variants
(diagnostic; the quota check at Step 5 is yours, not the script's).

### A7. Over-dense section scaffolding
第一章/第二章 with dense 1.1/1.2/2.1 nesting; every subsection opening with 本节将……
**Fix:** keep necessary hierarchy; compress numbering and lead-ins. Argument order
matters; table-of-contents feel does not.

> Genre whitelist: poetry, speech, fiction dialogue, and rhetorical essays
> legitimately use triads, parallelism, and repetition. If the preflight detects
> these genres, **down-weight A1/A2/A6** — do not flatten them. (See SKILL.md
> preflight and lexical-zh.md §14.)

---

## B. Statistical / rhythmic layer (the most-missed signals)

Machine prose is statistically *too even*. Three measurable tells:

### B1. Low burstiness (uniform sentence length)
Human writing varies sentence length sharply; AI clusters around a mean.
**Measure:** `sentence_cv` = coefficient of variation = population_stdev / mean of
sentence token-lengths (`detect_ai_signals.py`). Higher CV = burstier = more
human. **A flat draft has a low `sentence_cv`; a good rewrite raises it** — because
real emphasis structure was added, not because noise was injected.

### B2. Uniform paragraph length
Every paragraph the same size is a template tell.
**Measure:** `paragraph_cv`, same statistic over paragraph token-lengths. Vary
paragraph length to follow argument weight.

### B3. Evenly-distributed hedging
AI sprinkles "may / appears / likely / 可能 / 或许" at a near-constant rate, as
texture rather than calibration. Human hedging clusters where the evidence is
genuinely uncertain and disappears where the claim is firm.
**Fix:** concentrate hedging on the genuinely uncertain claims; commit elsewhere
(academic-pack.md §1). Collapse *stacked* empty hedging ("could potentially
possibly") to a single calibrated hedge — but never delete a hedge that carries
real epistemic meaning.

---

## How to use the detector (diagnostic only)

```
python3 scripts/detect_ai_signals.py path/to/draft.md            # full 3-layer map
python3 scripts/detect_ai_signals.py path/to/draft.md --summary  # per-layer totals + CV
```

Read it as a **before/after delta**: lexical_total ↓, structural_total ↓,
`sentence_cv` / `paragraph_cv` ↑ after a good rewrite. **Do not** treat
"all counts == 0" as success — a robotic, uniform rewrite can have zero lexical
hits and still fail the blind judge. The detector diagnoses; the independent blind
judge (references/blind-judge-rubric.md) decides.
