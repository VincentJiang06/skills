# Tonal Mapping (Step 5 — transducer)

How `scripts/fr_analyze.py` turns FR into 量感 + 风格. Keep this in **lockstep**
with the script and `references/band-taxonomy.json` / `references/targets.json`.

## Bands (8) — from `band-taxonomy.json`
sub_bass 20–60 · mid_bass 60–200 · lower_mids 200–500 · center_mids 500–1k ·
upper_mids 1k–3k · lower_treble 3k–6k · mid_treble 6k–10k · air 10k–20k (Hz).

## Pipeline
1. Parse FR (freq, dB). Band-average each band.
2. **Align**: shift the whole curve so its `center_mids` average equals the
   target's `center_mids` level (anchor). This removes loudness offset.
3. **Deviation** per band: `dev_db = (band_avg + offset) − target_band_level`.
4. **量感 quanta** from `|dev_db|` (thresholds in `targets.json`):
   ≤1.5 → 0 (中性) · ≤4 → ±1 (略) · ≤7 → ±2 (偏) · >7 → ±3 (大幅). Sign = direction.

## 风格 labels (must equal `fr_analyze.py:signature()`)
Let bass = avg(sub,mid_bass) quanta; mids = avg(lower,center,upper mids);
treble = avg(lower_treble,mid_treble,air). Evaluate **in order**, first match wins:

1. **低频猛 / bass-heavy** — a bass band quanta ≥ +2 AND treble ≤ 0
2. **V 形 / V-shape** — bass ≥ +1 AND treble ≥ +1 AND mids ≤ +0.5
3. **暖声 / warm** — bass ≥ +1 AND treble ≤ −0.5
4. **明亮 / bright** — treble ≥ +1 AND bass ≤ 0
5. **中频前倾 / mid-forward** — upper_mids ≥ +1 AND bass ≤ 0
6. **暗声 / dark** — treble ≤ −1
7. **均衡 / neutral** — every section within ±1
8. **混合 / mixed** — none dominates

## Spectral tilt (continuous nuance) — the `tilt` object
Alongside the discrete 风格 label, the engine emits **`tilt`**: `tilt_db` = mean
treble dev − mean bass dev (≤ −2 → 暖向/warm-tilted, ≥ +2 → 亮向/bright-tilted,
else 中性倾斜/even), plus `low_extension_db` (sub-bass) and `high_extension_db`
(air). Tilt disambiguates what the label can't: a **V-shape** has elevated bass
*and* treble, so its tilt is ≈ **even** — "balanced emphasis at both ends", not
"warm". Use `tilt_db` to grade *how* warm/bright a device is within its label, and
the two extension figures to describe low/high reach.

## Sharp features (peaks/dips) — the `features` array
The band quanta are **band-resolution** (they average within a band), so they can
miss a sharp narrow peak/dip. The engine therefore ALSO runs a peak/dip pass and
emits a **`features[]`** array: each entry is a local deviation from the
log-frequency-smoothed trend exceeding the prominence threshold
(`targets.peak_detection.min_prominence_db`), reported as `hz`, `residual_db`,
`type` (peak/dip), and a perceptual `hint` — e.g. **5–9 kHz peak → 齿音/sibilance**,
3–5 kHz peak → 咬字突出/presence-bite, 9–12 kHz peak → 刺耳/treble-glare, a treble
dip → 齿音抑制/de-essed.

**Always surface `features`** in the writeup: a curve can read "均衡/neutral" by
bands yet hide an 8 kHz sibilance spike — the `features` array is exactly where that
shows up. Rule of thumb: band quanta = *how much* energy per region; features =
*sharp character* (sibilance, glare, resonance dips) that量感 averages away. Never
let a narrow artifact masquerade as broad 量感, and never let broad 量感 hide a
narrow peak.

## Target & rig selection
Targets in `references/targets.json` are **rig-specific** (`rig`: iec711 / gras_43ag
/ bk5128). **Feed the engine a target measured on the SAME rig as the device curve**
— 711 and 5128 are not interchangeable (5128 reads ~+6 dB hotter at 8 kHz and lacks
the 711's 10–14 kHz dip). Defaults by rig + category: 711 IEM → `harman_ie_2019` or
`ief_neutral`; GRAS headphone → `harman_oe_2018` (or `harman_oe_2013`); **5128 IEM →
`jm1` / `bk5128_df`**. For **Vince's IEM reviews, ALSO report against `vince_iem_ref`**
(his personal 5128 reference: JM-1 −0.6 dB/oct +4 dB bass). When the rig/intended
target is unclear, run `python3 scripts/infer_target.py <fr> --rig <rig>` — it ranks
same-rig targets by RMS fit and guesses which one the device was tuned toward.
