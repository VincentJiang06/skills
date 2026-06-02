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
narrow peak. Choose the target by category: `harman_ie_2019`/`ief_neutral` for
IEM/TWS, `harman_oe_2018` for headphones.
