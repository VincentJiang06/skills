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

## Rigs & additional targets (v0.4)

Targets are **rig-specific** — `targets.json` tags each with `rig`:
- **iec711** (IEC 60318-4 coupler): `harman_ie_2019`, `ief_neutral`, `diffuse_field`.
  Reliable to ~8–10 kHz; an artificial dip at 10–14 kHz; masks treble peaks the 5128 shows.
- **gras_43ag** (GRAS over-ear 711-type): `harman_oe_2018`, `harman_oe_2013`.
- **bk5128** (B&K Type 5128 — the going-forward gold standard for IEMs): `jm1`,
  `bk5128_df`, `bk5128_ff`, `vince_iem_ref`.

**Never compare a 5128 curve to a 711 target (or vice-versa).** The 711↔5128 delta
(5128 minus 711, same IEMs): 8 kHz ≈ +6 dB, 14 kHz ≈ +12 dB, 16 kHz ≈ +20 dB.

New targets:
- **JM-1** (5128, med conf): Joel Merrifield's population-averaged-DF neutral
  baseline (Headphones.com; base of Crinacle IEF 2025). = 5128 DF with the treble
  de-brightened toward an average human (~−2.5 dB at 3 kHz, tamer 6–12 kHz). No bass
  shelf — a neutral baseline, not a preference target.
- **B&K 5128 DF** (high conf, AutoEq): brighter 6–10 kHz (~+8.5 at 8 kHz) and a flat
  air band vs the 711 DF.
- **B&K 5128 FF** (low conf, illustrative): sharper ~3 kHz peak, darker upper treble;
  rarely a tuning target — flagged low confidence.
- **Harman OE 2013** (high conf, AutoEq): the original; vs 2018 it has **less** bass
  (sub +1.4 vs +3.8), a ~0.6 dB taller 3 kHz peak, and less 6–10 kHz — i.e. 2018 is
  *warmer* with marginally smoother 3 kHz. (Corrects the common "2013 had more bass &
  treble" belief.)
- **vince_iem_ref** (Vince's personal IEM reference): JM-1 + **−1.0 dB/oct** tilt +
  4 dB bass shelf — a warm, down-tilted target ("similar to the Crinacle reference
  but ~1 dB less bass"). See `_construction` in `targets.json`.

The downward tilt: `gain = −k·log2(f/1kHz)`. Vince's `vince_iem_ref` uses **k = 1.0
dB/oct** → +5.6 dB @20 Hz, 0 @1 kHz, −4.0 dB @16 kHz (steeper/warmer than the prior
−0.6 version). Verify the bass-shelf corner/shape against his own tool.

Sources: AutoEq target CSVs (github.com/jaakkopasanen/AutoEq); Headphones.com
("The Shape of IEMs To Come" / JM-1, the 5128 graph guide); Crinacle IEF 2025; the
Harman 5128 over-ear target (AES 2023).

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

## Method grounding (skill-principle)

- Evidence traceability & claim/observation separation — `research_doc_quality`
  checklist; `knowledge_base_architecture`.
- L0–L5 test pyramid, paired eval, accuracy gates — `skill_testing_process`,
  `quantitative_skill_metrics`.
