# English Patterns

> Authored heuristics, not a sourced/learned classifier. This is the **lexical
> SUBTRACT** catalogue for English. The structural and statistical layers live in
> `structural-statistical-signals.md`; the positive **ADD** target lives in
> `human-texture.md`. `scripts/detect_ai_signals.py` encodes a representative
> subset of these families as the EN lexical/structural regex layer (diagnostic
> only).

This skill keeps the original English humanizer logic, but applies it with an academic-register constraint.

## 1. Content inflation

Watch for language that turns ordinary facts into sweeping historical claims:

- pivotal, crucial, significant, enduring, evolving landscape
- serves as, stands as, marks a shift, sets the stage for
- broader movement, lasting impact, testament to

Default fix: replace evaluative uplift with the concrete fact, mechanism, or consequence.

## 2. Promotional tone

Watch for ad-copy phrasing:

- vibrant, rich, breathtaking, groundbreaking, renowned, seamless, intuitive, powerful
- commitment to, showcases, enhances, natural beauty, in the heart of

Default fix: move from praise to description. Keep discipline-specific evaluation only when the source supports it.

## 3. Superficial analytic padding

Watch for present-participle padding and fake depth:

- highlighting, underscoring, emphasizing, reflecting, symbolizing, ensuring, contributing to

Default fix: either state the factual relation directly or delete the empty explanatory tail.

## 4. Vague attribution

Watch for:

- experts argue
- observers note
- industry reports suggest
- several sources indicate

Default fix: replace with a named source or remove the attribution.

## 5. Template sections and empty outlook

Watch for stock "challenges and future prospects" framing and generic endings such as:

- despite these challenges
- future outlook
- exciting times ahead
- this represents a major step in the right direction

Default fix: replace with the next concrete step, limitation, or forecast if one is actually available.

## 6. AI-vocabulary clusters

High-frequency post-2023 AI vocabulary often appears in bunches:

- additionally
- align with
- crucial
- delve
- enhance
- fostering
- highlight
- intricate
- landscape
- pivotal
- showcase
- testament
- underscore
- vibrant

Default fix: simplify to plain academic prose. Do not flatten legitimate technical meanings.

## 7. Sentence-shape artifacts

Watch for:

- copula avoidance: serves as, stands as, boasts, features
- negative parallelisms: not just X, but Y
- forced triads and rule-of-three phrasing
- elegant variation that keeps cycling synonyms
- false "from X to Y" ranges

Default fix: prefer direct statements, fewer staged contrasts, and one precise term repeated when repetition is clearer.

## 8. Style residue

Watch for:

- em-dash overuse
- bolded inline headers in bullet lists
- report-shell headings such as "Research Background and Significance" or "Growth Driver Analysis"
- Title Case headings where sentence case fits better
- emojis
- curly quotes when the target style expects straight quotes

Default fix: normalize formatting to the target publication style.

## 9. Report boilerplate and meta-writing

Watch for:

- this paper examines
- this report analyzes
- the following section discusses
- background and significance
- main findings
- policy implications

Default fix: if the phrase merely announces structure, cut it and move straight to the claim, method, or evidence.

## 10. Chat residue and filler

Watch for:

- Of course!, Certainly!, Great question!
- I hope this helps
- let me know if you want more
- as of my last update
- based on available information
- in order to, due to the fact that, at this point in time

Default fix: delete assistant framing and compress filler.

## 11. Academic note

Keep legitimate scholarly hedging such as may, appears, suggests, likely, or consistent with when the evidence warrants it. Remove only stacked or empty hedging such as "could potentially possibly."

## 12. Beyond the word level

Scrubbing this vocabulary is necessary but not sufficient. After the lexical pass,
work the **structural** layer (rule-of-three, signpost overload, report-shell
meta-sentences, bold-label lists, balanced negative parallelism) and the
**statistical** layer (uniform sentence/paragraph length, evenly-distributed
hedging) per `structural-statistical-signals.md`, then **ADD** authorial stance,
source-grounded specificity, and deliberate burstiness per `human-texture.md`.
A draft with zero hits here can still read as machine prose.
