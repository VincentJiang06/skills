# Source-Gear Evaluation (Steps 5–6 — DAC / amp / DAP)

A fundamentally different model from transducers: **not 量感**. A competent modern
source is **audibly transparent**; the evaluation is engineering competence +
system matching, with chip/topology as low-weight priors. Run
`scripts/source_analyze.py`; thresholds live in `references/source-gear-thresholds.json`.

## Competence tier (from SINAD)
≥100 transparent · 90–99 very_good · 80–89 adequate · <80 compromised. Most
listeners cannot ABX-distinguish sources above ~SINAD 90 / THD+N ~0.003% at matched
level — **differences above that are engineering/feature, not sound**.

## System matching (the part that actually changes what you hear)
- **Output impedance / damping**: `damping_factor = load_Z / zout`; require
  `zout ≤ load/8`. High `zout` + low-impedance or **multi-BA IEM** → audible
  frequency-response shift. This is a real, hearable effect — flag it.
- **Power vs load**: `max_spl ≈ sensitivity(dB/mW) + 10·log10(power_mW)`; target
  ~110 dB peak headroom. Under-powered → dynamic compression, not "weak bass".
- **Hiss**: very sensitive IEMs + a high noise floor / high `zout` → audible hiss.

## Chip / topology (priors only)
DAC chip family (ESS Sabre, AKM Velvet, Cirrus, TI/BB, R-2R ladder, FPGA) and amp
topology (op-amp vs discrete, Class A/AB) set expectations, but **implementation ≫
chip**. Use as a sanity-check prior, never as the verdict.

## Snake-oil guardrail
If the measurements say transparent, **say so plainly** and resist玄学/marketing
claims (magic cables, "warmer DAC", burn-in tone change) that the data does not
support. A source audible-difference claim is only allowed when a measured metric
delta backs it (the traceability gate enforces this). Genuine audible differences
do exist — high `zout`, insufficient power, audible noise — name *those* with the
numbers.
