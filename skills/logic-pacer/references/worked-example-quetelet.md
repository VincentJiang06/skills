# worked-example-quetelet.md — the canonical before/after (calibration anchor)

A full unfold of the canonical statistics-normal / Quetelet passage. Read it when you
want a concrete model of a complete unfold, not the abstract moves. This is the day-one
eval instance and the probe's positive anchor.

The specific propositions here are the Quetelet node's — this is a calibration anchor, NOT
a template to paste. The before/after quoted inline below is authoritative and
self-contained. (The dev harness also keeps them as raw fixtures under `evals/`, which is
NOT shipped with the installed skill.) Objective gates on the after, with the Quetelet
`--terms` list supplied: `length ratio 1.267x · dropped names/nums none · downgrades none`.

---

## Paragraph 1 — the reveal needs its mechanism (transform F + B)

BEFORE: 「…正常人这个念头，其实是十九世纪被统计学造出来的。在那之前，人们没有平均身高、平均寿命、平均犯罪率这套想法，也就没有一个可以拿来衡量你偏离得有多远的「正常」。」

The reveal (「被统计学造出来的」) fires, then jumps straight to "before that, no averages" —
the reader must supply the missing link *why no averages means no 'normal'*.

AFTER inserts that one link (setup-before-twist, minimal): 「…其实是十九世纪被统计学造出来的。
这话怎么讲？一条「正常」线要能成立，先得有一把尺子——一个平均值，好让你量出自己偏离了多远。而十九世纪之前，人们并没有平均身高、平均寿命、平均犯罪率这套想法；没有这些平均值，那条用来衡量偏离的「正常」线也就无从谈起。」

- Given-new chain: 造出来的 → (需要)尺子/平均值 → 没有平均值 → 没有「正常」线.
- One hinge only ("这话怎么讲？"), at the real pivot — not per sentence.
- Vocabulary untouched; ornament not added.

## Paragraph 2 — unfold the constitutive claim WITHOUT softening it (C + fidelity)

BEFORE: 「…国家要治理一样新东西，叫人口。Foucault 讲过，一个国家没法直接看见几千万个具体的人，它只能通过统计去看…不是先有一个清清楚楚的社会等着人去清点，而是先有了这些数字，一个可被治理的社会才被看见。」

The jump 治理人口 → 只能通过统计看 → 社会是被数字构成的 is three moves; and the pivot claim
is the fidelity-critical one (constitutive, NOT descriptive).

AFTER inserts the "why can't the state see it directly" step and keeps the constitutive
claim verbatim: 「…而是因为国家要治理一样新东西，叫人口。可人口这东西，国家没法直接看见——它面对的是几千万个具体的人，多到没有哪个官员能一个个看过来。Foucault 讲过，国家于是只能换一种看法：通过统计去看。…关键在次序：不是先有一个清清楚楚的社会等着人去清点，而是先有了这些数字，一个可被治理的社会才被看见。」

- The constitutive proposition 「先有了这些数字，一个可被治理的社会才被看见」 is preserved word
  for word. It is NOT paraphrased into 「数字帮助我们理解社会」 (that is the silent inversion the
  fidelity invariant forbids — see anti-patterns §5).
- Given-new: 治理人口 → (人口)看不见 → 换一种看法(统计) → 数字摆出 → 社会被看见.
- 权力动作, 治理, 印刷数字的雪崩 all survive.

## Paragraph 3 — the load-bearing 3-in-1 (A + B + C)

BEFORE: 「…那么正中央那个值就该是某种真东西，他给它起名叫平均人。这一步的分量在于一个悄悄的翻转：钟形曲线原本描述的是误差，是我们不想要的杂音；到了 Quetelet 手里，正中央的平均人成了理想、成了标准…」

The 3-in-1: 真值语义（星星） → 迁移到人 → 误差曲线的中心变成理想. The word 真值 is used as a
premise the moment it appears; the semantic transfer is never named.

AFTER unfolds the minimal chain, anchoring each step on the prior new element: 「…先看这条曲线在天文学里本来的意思。天文学家早就知道，同一颗星星量很多次，结果会散成一个中间高、两头低的钟形，真值在正中央，两边是误差。这里的真值有个很实在的含义：它就是那颗星星最可能的真实位置，一个客观事实。Quetelet 发现，人的身高、体重也散成同样的钟形。他顺手保留了天文学那个语义——既然正中央在星星那里代表真值，那么人这条曲线的正中央，也该是某种真东西，他给它起名叫平均人。这一步的分量，在于一个悄悄的翻转。原本，钟形曲线描述的是误差，是我们不想要的杂音；到了 Quetelet 手里，正中央的平均人成了理想、成了标准，两边的偏离反而成了需要解释、甚至需要矫正的东西。换句话说，星星的真值是客观位置，人的真值却被他理解成了理想。…」

- Given-new chain: 真值(在正中央) → 真值=客观事实 → (人也散成钟形) → 保留语义 → 平均人 →
  翻转 → 客观位置 vs 理想.
- The semantic transfer that was swallowed is now its own named step ("他顺手保留了天文学那个语义").
- 分量, 翻转, 杂音, 误差, 理想, 标准, 矫正, 平均人, 驯服偶然 all survive — zero downgrade.
- Net paragraph growth is the bulk of the 1.267x; every added char is a real inferential step,
  no spackle.

## What a reader should feel
Same voice, same words, same claims, same order — but each jump now lands on ground the
previous sentence just handed them. That is 跳得稳, achieved by re-anchoring, not by padding.
