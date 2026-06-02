---
name: 2-vince-hifi-review
description: >
  Objective, source-traceable evaluation of HiFi gear. Transducers
  (IEM / headphone / TWS): 量感 (per-band quantity) + 风格 (signature) from
  frequency-response-vs-target; technicalities from review consensus. Source
  gear (DAC / amp / DAP): measured competence (SINAD/THD/output-Z/power) +
  system matching + chip/topology — a competent source is audibly transparent.
  Searches all sources (measurements, media reviews, specs) via a style-profiled
  media roster (orientation judged dynamically), cleans them, renders a bilingual
  verdict where every claim traces to evidence. Triggers: "客观评价这条耳机",
  "对比 A 和 B 的声音", "这个 DAC 素质如何 / 推得动吗", "$2-vince-hifi-review".
  Not for: buying/价格 recommendations; EQ tuning; speakers; non-audio.
---

# vince-hifi-review

**Objective, evidence-traceable** evaluation of a HiFi device. Evidence hierarchy:
**① measurement/curve data (anchor) → ② reviews (corroboration + what measurement
can't show) → ③ specs/family (priors)**. Literary phrasing may color but **never
exceed or contradict the evidence**. Output **bilingual (中文 + English)**. Read-only.
**Accuracy ≫ speed.**

Two classes: **transducer** (IEM/headphone/TWS) → 量感 + 风格 from FR-vs-target;
technicalities from **review consensus only** (never tagged `measured`). **source**
(DAC/amp/DAP) → measured competence + system matching; chip/topology are priors —
resist 玄学/snake-oil: if it measures transparent, say so.

## Protocol — 8 steps (branch on device class)

1. **Scope & classify** — confirm objective eval/compare; set `device_class ∈ {transducer, source}`. Reject buying-rec / EQ / speakers / non-audio.
2. **Identify** — exact model + variant (cable/filter/pad/firmware) + driver/chip; sub-category → rig+target or measurement set. Disambiguate only if genuinely ambiguous.
3. **Gather (live)** — fetch per class; `source-registry.json` targets known reviewers + search hints; record tier + **style-lean** + freshness + lang. → `rules/retrieval-playbook.md`.
4. **Clean & normalize (mandatory)** — dedup, strip marketing/non-evidence, normalize to glossary, reconcile scales, flag outliers, **keep provenance**. → `rules/data-cleaning.md`.
5. **Measure & quantize** — transducer: `python3 scripts/fr_analyze.py <fr> --target <id>`; source: `python3 scripts/source_analyze.py --sinad … --zout … [--target-z …]`. Screenshot-only FR → qualitative. → `rules/tonal-mapping.md`, `rules/source-gear-eval.md`.
6. **Corroborate** — transducer: technicalities from consensus, **style-weighted** (measurement-backed high-trust regardless of source; impression-led bias-corrected), N/M agreement, flag conflicts → `rules/technicalities-from-reviews.md`. source: engineering + transparency verdict.
7. **Synthesize** — class-discriminated profile + bilingual literary render; tag each claim `measured|consensus|prior` + confidence; mark gaps "证据不足". → `rules/literary-rendering.md`; compare → `rules/comparison-mode.md`.
8. **Self-verify** — `python3 scripts/validate_output.py <out.json>`; emit `trace`; never pass a FAIL.

Always obey `rules/accuracy-guardrails.md`: never invent a dB/curve; never compare
incompatible rigs/targets unflagged; record dissent, don't average it away.

## Modules

| File | When to load |
|------|--------------|
| `rules/retrieval-playbook.md` | Step 3 — find curves/reviews/specs per class; squig export; screenshot read; stop rule |
| `rules/data-cleaning.md` | Step 4 — dedup / de-market / normalize / reconcile / flag / provenance |
| `rules/tonal-mapping.md` | Step 5 transducer — band table, dB→量感 thresholds, 风格 rules |
| `rules/technicalities-from-reviews.md` | Step 6 transducer — review-only attrs, consensus + style weighting |
| `rules/source-gear-eval.md` | Step 5–6 source — SINAD/THD/Zout/power tiers, transparency, chip/topology, matching |
| `rules/accuracy-guardrails.md` | Always — rig/target compatibility, never-invent, conflicts, EOL/freshness |
| `rules/literary-rendering.md` | Step 7 — anchored 文学化, provenance, bilingual, forbidden over-claims |
| `rules/comparison-mode.md` | Compare — target/rig alignment, per-band delta, not-comparable rule |
| `references/*.json` + `signature-glossary.md` | single sources of truth: `source-registry` (roster), `band-taxonomy`, `targets`, `source-gear-thresholds`; glossary = terms + normalization map |

## Scripts

| File | Usage |
|------|-------|
| `scripts/fr_analyze.py <fr.csv> --target <id> [--rig --device --category]` | transducer → band Δ / 量感 / 风格 JSON |
| `scripts/source_analyze.py --sinad N --zout N [--power "32:250" --target-z --target-sens]` | source → tier + matching JSON |
| `scripts/validate_output.py <eval.json>` | schema + traceability gate (exit 1) |
| `evals/run_all.py` | L0 + L1 + determinism + gate + token budget |
