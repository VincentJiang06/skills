# 2-vince-hifi-review

A Claude Code skill that produces **objective, source-traceable** evaluations of
HiFi gear by searching all sources (measurements, media reviews, specs/family),
cleaning them, and rendering a **bilingual (中文 + English)** verdict where every
claim traces back to evidence. **Accuracy ≫ speed.**

Two device classes, two objective models:
- **Transducer** (IEM / headphone / TWS) → **量感** (per-band quantity) + **风格**
  (signature) from frequency-response-vs-target; technicalities from review
  consensus only.
- **Source gear** (DAC / amp / DAP) → measured competence (SINAD / THD / output-Z /
  power) + system matching + chip/topology; a competent source is audibly transparent.

Sources are weighted via a **style-profiled media roster** — each source carries a
2–3 sentence `style_profile`; orientation (measurement-led ↔ impression-led) is
judged **dynamically at search time**, not via fixed faction buckets.

## Protocol (8 steps)
scope & classify → identify → gather (live) → **clean & normalize** → measure &
quantize → corroborate → synthesize (bilingual) → self-verify. See `SKILL.md`.

## Scripts
```bash
python3 scripts/fr_analyze.py <fr.csv> --target harman_ie_2019      # transducer engine
python3 scripts/source_analyze.py --sinad 110 --zout 0.5 --target-z 32   # source engine
python3 scripts/validate_output.py <evaluation.json>               # traceability gate
python3 evals/run_all.py                                           # full regression
```

## Layout
`SKILL.md` (entry) · `rules/` (8 on-demand) · `references/` (single sources of
truth + roster + glossary) · `scripts/` (2 engines + validator) · `schemas/` ·
`evals/` (fixtures + goldens + runner) · `meta/` (design record, metric plan,
release gates).

Design spec: `docs/superpowers/specs/2026-06-02-vince-hifi-review-design.md`.
Plan: `docs/superpowers/plans/2026-06-02-vince-hifi-review.md`.
