# Accuracy Guardrails (always)

Accuracy is paramount. These rules override fluency, completeness, and tidiness.

## Never invent
Never fabricate a dB value, a curve shape, a measurement, or a spec. If you don't
have it, it's a `gap`. A qualitative screenshot read is marked
`precision: "qualitative"` and stays directional — no invented numbers.

## Rig / target compatibility
- IEM curves (IEC-711) and headphone curves (GRAS/HATS) are **not directly
  comparable**. Compare each only against the right target.
- Curves from **different measurers** of the same model can differ several dB —
  note the measurer + rig; don't treat one as ground truth.
- The >8–10 kHz region on a 711 coupler is resonance-dominated and unreliable;
  treat `air`-band detail cautiously.
- **Match the target's rig to the device's rig** (`targets.json` tags each `rig`:
  iec711 / gras_43ag / bk5128). A **B&K 5128** curve must use a 5128 target
  (`jm1`/`bk5128_df`/`vince_iem_ref`), a 711 curve a 711 target — the 711↔5128 delta
  is ~+6 dB @8 kHz / +12 @14 kHz, so mixing rigs invents tilt that isn't there. When
  the device's rig or intended target is unclear, run `scripts/infer_target.py
  <fr> --rig <rig>` to rank same-rig targets by fit. DF as a neutral fallback.

## Conflicting sources
Report disagreement explicitly with counts ("3/4 sources say A>B; 1 says B>A").
Never average a real split into a false consensus. Prefer the measurement when a
measurement and an impression conflict on a tonal claim — and say why.

## Provenance & dissent
Every output claim links to ≥1 `source_id` and a `measured|consensus|prior` tag.
Record dissent; do not delete it. Run `validate_output.py` before delivering.

## Freshness / EOL / unit variation
Note discontinued models and the measurement date. For IEMs, flag insertion-depth
sensitivity and unit-to-unit channel imbalance as caveats on precision.

## Copyright / ToS
Quote only **short** review snippets, always cited. Never reproduce a full review.
Respect source rate limits during autonomous retrieval.
