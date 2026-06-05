# Output template — required long-form section skeleton

The review is 10,000–15,000 中文字符 (CJK 汉字 only). The section linter in
`scripts/check_review.py` requires the headers below (it greps for keyword groups,
so wording can vary as long as one keyword per group appears).

## standard class (pop/rock/jazz/electronic/soundtrack/world/…)

1. **开篇与定位** — thesis + where this album sits.
2. **艺术家与背景** — the credit(s) and their arc.
3. **创作与录制源起** — genesis, sessions, production circumstances.
4. **逐曲分析** (or 逐碟/逐乐章 per release form) — the music itself.
5. **制作编曲与声音** — production, arrangement, mix, sound.
6. **历史文化与批评语境** — context + reception.
7. **横向比较与参考录音** — siblings / comparisons.
8. **总评与适配** — reasoned verdict + who it's for.
9. **证据附录** — sources, mirroring the backing JSON's evidence.

## classical class (validate with `--class classical`)

Adds an explicit WORK vs PERFORMANCE split and a reference-recording section:

1. **开篇与定位**
2. **作曲家与作品背景**
3. **创作与录制源起**
4. **作品本体分析** — the WORK: form, total architecture, harmonic argument.
5. **演绎与演奏诠释** — the PERFORMANCE: tempo, phrasing, balance, conductor/soloist.
6. **制作与声音** — recorded sound.
7. **历史文化与批评语境**
8. **参考录音与版本比较** — reference recordings / 版本比较.
9. **总评与适配**
10. **证据附录**

## Length discipline

Counted on 汉字 only — Latin/digits/punctuation are free but do not move the count.
Reach the floor with real critical content, never padding or fabrication. If a thin
album cannot honestly sustain 10,000 汉字, say so explicitly (资料不足) rather than
inventing specifics; degrade the target with a stated reason in the report.
