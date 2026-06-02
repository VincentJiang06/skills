# Changelog

## 0.1.0 — 2026-06-02
- Initial release. Two-track objective evaluation: transducer (IEM/headphone/TWS)
  量感/风格 from FR-vs-target, and source gear (DAC/amp/DAP) measured competence +
  system matching. Mandatory data-cleaning stage. Style-profiled media roster (2–3
  sentence per-source `style_profile`, orientation judged dynamically — **no faction
  enum**). Bilingual (中文 + English) output. Evidence-traceability gate
  (`validate_output.py`). Regression runner (L0 schema + L1 golden + determinism +
  output gate + token budget) is GREEN.
