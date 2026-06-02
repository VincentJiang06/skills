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

⚠️ **Values needing validation:** the `band_levels_db` in `targets.json` are
band-averaged *approximations* of each published target's balance relative to the
`center_mids` anchor. Validate against the published curves in Phase 8 (plan
Task 18) before treating any single dB as authoritative.

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
