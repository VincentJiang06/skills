# Long-form Review 评测长文 (Step 7, mode b)

When the user asks for a 长文 / 详评 / 评测长文 / "full review" (or you judge a
deep writeup is wanted), render the evidence set as a **~4000字 (CJK characters)
long-form article** instead of the compact summary. It is a *rendering* — it adds
**no** new claim beyond the evidence set. Obey `rules/literary-rendering.md` (color
but never exceed); this rule adds the long-form structure + length discipline.

## Hard requirements
- **Language**: Chinese-primary (评测长文 is a 中文 genre); gloss key terms in
  English on first use (量感 / V-shape, 声场 / soundstage, SINAD…).
- **Length**: **3500–4500字** (target ~4000). Count CJK chars only.
- **Every section is anchored**: each paragraph's factual claims must already exist
  in the backing `evaluation.json` (a measured band, a consensus technicality, a
  prior). Prose paraphrases the profile; it does not invent.
- **Ships with the backing `evaluation.json`** — the audit trail. The long-form is
  accepted only if that JSON passes `scripts/validate_output.py`.
- **Ends with a 证据与置信度附录** (evidence & confidence appendix) listing the key
  claims with provenance (实测/共识/先验), confidence, and source ids.
- **Self-check**: run `python3 scripts/check_longform.py <review.md> --class <c>
  --backing <evaluation.json>` — must exit 0.

## Section structure & 字 budget

**Transducer** (use `assets/longform-template.md`):
1. 一、开篇与定位 — what it is, price tier, driver, family/lineage (~400字, priors)
2. 二、客观测量 — FR reading, rig+target, alignment, the 量感 vector (~700字, measured)
3. 三、三频解析 — 低频/中频/高频 each detailed against target (~900字, measured)
4. 四、风格与调音 — the 风格 label + why, who tuned it toward what (~400字, measured)
5. 五、技术力（评测共识）— 声场/结像/解析/动态/瞬态/音色, N/M agreement (~700字, consensus)
6. 六、搭配与驱动 — source pairing, drivability, fit/insertion caveats (~400字)
7. 七、适用人群与总结 — who it's for, honest verdict, gaps (~300字)
8. 八、证据与置信度附录 — claim → provenance/confidence/source table (~200字)

**Source gear** (DAC/amp/DAP):
1. 一、开篇与定位 (~400字) · 2. 二、客观测量 SINAD/THD/阻抗/功率 (~700字, measured) ·
3. 三、透明度与素质判定 (~700字, measured) · 4. 四、系统匹配 推力/阻尼/底噪 (~700字,
measured) · 5. 五、芯片与拓扑（先验）(~400字, prior) · 6. 六、适用场景与总结 (~400字) ·
7. 七、证据与置信度附录 (~200字).

## Discipline reminders
- Length is filled with **detail and evidence**, never with padding or invented
  superlatives. If you cannot reach ~4000字 honestly, the evidence is too thin —
  say so (raise the objectivity-downgrade banner) and write the longest *honest*
  article you can; do not inflate.
- Source gear: do not stretch a transparent verdict into flowery sound description.
  The长文 length comes from measurement detail + system-matching scenarios, not
  imagined tonality.
- Conflicts/dissent get their own sentences, with counts — never smoothed away.
