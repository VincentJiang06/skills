# Changelog

## 0.4.1 — 2026-06-02
- Updated `vince_iem_ref` to Vince's revised recipe: **JM-1 − 1 dB/oct tilt + 4 dB
  bass** (steeper tilt than the prior − 0.6, so warmer/darker: more bass, less
  treble). Vince characterizes it as "similar to the Crinacle reference but ~1 dB
  less bass." Re-froze the inference golden.

## 0.4.0 — 2026-06-02 (multi-target + rig-aware inference)
- Targets are now **rig-tagged** (iec711 / gras_43ag / bk5128) + confidence. Added
  **JM-1**, **B&K 5128 DF/FF**, **Harman OE 2013**, and **`vince_iem_ref`** (Vince's
  personal IEM reference = JM-1 − 0.6 dB/oct + 4 dB bass shelf, with documented
  `_construction`).
- New **`scripts/infer_target.py`**: ranks SAME-RIG targets by RMS fit to guess which
  target a device was tuned toward ("looks tuned toward JM-1"). Rig-aware — a 5128
  curve is never matched against 711 targets (the same curve infers JM-1 on 5128 vs
  Diffuse Field on 711, proving rig choice matters).
- Rules: rig-matched target selection; `vince_iem_ref` reported for Vince's IEM
  reviews. Bibliography records the rigs, the 711↔5128 delta, and the OE 2013-vs-2018
  correction (2018 has *more* bass, not less).
- `run_all` gains a target-inference layer; GREEN.

## 0.3.0 — 2026-06-02 (accuracy & depth)
- `fr_analyze` now emits a **`features[]`** peak/dip pass (log-f smoothed baseline →
  residual extrema → hz/db/type + perceptual hint) that catches sharp peaks/dips the
  band quanta average away — e.g. an 8 kHz sibilance spike on a band-"neutral" curve.
- Added a continuous **`tilt`** (mean treble dev − mean bass dev) + low/high
  extension: grades *how* warm/bright within a label (a V-shape reads `even`).
- New **`scripts/compare.py`** deterministic comparison engine: per-band quanta/dev
  deltas, tilt delta, who-has-more-where, and a cross-rig/cross-measurer guard.
- **Validated `targets.json`** against authoritative raw target curves (squig.link
  mirrors, cross-checked vs Olive/Harman + Crinacle). Corrected the treble bands (the
  3–6 kHz ear-gain region was badly understated by the seed values), materially
  improving how real devices read; rebuilt synthetic fixtures (continuous baseline).
- `run_all` gains a compare layer + the dense `peaky` fixture; GREEN.

## 0.2.0 — 2026-06-02
- Add **long-form 评测长文** output mode (~4000字, Chinese-primary, traceability
  appendix + backing `evaluation.json`). New `rules/longform-review.md`,
  `assets/longform-template.md`, `scripts/check_longform.py`; `run_all.py` gains a
  long-form layer (字 count 3500–4500 + required sections + backing gate).
- Hardened `technicalities-from-reviews.md` + `longform-review.md` with a
  **no-provenance-inflation** guardrail (a consensus technicality is never described
  as 测量背书, even when the source also publishes measurements).
- Live eval: a subagent independently generated a 4487字 long-form that passed the
  length/structure/traceability checks; an adversarial over-claim judge confirmed
  discipline and surfaced the inflation slip that drove the hardening above.

## 0.1.0 — 2026-06-02
- Initial release. Two-track objective evaluation: transducer (IEM/headphone/TWS)
  量感/风格 from FR-vs-target, and source gear (DAC/amp/DAP) measured competence +
  system matching. Mandatory data-cleaning stage. Style-profiled media roster (2–3
  sentence per-source `style_profile`, orientation judged dynamically — **no faction
  enum**). Bilingual (中文 + English) output. Evidence-traceability gate
  (`validate_output.py`). Regression runner (L0 schema + L1 golden + determinism +
  output gate + token budget) is GREEN.
