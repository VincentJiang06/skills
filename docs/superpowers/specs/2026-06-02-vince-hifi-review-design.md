# vince-hifi-review — Design Spec

- **Date**: 2026-06-02
- **Status**: Approved design, pre-implementation
- **Skill name**: `2-vince-hifi-review` (see Open Risks for leading-digit validation note)
- **Location**: `2-vince-hifi-review/` (inside the `skill-developer` repo)
- **Git workflow**: developed on branch `2-vince-hifi-review` off `main`; merged back when release gates pass.
- **Methodology**: built strictly against the `develop-principle` knowledge base
  (industrial skill = reusable capability package with 8 design units; evidence
  traceability and the L0–L5 test pyramid are first-class).

---

## 1. Purpose

Produce an **objective, source-traceable evaluation** of a HiFi device by searching
**all available sources** and reconciling them: ① measurement/curve data (the
objective anchor), ② media reviews (corroboration + what measurement cannot show),
③ specs and product-family lineage (low-weight priors).

Output is a **calibrated tonal/engineering profile** plus an optional **literary
rendering** — bilingual (中文 + English). Literary phrasing is allowed but
**accuracy is paramount**: every descriptor traces back to a measured band, a
cleaned review consensus, or a declared prior, each with a confidence value.

Two device **classes**, each with its own objective model:

- **Transducer** (IEM / over-ear & on-ear headphone / TWS earbud): evaluated on
  **量感 (per-band quantity) + 风格 (signature)** from frequency response vs a
  target curve, with technicalities from review consensus.
- **Source gear** (DAC / headphone amp / DAP): evaluated on **measured engineering
  competence + system matching + chip/topology character** — *not* tonality. A
  competent modern source is audibly transparent; the skill says so plainly.

It is **not** a buying-recommendation / price-ranking tool, **not** an EQ generator,
and **not** a subjective-preference endorser. Speakers are out of scope (different
measurement world).

## 2. Locked scope decisions

| Decision | Choice | Consequence |
|---|---|---|
| Source retrieval | **Autonomous live** | Skill fetches reviews/curves/specs itself; user-supplied URL/CSV/screenshot is an optional priority seed, never required. Evals use cached fixtures. |
| Primary deliverable | **Single-profile AND comparison, both first-class** | Comparison reuses the single-profile engine; adds a delta/alignment layer. |
| Device classes | **Transducer (IEM + headphone + TWS) + Source gear (DAC/amp/DAP)** | Two objective models behind one traceability/cleaning/literary backbone. |
| Output language | **Bilingual (中文 + English)** | Descriptors and verdict in both; controlled-vocabulary glossary keeps terms aligned. |
| Source-gear model | **Separate rule set — circuit/chip/measurement angle** | SINAD/THD+N/output-Z/power + transparency reasoning + system matching; not 量感. |
| Priority | **Accuracy ≫ speed** | Thorough fetch + a mandatory **data-cleaning** stage; cost/latency are recorded but **non-gating**. |
| File mutation | **Non-mutating** — reads sources, writes only its own new report file | No edit-gate on the user's files needed; the gate is the traceability self-verification. |

### Carried assumptions (correct unless challenged)
- **Targets**: Harman OE 2018 (over-ear), Harman IE 2019 + Crinacle IEF (in-ear);
  Diffuse-Field as secondary reference. Stored as the single source of truth.
- **Rigs**: IEC 60318-4 (711) coupler for IEMs; GRAS/HATS-class for headphones.
  Cross-rig and cross-measurer curves are never directly compared without a flag.
- **Tier-1 measurement sources**: oratory1990, Crinacle / squig.link, Audio Science
  Review (ASR), RTINGS — standardized rigs. ASR is canonical for source gear.
- **Bilingual source pool**: English (Crinacle, ASR, oratory1990, SoundGuys,
  Headfonics) + Chinese (耳机大家坛, bilibili, 知乎, 什么值得买).

## 3. Architecture — two-track, evidence-traceable, with a cleaning gate

One **traceability backbone** (every claim carries source ids + tier + freshness +
`measured|consensus|prior` + confidence). One shared **data-cleaning stage** that
turns raw heterogeneous sources into a canonical evidence set. Two deterministic
**objective engines** (one per device class). One shared **literary renderer** that
may color but never exceed the facts.

```
                 ┌──────── references (single sources of truth) ────────┐
                 │ targets.json · band-taxonomy.json · source-gear-      │
                 │ thresholds.json · source-registry.json · glossary    │
                 └───────────────────────┬──────────────────────────────┘
                                         │
 query ─▶ 1 Scope ─▶ 2 Identify ─▶ 3 Gather(live) ─▶ 4 CLEAN & NORMALIZE ─▶ canonical evidence set
 (device,           (class+model+        (FR data, other        (dedup · de-market ·          │
  class)             variant)            measurements, reviews,  vocab-normalize · reconcile   │
                                         specs, family)          scales · flag outliers ·      │
                                                                 preserve provenance)          │
                                                                                               ▼
                    ┌──────────────────────────────────────────────────────────────────────────┐
       transducer ──┤ 5T fr_analyze.py: FR→target→band Δ→量感 vector→风格   6T technicalities    │
                    │      (objective, deterministic)                          from consensus    │
        source   ───┤ 5S source_analyze.py: SINAD/THD/Zout/power→competence    6S engineering +   │
                    │      tier + system matching (deterministic)              character verdict  │
                    └───────────────────────────────────┬──────────────────────────────────────┘
                                                        ▼
                              7 Synthesize ─▶ class-discriminated profile JSON
                                + bilingual literary render (every claim provenance+confidence)
                                                        ▼
                              8 Self-verify ─▶ validate_output.py (schema + traceability) ─▶ trace
```

**Data-flow contract**: the cleaning stage emits only evidence-bearing, deduplicated,
vocabulary-normalized claims, each retaining backward links to every contributing
source. Engines emit only what the data proves; gaps are explicit, never silently
filled. The renderer consumes engine + consensus output and may not introduce a
claim that is not already in the evidence set.

## 4. The eight design units

### 4.1 Trigger (→ `industrial_skill_design` §3, `metric.activation_precision`)
- **must_activate_on**: "客观评价一下 <耳机/IEM/TWS>", "对比 A 和 B 的声音", "这个
  DAC/耳放素质如何 / 能不能推得动 X", supplying a squig/oratory/ASR link or an FR
  screenshot/CSV and asking what it means.
- **must_not_activate_on**: "哪个最便宜 / 性价比最高", "推荐一条 ¥X 的耳机" (buying
  rec), "帮我 EQ 调音" (EQ generation), speaker evaluation, generic non-audio tasks.
- **adjacent_confusions**: "推荐买哪个" (→ buying advice, not objective eval);
  "调个 EQ" (→ out of scope); "音箱怎么样" (→ speakers, out of scope);
  "这歌好听吗" (→ not gear).
- **manual_activation_phrases**: `$2-vince-hifi-review`, "客观评测 / objective review".
- **risk_level**: low for the user's files (read-only); the real risk is **accuracy**
  → mitigated by the cleaning stage, deterministic engines, and the traceability gate.

### 4.2 Execution protocol (→ §4) — 8 steps, branches on device class
1. **Scope & classify** — confirm objective evaluation/comparison; set
   `device_class ∈ {transducer, source}`; reject speakers / buying-rec / EQ / non-audio.
2. **Identify** — resolve exact model(s) + variant (cable/filter/pad/firmware),
   driver or chip/topology, sub-category (→ selects rig+target or measurement set).
   Disambiguate with one question only when genuinely ambiguous.
3. **Gather (autonomous live)** — priority order per class (transducer: FR data →
   THD/impedance/sensitivity → reviews → specs/family; source: ASR-class
   measurements → power/Zout tables → reviews → chip/topology/specs). Record every
   source with tier + freshness + language. Stop at the coverage threshold.
4. **Clean & normalize (mandatory)** — dedup syndicated copies, strip marketing /
   sponsored / non-evidence text, map free-text descriptors to the controlled
   vocabulary (中英), reconcile reviewer scales, flag outliers/low-reliability,
   **preserve provenance** on every surviving claim. Output = canonical evidence set.
5. **Measure & quantize** — *transducer*: `fr_analyze.py` (FR→target→band Δ→量感
   vector→风格). *source*: `source_analyze.py` (measured metrics→competence tier +
   system matching). Screenshot-only FR → qualitative path, `precision` flagged.
6. **Corroborate** — *transducer*: fill technicalities (soundstage/imaging/
   resolution/dynamics/transient/timbre) from cleaned **review consensus only**,
   with N/M agreement; cross-check tonality claims vs measured, flag conflicts.
   *source*: engineering notes (chip/topology/PSU as low-weight priors) +
   transparency-vs-coloration character verdict from measurements.
7. **Synthesize** — class-discriminated profile JSON + bilingual literary render;
   every claim tagged `measured|consensus|prior` + confidence; gaps marked
   "evidence insufficient / 证据不足".
8. **Self-verify** — `validate_output.py`: schema + traceability (each claim has a
   valid source id; no measured-claim without a curve/metric; no technicality tagged
   `measured`; no source-gear audible-difference claim unsupported by measurement).
   Emit runtime trace.

### 4.3 Resources (file tree) (→ §5, `principle.progressive_disclosure`)
See §6. SKILL.md stays lean; everything heavy loads on demand by protocol step.

### 4.4 Deterministic cores — two engines + a validator (→ `principle.executable_acceptance`)

**A. `scripts/fr_analyze.py` (transducer objective engine)**

`fr_analyze.py <fr.csv|fr.txt> --target <id> [--rig <id>] [--smoothing 1/12] [--json]`

```json
{
  "device": "…", "category": "iem|headphone|tws",
  "target": "harman_ie_2019", "rig": "iec711",
  "alignment": {"method": "midband_avg", "offset_db": -2.3},
  "bands": [
    {"id": "sub_bass",  "hz": [20,60],   "dev_db": 4.1, "quanta": 2,
     "label_zh": "偏多", "label_en": "elevated"}
  ],
  "signature": {"label_zh": "偏暖 V 形", "label_en": "warm V-shape",
                "rule_fired": "bass_up & treble_up & mids_neutral"},
  "precision": "quantitative|qualitative",
  "warnings": ["target/rig mismatch", "channel imbalance > 3 dB"]
}
```

8-band taxonomy (`references/band-taxonomy.json`, single source of truth):
sub_bass 20–60 · mid_bass 60–200 · lower_mids 200–500 · center_mids 500–1k ·
upper_mids 1–3k · lower_treble 3–6k · mid_treble 6–10k · air 10–20k (Hz).

7-level **量感** scale (dev_db vs target → `quanta` −3…+3):
`|Δ|≤1.5` = 0 中性/neutral · `1.5–4` = ±1 略 (slightly low/elevated) ·
`4–7` = ±2 (notably) · `>7` = ±3 (大幅/extreme). Thresholds live in the taxonomy file.

**风格** label = a rule over the band vector (e.g. `V-shape = bass↑ ∧ treble↑ ∧
mids≈/↓`; `mid-forward = upper_mids↑ ∧ bass≈/↓`; `warm = bass/lower_mids↑ ∧ treble↓`).
Rules are data in `rules/tonal-mapping.md`, kept in lockstep with the script.

**B. `scripts/source_analyze.py` (source-gear objective engine)**

`source_analyze.py --sinad 110 --thdn 0.0005 --snr 120 --zout 0.5 --power "32:250,300:60" [--target-z 32 --target-sens 100] [--json]`

```json
{
  "device": "…", "class": "dac|amp|dac_amp|dap",
  "measured": {"sinad_db": 110, "thdn_pct": 0.0005, "snr_db": 120, "zout_ohm": 0.5},
  "competence_tier": "transparent|mild_coloration|colored|deficient",
  "system_matching": {
    "target_z_ohm": 32, "target_sens_db_mw": 100,
    "damping_factor": 64, "damping_ok": true,
    "max_spl_db": 118, "drives_adequately": true, "hiss_risk": "low"
  },
  "warnings": []
}
```

Competence tiering from `references/source-gear-thresholds.json` (e.g. SINAD ≥110
transparent, 90–110 very good, 75–90 audibly-transparent-enough, <75 compromised).
Output-impedance rule: `damping_factor = target_z / zout`; FR-deviation flag when
`zout > target_z/8`. Power-vs-load → expected max SPL vs the target's sensitivity.

**C. `scripts/validate_output.py` (shared traceability gate)** — exit 1 on any
violation: schema mismatch; a claim without a source id; a `measured`-tagged
transducer technicality; a source-gear audible-difference claim with no supporting
metric; a cross-rig comparison without a flag.

### 4.5 Control boundaries (→ §6, `anti_pattern.prompted_architecture`)
| Boundary | Rule |
|---|---|
| allowed_tools | Read, Write (the report file only), Bash (run the engines/validator), **network** (WebSearch/WebFetch/browser — retrieval is the point) |
| forbidden | fabricating any measured value or curve shape; claiming audible differences a competent source's measurements don't support; comparing incompatible rigs/targets without a flag; wholesale reproduction of copyrighted review text (quote short snippets + cite) |
| evidence rule | every output claim links to ≥1 source id and a `measured\|consensus\|prior` tag; dissent is recorded, never averaged away |
| degraded mode | no raw curve → screenshot `qualitative` read (flagged); no measurement at all → "review-consensus profile" with an explicit objectivity-downgrade banner |
| output / cost | profile JSON conforms to schema; `SKILL.md` entry `< 900` tokens; **cost/latency recorded but non-gating** (accuracy ≫ speed) |

### 4.6 Test assets (→ `skill_testing_process`: 4 case types + L0–L5 pyramid)
`evals/eval-cases.json` (starting set, both tracks):
- `happy.transducer.warm_iem` — known warm IEM, raw FR fixture → correct 量感 vector + 风格.
- `happy.transducer.compare_vshape_vs_neutral` — two devices → aligned delta table.
- `happy.source.transparent_dac` — high-SINAD DAC → "audibly transparent" verdict.
- `happy.source.drive_match` — amp + 300Ω headphone → drives_adequately / damping verdict.
- `boundary.screenshot_only_fr` — graph image only → qualitative path, precision flagged.
- `boundary.no_measurement` — only reviews exist → consensus profile + downgrade banner.
- `boundary.conflicting_sources` — Tier-1 measurement vs a dissenting review → flagged conflict.
- `cleaning.syndicated_dupes` — same review across 3 sites → collapsed to one, 3 source ids.
- `cleaning.marketing_copy` — manufacturer hype mixed in → stripped, only evidence kept.
- `negative.buying_rec` — "推荐 ¥1000 耳机" → must_not_activate.
- `negative.eq_request` / `negative.speaker` — out of scope.
- `adversarial.fictional_model` — nonexistent device → refuse / "no evidence".
- `adversarial.snake_oil_source` — "this $2000 DAC sounds warmer" → measurements say transparent; hold the line.

`evals/fixtures/` — cached FR CSVs, ASR-style metric sheets, review-text snapshots,
each with an `*.expected.json` golden (drives L1/L2; keeps evals offline & stable).

Pyramid mapping:
- **L0** — schema-validate targets/band-taxonomy/source-thresholds/eval-cases; SKILL.md budget.
- **L1** — engine output schema; `fr_analyze`/`source_analyze` on fixtures → expected JSON; validator contract.
- **L2** — trigger-routing cases; cleaning rules on a messy fixture → canonical set; glossary normalization.
- **L3** — trajectory `gather → clean → measure → corroborate → synthesize → verify`.
- **L4** — end-to-end on a fixed device (cached sources) for each class.
- **L5** — paired eval (with/without skill): tonal-accuracy + traceability lift.

### 4.7 Metrics (→ `quantitative_skill_metrics`)
`meta/metric-plan.json` required metrics, **accuracy-gating**:
- `tonal_band_accuracy` (per-band quanta vs golden within ±1) — **≥ 0.85**
- `signature_label_accuracy` — **≥ 0.85**
- `source_competence_tier_accuracy` + `system_match_correctness` — **≥ 0.85 / exact**
- `claim_traceability_rate` — **= 1.0** (gate)
- `unsupported_claim_rate` — **= 0** (gate)
- `measured_vs_consensus_mistag_rate` — **= 0** (gate)
- `cleaning_dedup_recall` + `marketing_strip_precision` — measured on cleaning fixtures
- `activation_precision` — **≥ 0.9**; `false_positive_rate` / `false_negative_rate` tracked
- `pass_k_all` (k=3) + `variance` (band vector + label stability)
- `cost_per_success`, `loaded_context_tokens_p50/p90` — **recorded, non-gating**

### 4.8 Lifecycle (→ `industrial_skill_design` §2)
`version 0.1.0` + CHANGELOG; `meta/release-checklist.json` maps the KB's 10 release
gates; reference data (`targets.json`, `band-taxonomy.json`, `source-gear-thresholds.json`,
`source-registry.json`) versioned independently (values evolve as targets/rigs do);
lifecycle states draft → eval_candidate → release_candidate → released; rollback +
deprecation paths reserved.

## 5. develop-principle four-piece acceptance set (`meta/`)
- `skill-design-record.json` — conforms to `template.skill_design_record` (trigger,
  execution_protocol, resources, control_boundaries, test_assets, metric_plan_id,
  reference_ids). Encodes the two-class branch.
- eval cases — single source in `evals/eval-cases.json`; referenced by id.
- `metric-plan.json` — conforms to `template.metric_plan` (the accuracy-gating set above).
- `release-checklist.json` — conforms to the `skill_release` checklist schema (10 gates).

## 6. File / package layout
```
2-vince-hifi-review/
  SKILL.md                       # entry: identity / trigger / 8-step protocol / module table (<900 tokens)
  rules/
    retrieval-playbook.md        # Step 3: where to find curves/reviews/specs per class; squig export; screenshot read; stop rule
    data-cleaning.md             # Step 4: dedup · de-market · vocab-normalize · scale-reconcile · outlier-flag · provenance
    tonal-mapping.md             # Step 5T: band table, dB→量感 thresholds, 风格 rules (lockstep with fr_analyze.py)
    technicalities-from-reviews.md # Step 6T: review-only attributes, consensus method, reliability tiers + weighting
    source-gear-eval.md          # Step 5S–6S: SINAD/THD/Zout/power tiers, transparency reasoning, chip/topology, system matching
    accuracy-guardrails.md       # rig/target compatibility, conflict handling, never-invent, EOL/freshness, IEM insertion caveats
    literary-rendering.md        # Step 7: 文学化 but anchored; provenance tags; bilingual rendering; forbidden over-claims
    comparison-mode.md           # head-to-head: target/rig alignment, per-band delta table, not-comparable rule
  references/
    targets.json                 # ★ Harman OE2018 / IE2019 / IEF / DF target curves + band thresholds
    band-taxonomy.json           # ★ 8 bands + Hz + 量感 scale (shared by script + rules)
    source-gear-thresholds.json  # ★ SINAD/THD/Zout/power competence tiers + matching formulas
    source-registry.json         # known sources: tier, what they measure, rig, URL patterns, language
    signature-glossary.md        # ★ bilingual term + normalization map (V/染色/解析/声场/结像/齿音/暖声 …)
    research-bibliography.md      # Harman research, IEC 711, why bands map to perception, transparency thresholds
  scripts/
    fr_analyze.py                # transducer engine: FR + target → band Δ / 量感 / 风格 (deterministic)
    source_analyze.py            # source engine: measured metrics → competence tier + system matching (deterministic)
    validate_output.py           # shared schema + traceability gate (exit 1 on violation)
  schemas/
    evaluation.schema.json       # class-discriminated output contract (transducer | source sub-schemas)
    fr-analysis.schema.json      # fr_analyze.py output (L1)
    source-analysis.schema.json  # source_analyze.py output (L1)
    eval-cases.schema.json       # eval set (L0)
  evals/
    eval-cases.json              # happy / boundary / cleaning / negative / adversarial (single source)
    fixtures/                    # cached FR CSVs, metric sheets, review snapshots + *.expected.json goldens
    run_all.py                   # L0 schema + L1 golden + determinism + L5 paired hooks
  meta/
    skill-design-record.json
    metric-plan.json
    release-checklist.json
  agents/openai.yaml             # cross-runtime branding (matches other vince- skills)
  CHANGELOG.md
  README.md
```

## 7. Domain grounding (standards & why the model is objective)
- **Tonality is FR-derived**: perceived 量感 per band = deviation from a
  preference target (Harman/IEF), grounded in Olive/Welti listener research.
- **Technicalities are not FR-derived**: soundstage, imaging, resolution,
  dynamics, transient/decay, timbre come from review **consensus** and are tagged
  as such — never presented as measured fact.
- **Source gear is more objective, not less**: a competent DAC/amp is audibly
  transparent (SINAD / THD+N below audibility, ruler-flat FR); evaluation is
  engineering competence + system matching (output impedance damping, power vs
  load, noise floor vs IEM sensitivity), with chip/topology as low-weight priors.
- **Comparability rules**: IEC 711 (IEM) vs GRAS/HATS (headphone), cross-measurer
  variance, IEM insertion depth, unit-to-unit channel imbalance — all flagged.

## 8. Implementation approach (TDD ordering, → `tdd_for_skill_development`)
Red → green per the methodology:
1. Write the reference single-sources-of-truth (`targets.json`, `band-taxonomy.json`,
   `source-gear-thresholds.json`) + their schemas (L0) first.
2. Write `evals/fixtures/` (FR CSVs, metric sheets, messy review samples) + expected
   goldens (failing L1) before the engines.
3. Implement `fr_analyze.py`, then `source_analyze.py`, until fixtures pass.
4. Implement the cleaning rules + glossary normalization; add cleaning fixtures (L2).
5. Write `SKILL.md` + remaining rules; add trigger-routing cases (L2) and the
   `gather→clean→measure→corroborate→synthesize→verify` trajectory case (L3).
6. Wire `validate_output.py` as the self-verification gate; end-to-end (L4) + paired (L5).
7. Produce the `meta/` four-piece set; run the 10-gate release checklist.

## 9. Traceability (decision → source)
| Unit | develop-principle source |
|---|---|
| Trigger | `doc.architecture.industrial_skill_design` §3; `metric.activation_precision` |
| Protocol (8-step, class branch) | §4; `principle.executable_acceptance` |
| Data cleaning / normalization | `doc.operations.knowledge_base_architecture`; `research_doc_quality.checklist` (claim_traceability) |
| Progressive disclosure / resources | §5; `principle.progressive_disclosure` |
| Deterministic engines | §4; `principle.executable_acceptance` |
| Controls | §6; `anti_pattern.prompted_architecture` |
| Tests | `doc.testing.skill_testing_process` (L0–L5, 4 case types) |
| TDD ordering | `doc.testing.tdd_for_skill_development` |
| Metrics | `doc.metrics.quantitative_skill_metrics` (paired eval, accuracy gates) |
| Lifecycle / four-piece | `industrial_skill_design` §2, §7; `skill_lifecycle_governance` |

## 10. Open risks
- **Skill-name leading digit**: verify Claude Code accepts a `name:` beginning with
  a digit (`2-vince-hifi-review`). Fallback: keep the folder `2-vince-hifi-review`
  but set frontmatter `name: vince-hifi-review`.
- **Live retrieval is non-deterministic**: runtime fetches vary; the eval harness
  must run on cached fixtures and mark live runs `environment_stability: unstable`.
- **Screenshot FR precision**: qualitative reading bounds accuracy; pixel
  digitization is deferred/optional and must stay flagged when used.
- **Cross-measurer / cross-rig variance**: the same model measured by two labs can
  differ several dB; `source-registry.json` records rig + target so the guardrails fire.
- **Target/threshold values** in `references/*.json` are initial; validate against the
  cited research during implementation.
- **Copyright/ToS**: quote short review snippets with citation; never republish full
  reviews; respect source rate limits during autonomous retrieval.
