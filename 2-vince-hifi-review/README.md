# 2-vince-hifi-review

A Claude Code skill that produces **objective, source-traceable** evaluations of
HiFi gear by searching all sources (measurements, media reviews, specs/family),
cleaning them, and rendering a **bilingual (中文 + English)** verdict where every
claim traces back to evidence. **Accuracy ≫ speed.**

## Two device classes, two objective models
- **Transducer** (IEM / headphone / TWS) → **量感** (per-band quantity) + **风格**
  (signature) from frequency-response-vs-target; sharp **peaks/dips** (e.g. 8 kHz
  sibilance) and a continuous **tilt** that band-averaging hides; technicalities
  (soundstage/imaging/resolution…) from **review consensus only**.
- **Source gear** (DAC / amp / DAP) → measured competence (SINAD / THD / output-Z /
  power) + system matching + chip/topology; a competent source is audibly transparent.

Sources are weighted via a **style-profiled media roster** (each source has a 2–3
sentence `style_profile`; orientation judged dynamically — no fixed faction buckets).

## Output modes
1. **Compact** bilingual structured profile + summary.
2. **~4000字 long-form 评测长文** (Chinese-primary, traceability appendix + backing
   `evaluation.json`) — see `rules/longform-review.md`.

## Deterministic engines (`scripts/`)
| Script | Purpose |
|--------|---------|
| `fr_analyze.py` | transducer FR → 8-band 量感 + 风格 + **tilt** + **peak/dip features** |
| `source_analyze.py` | source metrics → competence tier + drive/damping/hiss matching |
| `compare.py` | two devices → per-band + tilt deltas, who-has-more-where, rig guard |
| `infer_target.py` | device FR + rig → "looks tuned toward X" (ranks same-rig targets) |
| `validate_output.py` | schema + **traceability gate** (every claim sourced; no over-claim) |
| `check_longform.py` | long-form QA: 字 count + sections + backing gate |

## Targets & rigs (rig-aware)
Targets in `references/targets.json` are **rig-tagged** — 711 and 5128 are **not**
interchangeable, and the engines flag a rig↔target mismatch. Included: Harman IE 2019,
Harman OE 2013/2018, IEF Neutral, Diffuse Field (711); **JM-1, B&K 5128 DF/FF**, and
**`vince_iem_ref`** (Vince's personal IEM reference = JM-1 −1 dB/oct + 4 dB bass, 5128).

## Protocol (8 steps)
scope & classify → identify → gather (live) → **clean & normalize** → measure &
quantize → corroborate → synthesize (compact or long-form) → self-verify. See `SKILL.md`.

## Run / test
```bash
python3 scripts/fr_analyze.py <fr.csv> --target harman_ie_2019 --rig iec711
python3 scripts/infer_target.py <fr.csv> --rig bk5128
python3 scripts/compare.py <a.csv> <b.csv> --target vince_iem_ref
python3 scripts/validate_output.py <evaluation.json>
python3 evals/run_all.py        # full regression (L0 schema + L1 goldens + gates)
```

## Layout
`SKILL.md` (entry) · `rules/` (9 on-demand) · `references/` (targets + roster +
glossary + bibliography) · `scripts/` (6 engines) · `schemas/` · `evals/` (fixtures +
goldens + runner) · `meta/` (design record, metric plan, release gates, eval results).

The design spec and implementation plan live in the parent `skill-developer` repo
under `docs/superpowers/` (not shipped with the standalone skill).
