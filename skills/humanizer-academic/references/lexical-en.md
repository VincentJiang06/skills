# English Patterns

> Authored heuristics, not a sourced/learned classifier. This is the **lexical
> SUBTRACT** catalogue for English. The structural and statistical layers live in
> `structural-signals.md`; the positive **ADD** target lives in
> `academic-pack.md`. `scripts/detect_ai_signals.py` encodes a representative
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

## 3. Superficial analytic padding (participial tack-ons)

Watch for present-participle padding and fake depth — especially the clause-final
"-ing" tail that restates the main clause's importance while adding **no new
propositional content** ("…, highlighting the importance of robust evaluation",
"…, underscoring the need for further research"):

- highlighting, underscoring, emphasizing, reflecting, symbolizing, ensuring,
  contributing to, fostering, showcasing, demonstrating the value of

One per paragraph can be legitimate syntax; stacked at clause ends across a
passage it is among the strongest current frame tells (raw-vocabulary tells decay
with each model generation; frames like this and §7b now carry the weight).

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

- additionally, align with, crucial, delve, enhance / enhancing, fostering,
  highlight, intricate, landscape, pivotal, showcase / showcasing, testament,
  underscore, vibrant
- (corpus-measured excess in academic abstracts, Kobak et al. 2025:) notably,
  comprehensive, insights, exhibited, multifaceted, nuanced, realm, poised,
  burgeoning, garnered, elucidate, harness, leverage, seamless, streamline,
  meticulous(ly), noteworthy, imperative, akin, amidst

Near-certain phrase tells (measured 4,000–31,000× over-represented in AI text):
"serves as a testament", "vibrant/rich tapestry", "in the ever-evolving
landscape of", "provides valuable insights into", "the complex interplay
of/between", "no discussion would be complete without".

**Era note:** each model generation sheds the most notorious words (delve is
already fading), so treat this list as decaying evidence. Single words are weak;
density and co-occurrence matter; and the frame-level tells (§3 participial
tack-ons, §7b contrast frames, structural layer) age far better than any word
list. Also: many of these are normal, well-taught academic English — especially
for non-native writers (detectors flag real ESL prose at several times the
native-speaker rate). Never rewrite on word-presence alone.

Default fix: simplify to plain academic prose. Do not flatten legitimate technical meanings.

## 7. Sentence-shape artifacts

Watch for:

- copula avoidance: serves as, stands as, boasts, features
- forced triads and rule-of-three phrasing
- elegant variation that keeps cycling synonyms
- false "from X to Y" ranges

Default fix: prefer direct statements, fewer staged contrasts, and one precise term repeated when repetition is clearer.

## 7b. Contrast / negative-parallelism frames (academic mode: compress by default)

The single most characteristic post-2024 LLM move: deny a strawman, then
"reveal" an elevated restatement as insight. One frame family:

- "not just X, but Y" / "not only X but also Y" / "not merely X, but Y"
- "It's not X. It's Y." / "It's not about X — it's about Y." (period- or
  dash-separated variants included)
- "less about X than about Y" / "X isn't the point; Y is"
- "This is not a story of X, but of Y" / "The real X is Y" / "What X really
  reveals is Y"

**Academic-mode default (mandatory, not advisory): rewrite to the direct
claim** — drop the negated half unless the source genuinely argues both sides
(the denied position is a real, cited position, not a strawman). **Quota: at
most ONE surviving contrast frame per document**; more than one means the
rewrite is not done. In popsci, judge by density — an occasional earned
contrast is legitimate craft, but never stacked.

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

## 10a. Over-claiming, novelty padding, and speculative gap-filling (academic mode)

**Verb–evidence mismatch.** AI drafts inflate claim verbs beyond what the text's
own evidence carries: "demonstrates / proves / establishes / confirms /
guarantees" hung on a correlation, a single study, or no data at all. Rule: **no
verb stronger than its evidence — and fix only downward.** Weaken an unsupported
"proves" to "suggests / is consistent with"; NEVER strengthen a hedged claim to
sound confident (that manufactures over-claiming, the same crime in reverse).

**Novelty and effort padding:** "novel", "to the best of our knowledge", "for
the first time", "extensive/comprehensive experiments", "a wide range of",
"paves the way for", "sheds light on", "bridges the gap" — keep only where the
source substantiates the claim; otherwise cut the padding, keep the content.

**Formulaic openers:** "In recent years, X has attracted increasing attention" /
"With the rapid development of X" — start with the problem or claim instead.

**Speculative gap-filling:** a sentence that reports missing information and then
invents an interpretation to cover it ("little is known about X, suggesting that
researchers have overlooked…"). Say what isn't known, or cut it — never dress a
guess as a finding.

## 10b. Mechanical citation shells (academic mode)

AI hangs citations on the prose instead of arguing with them. Watch for:

- "According to research, …" / "According to Smith (2020), …" opening every claim
- "Studies have shown … (Smith 2020; Jones 2021)" — findings asserted generically,
  citations dumped as a parenthetical tail on sentence after sentence
- "Smith (2020) discusses/explores/examines X" — a contentless verb that reports
  that the work exists without stating what it claims
- every sentence in a lit-review paragraph carrying exactly one end-parenthetical

Default fix — **rearrangement only, zero new citations** (see academic-pack.md):
make the EXISTING cited scholars agents of their own claims ("Putnam (2000)
argues trust forms…"), state the specific finding the source text already
attributes to them, or engage the cited claim ("Smith's (2020) claim, while
influential, rests on…" — only if the source text itself contains that
assessment). If the source gives you nothing beyond "Smith (2020) discusses X",
keep it — never invent what Smith said. A missing citation is never added; a
present citation is never dropped.

## 11. Academic note

Keep legitimate scholarly hedging such as may, appears, suggests, likely, or consistent with when the evidence warrants it. Remove only stacked or empty hedging such as "could potentially possibly."

## 12. Beyond the word level

Scrubbing this vocabulary is necessary but not sufficient. After the lexical pass,
work the **structural** layer (rule-of-three, signpost overload, report-shell
meta-sentences, bold-label lists, balanced negative parallelism) and the
**statistical** layer (uniform sentence/paragraph length, evenly-distributed
hedging) per `structural-signals.md`, then **ADD** authorial stance,
source-grounded specificity, and deliberate burstiness per `academic-pack.md`.
A draft with zero hits here can still read as machine prose.
