# Changelog

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
