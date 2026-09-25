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

## Snake-oil guardrail — audibility judgment card (you decide this; no script does)

If the measurements say transparent, **say so plainly** and resist 玄学/marketing
claims (magic cables, "warmer DAC", burn-in tone change) the data does not support.

**Criterion.** A claim that a source device *changes what is heard* needs a measured
mechanism backed by numbers — FR shift from Zout/load (`zout > load/8`), insufficient
power/clipping, or audible noise/hiss. A claim of *no* audible difference for a device
measured transparent is the default honest verdict and needs nothing beyond the
transparency data. Judge the meaning, not the wording, in any language.

**Minimal pairs** (same device class, one thing changed):
- "The noise floor is inaudible" = "not audible" = "no audible difference at matched
  level" (SINAD ≥100) → all **allowed**, same verdict: wording changed, meaning didn't.
- "与另一台 DAC 相比听感差异明显，声音更暖" / "sounds noticeably warmer" (reviews,
  SINAD 118, 0.1 Ω) → **not the verdict**: no mechanism in the numbers. vs "a 10 Ω-Zout
  amp into an 8 Ω multi-BA IEM audibly shifts the FR" (damping 0.8 < 8, measured) →
  **required**: the mechanism is in the numbers — anti-voodoo must not suppress it.
- "Hiss is audible with 130 dB/V IEMs" backed by the noise-floor math → **allowed**; the
  same sentence with no noise figure → a `gap`, not a claim.

**Output shape.** An unsupported audible-difference claim stays in the output as a
low-confidence dissent entry with the reason (sighted impression, no mechanism) —
never deleted, never the verdict. Tag each claim by where its evidence comes from.

**D fallback: none.** `validate_output.py` checks structure only (schema, traceability,
technicality tags); it does not read claim meaning. You apply this card at Step 8 by
re-reading every claim about what is or is not heard; a missed phrasing becomes a new
minimal pair here, never a pattern in a script.
