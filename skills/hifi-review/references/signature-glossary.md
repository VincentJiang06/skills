# Signature & Source Glossary (中英 / bilingual)

Single source of vocabulary for the skill. Keep terms here in lockstep with
`band-taxonomy.json` and `scripts/fr_analyze.py`. Literary phrasing draws from
here so wording stays consistent and accurate.

---

## 1. Source orientation — writing a `style_profile`

A `style_profile` in `source-registry.json` is a **2–3 sentence neutral
description of a source's *methodology*** — does it measure? what does it lean
toward? how should its claims be weighted? It is **not** a faction label and
**not** an insult.

There is **no fixed faction enum** (a crude 科fi/hufi/mixed bucket is *worse than
none*). Instead:

- **Judge orientation dynamically at search time.** The registry profile is a
  *prior*. When you actually read a source on the target device, re-judge from
  the content in front of you: does *this* review cite measurements, or is it
  pure impression?
- **Weight by what a claim is, not who said it.** A measurement-backed claim is
  high-trust regardless of source. A pure-impression claim is subjective even
  from a measurement-heavy source.
- **Bias-correct, don't discard.** If a source leans warm-preference or
  enthusiasm, down-weight and note the lean — never delete its dissent.

Useful `lean_tags` (free, non-exhaustive): `measurement-led`, `objectivist`,
`measurement-anchored`, `trained-subjective`, `impression-led`, `warm-tolerant`,
`harman-aligned`, `consumer-focused`, `anti-marketing`, `promo-risk`.

---

## 2. 量感 — per-band quantity (mirrors `band-taxonomy.json`)

| band id | Hz | 中文 | English | 感知 / perception |
|---|---|---|---|---|
| `sub_bass` | 20–60 | 极低频 | sub-bass | 下潜/震撼 · rumble/slam |
| `mid_bass` | 60–200 | 中低频 | mid-bass | 力度/温暖 · punch/warmth |
| `lower_mids` | 200–500 | 下中频 | lower-mids | 厚度/浑浊 · body/mud |
| `center_mids` | 500–1k | 中频 | center-mids | 人声主体 · vocal body |
| `upper_mids` | 1k–3k | 上中频 | upper-mids | 人声前倾/喊 · presence/shout |
| `lower_treble` | 3k–6k | 低高频 | lower-treble | 清晰/齿音 · clarity/sibilance |
| `mid_treble` | 6k–10k | 中高频 | mid-treble | 细节/刺耳 · detail/harshness |
| `air` | 10k–20k | 极高频 | air | 空气感/亮泽 · air/sparkle |

**量感 scale** (`quanta`, −3…+3): −3 大幅不足 / −2 偏少 / −1 略少 / 0 中性 /
+1 略多 / +2 偏多 / +3 过量. Thresholds (|dev_db| vs target): ≤1.5→0, ≤4→±1,
≤7→±2, >7→±3.

---

## 3. 风格 labels (must match `fr_analyze.py:signature()`)

| label 中文 / English | band rule |
|---|---|
| 低频猛 / bass-heavy | a bass band quanta ≥ +2 **and** treble section ≤ 0 |
| V 形 / V-shape | bass ≥ +1 **and** treble ≥ +1 **and** mids ≤ +0.5 |
| 暖声 / warm | bass ≥ +1 **and** treble ≤ −0.5 |
| 明亮 / bright | treble ≥ +1 **and** bass ≤ 0 |
| 中频前倾 / mid-forward | upper_mids ≥ +1 **and** bass ≤ 0 |
| 暗声 / dark | treble ≤ −1 |
| 均衡 / neutral | every section within ±1 |
| 混合 / mixed | none of the above dominates |

(bass = avg of sub_bass+mid_bass; mids = avg of lower/center/upper mids;
treble = avg of lower_treble+mid_treble+air.) The engine is **band-resolution**;
sharp narrow peaks/dips are reported separately as flagged features, not folded
into 量感.

---

## 4. Technicalities — **review-only** (never tagged `measured`)

These are *not* reliably derivable from FR. They come from review **consensus**,
style-weighted, with an N/M agreement count.

| 中文 | English | neutral definition |
|---|---|---|
| 声场 | soundstage | perceived spatial size/width of the presentation |
| 结像 | imaging | precision/locatability of instruments in that space |
| 解析 | resolution / detail | retrieval of fine low-level detail and texture |
| 动态 | dynamics | ability to swing soft→loud convincingly |
| 瞬态 | transient / speed | attack & decay sharpness of notes |
| 音色 | timbre | naturalness of tonal color (e.g., BA/planar timbre) |
| 齿音 | sibilance | harsh "s/sh" emphasis (often a `lower_treble` peak) |
| 染色 | coloration | audible deviation from neutral, "flavor" |

---

## 5. Normalization map (free-text descriptor → canonical attribute)

Apply during data-cleaning (Step 4) so heterogeneous wording collapses to one
attribute that carries provenance.

| descriptor (中 / EN) | canonical attribute |
|---|---|
| 厚 / warm / lush lower-mids | `lower_mids_elevated` |
| 暖 / warm / 温暖 | `bass_or_lowermids_elevated` |
| 薄 / thin / lean | `lower_mids_reduced` |
| 轰头 / boomy / bloated bass | `mid_bass_elevated` |
| 下潜深 / deep sub-bass / rumble | `sub_bass_elevated` |
| 低频少 / bass-light / anemic | `bass_reduced` |
| 齿音 / sibilant / piercing 6–8k | `lower_treble_peak` |
| 刺 / harsh / shouty | `upper_mids_or_lowertreble_elevated` |
| 暗 / dark / rolled-off treble | `treble_reduced` |
| 糊 / veiled / smeared | `treble_reduced` + `resolution_low` |
| 亮 / bright / crisp | `treble_elevated` |
| 空气感 / airy / sparkly | `air_elevated` |
| 人声前倾 / forward vocals | `upper_mids_elevated` |
| 人声靠后 / recessed vocals | `upper_mids_reduced` |
| 声场大 / wide / spacious | `soundstage_high` (consensus) |
| 解析高 / detailed / resolving | `resolution_high` (consensus) |
| 结像准 / pinpoint imaging | `imaging_high` (consensus) |
| 染色重 / colored / euphonic | `coloration_high` (consensus) |

(Extend as new wording appears; keep canonical attributes aligned with band ids
and the technicality set above.)
