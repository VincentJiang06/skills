# Human Texture — the positive ADD target

> Authored heuristics (not a sourced classifier). This is the **ADD** half of the
> protocol. Subtracting AI signals is necessary but not sufficient: a draft can be
> scrubbed of every denylist word and still read like a machine — uniform, stance-
> less, abstract. The blind judge will still flag it. This file defines what to add
> back, and the **hard rule: add texture only from material already in the source.
> Never invent a fact, number, citation, quotation, mechanism, or case to "add
> specificity." That is the headline failure mode.**

Texture has four pillars. Apply them to academic prose; they raise human-ness
*without lowering register*.

---

## 1. Authorial stance (committed claim + calibrated confidence)

AI prose hovers: it lists considerations and lets every hand stay on the table.
Human scholars commit — then calibrate the commitment with epistemic markers that
match the evidence.

- Surface the claim the source is already making and state it as a claim, not a
  survey of possibilities.
- Calibrate, don't inflate or hollow out: `the evidence indicates`, `this
  suggests`, `on balance`, `more plausibly`, `I read this as`, `证据表明`,
  `更可能的解释是`, `据此判断`. Calibration is NOT casualness — it is precision
  about how strongly the claim is held.
- Preserve genuine hedging (see academic-register.md). Stance ≠ false certainty.

**EN — before (stance-less):**
> There are several factors that may influence Hong Kong's growth. International
> finance is one consideration. Innovation policy is another. Tourism also plays a
> role.

**EN — after (committed + calibrated, same facts):**
> On the official and IMF evidence, finance — not tourism or property — is the
> pillar most likely to carry the next five years; innovation policy could broaden
> the base, but only if it moves beyond announcements.

**ZH — before:**
> 香港经济的未来发展受到多方面因素影响。国际金融是其中之一，创新科技也值得关注，旅游业同样发挥着作用。

**ZH — after:**
> 据官方与 IMF 的数据判断，真正能支撑未来五年的是金融，而非旅游或地产；创新科技或可拓宽增长面，但前提是落到研发与就业，而不止于政策宣示。

---

## 2. Source-grounded specificity (the number/case/mechanism already present)

AI prose defaults to the abstract noun ("various measures", "significant
progress"). Humans name the specific thing — **when the source contains it.**

- Replace an abstract summary with the concrete figure, named entity, dated event,
  or causal mechanism that already appears earlier or later in the same source.
- If the source does NOT contain a specific, do **not** manufacture one. Keep the
  claim general and, if useful, name the gap ("the source does not quantify this").

**EN — before (abstract):**
> The financial sector showed strong performance and reclaimed its leading role.

**EN — after (specifics lifted from the same source):**
> Hong Kong reclaimed the top global IPO market in 2025 with roughly HK$286
> billion raised, while bank deposits passed HK$19 trillion.

**ZH — before:**
> 旅游业实现了显著恢复。

**ZH — after:**
> 访港旅客从 2021 年约 9.1 万人次回升到 2025 年的 4990 万人次——量已恢复，但人均消费与停留天数同期双双下降。

> Both "after" examples only re-use figures the source already stated. That is the
> line. Specificity is **retrieval from the source**, never generation.

---

## 3. Syntactic + paragraph burstiness (deliberate length variance)

AI prose is rhythmically flat: sentences cluster around one length, paragraphs are
the same shape (topic sentence → three supports → wrap). Humans vary. A short,
blunt sentence after a long one carries emphasis the flat version cannot.

- Mix sentence lengths on purpose. Let one clause-heavy sentence be followed by a
  four-word one. The detector's `sentence_cv` should rise after a good rewrite.
- Vary paragraph shape: not every paragraph needs a thesis-then-three-supports
  skeleton. Some make one point. Some accumulate. (`paragraph_cv` rises too.)
- This is a *diagnostic*, not a target to game: raising CV by inserting noise is
  not the goal — raising it because the prose now has real emphasis structure is.

**EN — before (uniform, ~18 words each):**
> The recovery in 2023 was uneven across the major sectors of the economy. The
> services sector rebounded quickly while the goods sector remained relatively
> soft. The labour market improved although it did not return to full strength.

**EN — after (varied):**
> The 2023 recovery was uneven. Services rebounded fast — private consumption rose
> 7.4% — while goods exports stayed soft in real terms, and the labour market,
> though improving, never reached full strength.

---

## 4. Controlled asymmetry (break the machine's symmetry)

AI prose is suspiciously balanced: every list is three items, every "on the one
hand" gets an "on the other", every section mirrors the last. Real argument is
asymmetric — it spends more words where the point is harder.

- Not every list is three. Make it two, or four, or prose.
- Drop the reflexive counter-balance when the source does not actually weigh both
  sides equally.
- Let the structure follow the argument's weight, not a template.

**EN — before (forced triad + mirror):**
> The strategy has three pillars: finance, innovation, and tourism. On the one
> hand, it offers opportunity. On the other hand, it carries risk.

**EN — after (asymmetric, weight on the real point):**
> Finance does most of the work here; innovation and tourism matter mainly insofar
> as they broaden a base that is still narrow. The risk is concentration, not the
> absence of opportunity.

---

## ADD checklist (run after SUBTRACT, before final register re-check)

- [ ] Is there at least one **committed, calibrated** claim per major section?
- [ ] Did I replace ≥1 abstract summary with a **source-present** specific — and
      add **zero** new facts/numbers/citations?
- [ ] Did sentence/paragraph length **vary on purpose** (and does `sentence_cv`
      rise vs. the input, as a diagnostic)?
- [ ] Did I break at least one **forced symmetry** (triad / mirror) where the
      argument does not earn it?
- [ ] Did register stay academic (cross-check academic-register.md)? No slang, no
      banter, no fake imperfections introduced in the name of "texture".
