# Changelog

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
