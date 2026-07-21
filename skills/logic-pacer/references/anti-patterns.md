# anti-patterns.md — the forbidden-move catalogue

Consult while trimming (concision-length) and at verify. A listed anti-pattern is
forbidden regardless of how natural it reads in context. Not loaded on the abstain path.

Exception: a connective that marks a REAL hinge is not spackle — that is hinge-only
judgment (transform E), not a denylist hit.

## 1. Vocabulary downgrade (对齐词汇) — the explicitly forbidden move
Substituting a lower-register synonym for a higher-register term the author chose. This
loses the professional register the user prizes; it is NOT "making it easier".

| BAD (downgrade) | why it's forbidden | GOOD |
|---|---|---|
| 杂音 → 噪音 | flattens the author's word | keep 杂音 |
| 分量 → 重要性 | generic paraphrase of a chosen term | keep 分量 |
| 翻转 → 变化/转变 | drains the vivid verb | keep 翻转 |
| 误差 → 错误 | changes the technical meaning | keep 误差 |
| 权力动作 → 权力行为 | dilutes a coined phrase | keep 权力动作 |
| 治理 → 管理 | governance ≠ management (concept + register) | keep 治理 |

A term may legitimately MOVE into an inserted step — that is not a downgrade; surface it
for author confirmation. `scripts/pace_checks.py` flags the swap only when the lower term
is NEW (absent from the source), so a word the author themself used is never penalised.

## 2. Hand-holding / condescension — the register killer
Talking down. The author's voice is peer-to-peer (classic style); hand-holding is its
opposite even when every step is small.

FORBIDDEN openers/interjections: 如你所知 · 如我们所知 · 众所周知 · 让我们一步步来 ·
别担心，我这就告诉你 · 你先记住就好 · 是不是一下子就懂了 · 你看，是不是很有意思 ·
简单来说（when nothing is being simplified） · 我们不妨 · 慢慢体会.

- BAD: 「好，现在让我们一步一步来，你千万别急。什么是钟形曲线呢？别担心，我这就慢慢告诉你。」
- GOOD: 「先看这条曲线在天文学里本来的意思。天文学家早就知道……」 — same slowing, no talking down.

## 3. Generic transition spackle — the padding that fakes slowness
Decorative 首先/其次/再次/最后/因此/于是/总而言之 sprinkled at sentence heads to *look*
methodical. Over-signposting violates 干练简洁 and fools a naive length/connective scorer
while the real leap survives (green-but-wrong).

- BAD: every sentence opens with 首先…／其次…／因此…／于是….
- GOOD: name the relation ONLY at the real pivot (一个 hinge per unfold, not per sentence).

## 4. Length balloon by keeping everything
Adding steps WITHOUT subtracting ornament. Net length jumps to 1.5x+; reads padded.

- BAD: unfold the leap AND keep all the original hedges, restatements, throat-clearing.
- GOOD: add the minimal chain, then strip hedges/redundancy so net growth <= ~1.3x.

## 5. Silent claim/stance softening — the highest-cost, script-invisible one
Paraphrasing a pivot into a weaker/inverted proposition while entities and count stay put.
No script catches this (same anchors, same length); only the model-level fidelity invariant
and the blind probe do.

- BAD: 「先有了这些数字，一个可被治理的社会才被看见」(constitutive) →
  「数字帮助我们理解社会」(descriptive) — Foucault's stance inverted, shipped silently.
- BAD: 误差(不想要的杂音) softened to a neutral 噪音 that no longer reads as *error*.
- GOOD: preserve the exact proposition; if the source genuinely entails a change, STOP and
  flag it to the author before shipping.

## 6. Reordering / restructuring which points appear
Front-loading the punchline or merging/moving claims. Out of scope — you unfold the JUMPS
between already-ordered points, you never change the sequence or the argument architecture.
