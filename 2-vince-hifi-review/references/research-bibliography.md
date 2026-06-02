# Research Bibliography & Grounding

Why the objective models are defensible, and which values still need validation.
Citations are by name/standard; resolve exact editions during a deeper audit.

---

## Transducer tonality (量感 / 风格)

- **Harman target research** — Olive, Welti, et al. (AES papers, ~2013–2019).
  Listener-preference-derived target curves for over-ear and in-ear. Basis for
  `targets.json: harman_oe_2018`, `harman_ie_2019`. *Relevance:* perceived per-band
  "too much / too little" is deviation from a preference target, not from flat.
- **IEC 60318-4 (a.k.a. 711 coupler)** — standard occluded-ear-simulator for IEM
  measurement. *Relevance:* IEM curves are 711-referenced and **not** directly
  comparable to GRAS/HATS headphone curves; the >8–10 kHz region is coupler-resonance
  dominated and unreliable (handled by `air` band caveats).
- **Diffuse-Field (DF) target** — classic neutral reference. Basis for
  `targets.json: diffuse_field`. *Relevance:* a measurement-neutral anchor when no
  preference target applies.
- **Crinacle IEF Neutral** — community in-ear "neutral with mild bass" target.
  Basis for `targets.json: ief_neutral`. *Relevance:* widely used alternative to
  Harman IE for analytical listeners.

✅ **Validated (v0.3):** `targets.json` `band_levels_db` are band-averages relative
to the 500 Hz–1 kHz anchor, derived from the raw target `.txt` files (squig.link
mirrors) and cross-checked against Olive/Harman + Crinacle's published descriptions.
- **Harman IE 2019** (high conf): bass shelf ~+7.6 dB (20 Hz re 1 kHz; ~+9 dB re the
  ~500 Hz midrange dip), ear-gain peak ~+10 dB at ~3 kHz, treble back to ~0 dB by
  10 kHz then a hard roll-off — so the 3–6 kHz band (lower_treble) averages strongly
  positive (~+8.5), which earlier seed values badly under-stated.
- **Harman OE 2018** (high conf, two mirrors agree): ~half the bass shelf (~+4 dB)
  and a ~+8.7 dB ear-gain.
- **IEF Neutral 2020** (high conf shape): flat bass (no shelf) + a gentler ~+7.4 dB
  ear-gain — the headline difference from Harman IE.
- **Diffuse Field** (med conf): no bass boost; a tall ~+10–12 dB 2.7–3 kHz peak
  (height varies by DF source) and more treble energy up top.

**Caveats baked in:** (a) a "bass shelf dB" depends on reference point — vs 1 kHz vs
the ~500 Hz midrange dip differ ~1.4 dB; (b) the DF 3 kHz peak is a range (+10..+12),
not a fixed number; (c) IEF has multiple vintages (2020 / 2023-5128 / 2025) — we
encode the 2020 target; (d) the 711-coupler air-band (>8–10 kHz) is
resonance-dominated, so `air` values are directional only.

Sources: raw target `.txt` (squig.link mirrors: regancipher [Harman IE 2019],
sai+ish [Harman OE 2018, two mirrors agree], timmyv [IEF Neutral 2020], aftersound
[Diffuse Field]); Crinacle "IEF Neutral" write-ups (2020, 2025); Olive, *The
Perception and Measurement of Headphone Sound Quality*, Acoustics Today 2022.

## Source gear (DAC / amp / DAP)

- **Audible transparency thresholds** — ABX/blind-test literature (Meyer & Moran;
  ASR community ABX summaries). Consensus: at matched level, sources above roughly
  **SINAD 90 / THD+N ~0.003%** are not reliably distinguishable. Basis for
  `source-gear-thresholds.json: competence_tiers_by_sinad_db` and the
  `audible_transparency_note`. *Relevance:* justifies the "competent source =
  audibly transparent" stance and the snake-oil guardrail.
- **Output-impedance / damping rule** — the "rule of eighths": for <~1 dB
  frequency-response deviation, source output impedance should be ≤ 1/8 of the
  load impedance. Basis for `output_impedance_rule.damping_factor_min: 8`.
  *Relevance:* high `zout` + low-impedance / multi-BA IEMs → audible tonal shift,
  which a competent evaluation must flag.
- **Power vs SPL** — `max_spl ≈ sensitivity(dB/mW) + 10·log10(power_mW)`; ~110 dB
  peak headroom target. Basis for `drive_target_spl_db: 110` and
  `source_analyze.py` drive check.

⚠️ **Values needing validation:** SINAD tier boundaries (100/90/80) and the
hiss-risk heuristic are pragmatic starting points; refine against ASR datasets.

## Method grounding (develop-principle)

- Evidence traceability & claim/observation separation — `research_doc_quality`
  checklist; `knowledge_base_architecture`.
- L0–L5 test pyramid, paired eval, accuracy gates — `skill_testing_process`,
  `quantitative_skill_metrics`.
