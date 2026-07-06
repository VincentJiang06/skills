---
name: hifi-review
description: >-
  Objective, source-traceable evaluation of HiFi gear — transducers (IEM/HP/TWS)
  and source gear (DAC/amp/DAP) — as a bilingual, evidence-traced verdict. Use
  for an objective sound assessment or A/B: "客观评价这条耳机", "这个 DAC 素质如何",
  "$hifi-review". NOT for buying recommendations, EQ, or speakers.
metadata:
  version: 1.0.2
---

# hifi-review

**Objective, evidence-traceable** evaluation of a HiFi device. Evidence hierarchy:
**① measurement/curve data (anchor) → ② reviews (what measurement can't show) →
③ specs/family (priors)**. Literary phrasing may color but **never exceed the
evidence**. Output **bilingual (中文 + English)**. Read-only. **Accuracy ≫ speed.**

Two classes: **transducer** (IEM/HP/TWS) → 量感 + 风格 from FR-vs-target, technicalities
from **review consensus only** (never `measured`). **source** (DAC/amp/DAP) → measured
competence + system matching, chip/topology as priors — resist 玄学: if it measures
transparent, say so.

## Protocol — 8 steps (branch on device class)

1. **Scope & classify** — confirm objective eval/compare; set `device_class ∈ {transducer, source}`. Reject buying-rec / EQ / speakers / non-audio.
2. **Identify** — exact model + variant (cable/filter/pad/firmware) + driver/chip; sub-category → rig+target or measurement set. Disambiguate only if genuinely ambiguous.
3. **Gather (live)** — fetch per class; `source-registry.json` targets known reviewers + search hints; record tier + **style-lean** + freshness + lang. → `rules/retrieval-playbook.md`.
4. **Clean & normalize (mandatory)** — dedup, strip marketing/non-evidence, normalize to glossary, reconcile scales, flag outliers, **keep provenance**. → `rules/data-cleaning.md`.
5. **Measure & quantize** — transducer: `python3 scripts/fr_analyze.py <fr> --target <id>`; source: `python3 scripts/source_analyze.py --sinad … --zout … [--target-z …]`. Screenshot-only FR → qualitative. → `rules/tonal-mapping.md`, `rules/source-gear-eval.md`.
6. **Corroborate** — transducer: technicalities from consensus, **style-weighted** (measurement-backed high-trust regardless of source; impression-led bias-corrected), N/M agreement, flag conflicts → `rules/technicalities-from-reviews.md`. source: engineering + transparency verdict.
7. **Synthesize** — class-discriminated profile + render: compact bilingual summary OR a **~4000字 长文** (`rules/longform-review.md`); both render only from evidence; tag claims `measured|consensus|prior` + confidence; gaps "证据不足". → `rules/literary-rendering.md`, compare → `rules/comparison-mode.md`.
8. **Self-verify** — `python3 scripts/validate_output.py <out.json>`; emit `trace`; never pass a FAIL.

Always obey `rules/accuracy-guardrails.md`: never invent a dB/curve; flag
incompatible rig/target comparisons; record dissent.

## Modules

| File | When to load |
|------|--------------|
| `rules/retrieval-playbook.md` | Step 3 — find curves/reviews/specs per class; squig/screenshot; stop rule |
| `rules/data-cleaning.md` | Step 4 — dedup / de-market / normalize / reconcile / flag / provenance |
| `rules/tonal-mapping.md` | Step 5 transducer — bands, dB→量感, 风格, tilt, peaks, target/rig select |
| `rules/technicalities-from-reviews.md` | Step 6 transducer — review-only attrs, consensus + style weight |
| `rules/source-gear-eval.md` | Step 5–6 source — SINAD/THD/Zout/power tiers, transparency, matching |
| `rules/accuracy-guardrails.md` | Always — rig/target match, never-invent, conflicts, EOL |
| `rules/literary-rendering.md` | Step 7 — anchored 文学化, provenance, bilingual, no over-claims |
| `rules/comparison-mode.md` | Compare — target/rig alignment, per-band delta, not-comparable |
| `rules/longform-review.md` | Step 7 — ~4000字 长文: structure / length / anchoring |
| `references/*.json` + `signature-glossary.md` | single sources of truth + glossary |

## Scripts

| File | Usage |
|------|-------|
| `fr_analyze.py <fr.csv> --target <id> --rig <r>` | transducer → 量感 / 风格 / tilt / peak-dip features |
| `source_analyze.py --sinad N --zout N [--power --target-z --target-sens]` | source → tier + drive/damping matching |
| `compare.py <a> <b> --target <id>` | two devices → band + tilt deltas, rig guard |
| `infer_target.py <fr> --rig <r>` | guess intended target (ranks same-rig targets) |
| `validate_output.py <eval.json>` | schema + traceability gate (exit 1) |
| `check_longform.py <review.md> --class <c> [--backing json]` | 长文 QA: 字 + sections + backing gate |
