# hifi-review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `2-hifi-review`, a Claude Code skill that produces objective, source-traceable evaluations of HiFi gear — transducers (IEM/headphone/TWS) via 量感+风格 from FR-vs-target, and source gear (DAC/amp/DAP) via measured competence + system matching — with a mandatory data-cleaning stage, a style-profiled media roster (no rigid faction buckets), and bilingual output.

**Architecture:** Two deterministic Python engines (`fr_analyze.py`, `source_analyze.py`) sit behind one agent-driven backbone (retrieve → clean → measure → corroborate → synthesize → self-verify). Reference JSON files are single sources of truth; a shared `validate_output.py` enforces the traceability contract. Tests follow the develop-principle L0–L5 pyramid against cached offline fixtures. Mirrors the sibling skill `low-visibility-fix` (stdlib-only Python, golden fixtures, `run_all.py`).

**Tech Stack:** Python 3 (stdlib only — no pip deps), JSON / JSON-Schema, Markdown. Skill packaged for Claude Code (SKILL.md frontmatter + progressive-disclosure resources).

**Spec:** `docs/superpowers/specs/2026-06-02-hifi-review-design.md`
**Branch:** `2-hifi-review` (already created off `main`; merge back in the final task).
**Build dir:** `2-hifi-review/` (repo root). All paths below are relative to it unless noted.

---

## Conventions locked for every task (read once)

- **Band ids** (8, fixed order): `sub_bass, mid_bass, lower_mids, center_mids, upper_mids, lower_treble, mid_treble, air`.
- **Quanta scale**: integers `-3..+3` (0 = neutral). Mapping from |deviation_dB|: `≤1.5→0`, `≤4.0→±1`, `≤7.0→±2`, `>7.0→±3`.
- **Source orientation**: NOT a fixed enum — each roster source has a 2–3 sentence `style_profile` + optional `lean_tags`; orientation is judged dynamically at search time (measurement-backed → high trust regardless of source; impression-led → subjective + bias-corrected).
- **Provenance tag enum**: `measured | consensus | prior`.
- **device_class enum**: `transducer | source`.
- **Python**: stdlib only; every script prints JSON with `ensure_ascii=False`; deterministic (no clocks/RNG in core output).
- **Commit style**: `type(2-hifi-review): subject`, ending with the Co-Authored-By trailer. Commit after every green step.

---

## Phase 0 — Scaffold

### Task 0: Create the package skeleton

**Files:**
- Create: `2-hifi-review/` and all subdirs.

- [ ] **Step 1: Make directories**

Run (from repo root `/Users/vince/playground/skill-developer`):
```bash
mkdir -p 2-hifi-review/{rules,references,scripts,schemas,evals/fixtures,meta,agents}
```

- [ ] **Step 2: Verify**

Run: `find 2-hifi-review -type d | sort`
Expected: the 8 directories above, no errors.

- [ ] **Step 3: Commit**

```bash
git add 2-hifi-review
git commit -m "chore(2-hifi-review): scaffold package directories"
```
(Empty dirs won't commit; this is a no-op placeholder — the first real file lands in Task 1. Skip if git reports nothing to commit.)

---

## Phase 1 — Reference single-sources-of-truth + schemas (L0). Roster FIRST.

### Task 1: Media roster `references/source-registry.json` (built first) + schema

**Files:**
- Create: `references/source-registry.json`
- Create: `schemas/source-registry.schema.json`
- Test: `evals/run_all.py` L0 (wired in Task 13)

- [ ] **Step 1: Write the schema**

`schemas/source-registry.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "sources"],
  "additionalProperties": false,
  "properties": {
    "version": {"type": "string"},
    "judging_note": {"type": "string"},
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "style_profile", "covers", "tier", "lang", "search_hints", "publishes_raw"],
        "additionalProperties": false,
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "style_profile": {"type": "string"},
          "lean_tags": {"type": "array", "items": {"type": "string"}},
          "covers": {"type": "array", "items": {"enum": ["iem", "headphone", "tws", "dac", "amp", "dap"]}},
          "publishes_raw": {"type": "boolean"},
          "rig": {"type": "string"},
          "tier": {"type": "integer", "minimum": 1, "maximum": 4},
          "platforms": {"type": "array", "items": {"type": "string"}},
          "search_hints": {"type": "array", "items": {"type": "string"}},
          "lang": {"enum": ["en", "zh", "bi"]},
          "verify_status": {"enum": ["seeded", "web_verified"]}
        }
      }
    }
  }
}
```

- [ ] **Step 2: Write the seed roster (each source gets a 2–3 sentence `style_profile`, `verify_status:"seeded"`)**

`references/source-registry.json` — seed with these real entries. The `style_profile` is the calibration prior; the skill refines orientation dynamically at search time (Task 2 / runtime). NO faction enum.
```json
{
  "version": "0.1.0",
  "judging_note": "style_profile is a PRIOR, not a verdict. At search time, judge each source's actual content: measurement-backed claims are high-trust regardless of source; impression-led claims are subjective and bias-corrected per the noted lean. Record dissent; never force a source into a fixed bucket.",
  "sources": [
    {"id": "asr", "name": "Audio Science Review (Amir)",
     "style_profile": "Measurement-absolutist: every verdict anchors to Audio Precision bench data (SINAD, THD+N, output impedance) and treats audibility thresholds as the arbiter. Strongest on source gear (DAC/amp); routinely debunks marketing and is skeptical of subjective tone claims. Trust its objective numbers highly; note it can under-weight genuine transducer preference, fit and usability.",
     "lean_tags": ["measurement-led", "objectivist", "source-gear-strong", "subjectivity-skeptic"],
     "covers": ["dac", "amp", "dap", "headphone"], "publishes_raw": true,
     "rig": "AP APx555 / GRAS 43AG", "tier": 1, "platforms": ["audiosciencereview.com"],
     "search_hints": ["site:audiosciencereview.com \"<model>\" review measurements"],
     "lang": "en", "verify_status": "seeded"},
    {"id": "oratory1990", "name": "oratory1990",
     "style_profile": "Rigorous transducer measurer on an industry-standard GRAS rig; publishes raw data and parametric EQ aligned to the Harman target. Reasoning is measurement-first and reproducible, with cautious, understated subjective notes. Trust its FR/measurements as Tier-1; its tuning judgments lean Harman-neutral.",
     "lean_tags": ["measurement-led", "harman-aligned", "eq-provider"],
     "covers": ["headphone", "iem"], "publishes_raw": true,
     "rig": "GRAS 43AG-7 (industry std)", "tier": 1, "platforms": ["reddit u/oratory1990", "oratory1990.github.io"],
     "search_hints": ["oratory1990 <model> measurement", "site:reddit.com/r/oratory1990 <model>"],
     "lang": "en", "verify_status": "seeded"},
    {"id": "crinacle", "name": "Crinacle (graph.hangout.audio / squig)",
     "style_profile": "Measures a huge IEM/headphone library (IEC-711 / GRAS) and hosts squig.link, but pairs the data with opinionated subjective ranking against his own IEF target. Blends objective curves with personal preference (somewhat note-weight and mid-bass sensitive). Trust the curves; treat the letter-grade rankings as informed-subjective.",
     "lean_tags": ["measurement-anchored", "subjective-ranking", "ief-target"],
     "covers": ["iem", "headphone"], "publishes_raw": true,
     "rig": "IEC 711 (IEMs) / GRAS (HP)", "tier": 1, "platforms": ["crinacle.com", "squig.link"],
     "search_hints": ["crinacle <model> review", "<model> site:squig.link"],
     "lang": "en", "verify_status": "seeded"},
    {"id": "rtings", "name": "RTINGS",
     "style_profile": "Highly standardized, repeatable consumer testing with published measurements and category scores. Methodical and consumer-framed (battery, ANC, comfort weigh into the score), less tuned to audiophile nuance. Trust its measurements and reproducibility; remember the headline scores are usage-weighted, not pure sound quality.",
     "lean_tags": ["standardized-test", "consumer-focused"],
     "covers": ["headphone", "tws", "iem"], "publishes_raw": true,
     "rig": "HMS II.3 / standardized", "tier": 1, "platforms": ["rtings.com"],
     "search_hints": ["rtings <model> review"], "lang": "en", "verify_status": "seeded"},
    {"id": "goldensound", "name": "GoldenSound",
     "style_profile": "Measurement-driven with an engineering and anti-marketing bent (notably technical debunks such as MQA). Combines bench data with careful subjective listening and discloses methodology. Trust its measurements and technical claims; its opinions are reasoned but carry a stated preference lean.",
     "lean_tags": ["measurement-led", "anti-marketing", "engineering"],
     "covers": ["dac", "amp", "dap", "headphone"], "publishes_raw": true,
     "rig": "AP analyzer", "tier": 2, "platforms": ["youtube GoldenSound", "goldensound.audio"],
     "search_hints": ["GoldenSound <model> review measurements"], "lang": "en", "verify_status": "seeded"},
    {"id": "resolve_ths", "name": "Resolve / The Headphone Show (Headphones.com)",
     "style_profile": "Measurement-informed trained-subjective: reasons from FR and a preference target while articulating perceptual nuance (timbre, stage) well. Balanced and education-oriented, with a mild commercial affiliation (Headphones.com). Trust the measurement framing; weigh subjective calls as expert-but-interested.",
     "lean_tags": ["measurement-informed", "trained-subjective"],
     "covers": ["headphone", "iem"], "publishes_raw": true,
     "rig": "GRAS / 711", "tier": 2, "platforms": ["youtube The Headphone Show", "headphones.com"],
     "search_hints": ["Resolve <model> review", "The Headphone Show <model>"], "lang": "en", "verify_status": "seeded"},
    {"id": "superreview", "name": "Super* Review",
     "style_profile": "IEM-focused reviewer who measures (711), writes detailed subjective impressions, and hosts a squig database. Pragmatic and tuning-literate, with a mild preference toward balanced/neutral-bright. Trust the curves; the impressions are informed and fairly calibrated.",
     "lean_tags": ["measurement-anchored", "subjective", "iem-focused"],
     "covers": ["iem", "headphone"], "publishes_raw": true, "rig": "711", "tier": 2,
     "platforms": ["squig.link", "youtube Super Review"],
     "search_hints": ["Super Review <model> iem"], "lang": "en", "verify_status": "seeded"},
    {"id": "zreviews", "name": "Z Reviews (Zeos)",
     "style_profile": "Entertainment-first, impression-led reviews with no formal measurements; high volume, enthusiastic, value-hunting. Tolerant of warm/colored and bass-forward sound, and hyperbole is common. Treat as a subjective signal and crowd-interest indicator; bias-correct the enthusiasm and warm tolerance.",
     "lean_tags": ["impression-led", "entertainment", "warm-tolerant", "value-focused"],
     "covers": ["headphone", "iem", "dac", "amp"], "publishes_raw": false,
     "rig": "none", "tier": 3, "platforms": ["youtube Z Reviews"],
     "search_hints": ["Z Reviews <model>"], "lang": "en", "verify_status": "seeded"},
    {"id": "erji", "name": "耳机大家坛 (erji.net)",
     "style_profile": "Veteran Chinese enthusiast forum with deep, experience-rich subjective impressions and long-term ownership notes, but little formal measurement. The community leans toward musicality, warm/analog tone and DAP/source-synergy discussion. Treat as subjective consensus with a warm-preference and gear-synergy lean; cross-check tonality against measurements.",
     "lean_tags": ["impression-led", "forum-consensus", "cn-community", "synergy-talk"],
     "covers": ["iem", "headphone", "dap"], "publishes_raw": false,
     "rig": "varies", "tier": 3, "platforms": ["erji.net", "bbs"],
     "search_hints": ["<model> site:erji.net 听感", "<model> 耳机大家坛 评测"], "lang": "zh", "verify_status": "seeded"},
    {"id": "smzdm", "name": "什么值得买 (smzdm)",
     "style_profile": "Consumer deal-and-review platform where impression rigor varies widely and posts carry promotional/affiliate risk. More useful for popularity, packaging and price-context signals than precise tonal accuracy. Treat as low-tier; verify any sound claim against a measurement source.",
     "lean_tags": ["impression-led", "consumer", "promo-risk"],
     "covers": ["iem", "headphone", "tws", "dac", "amp", "dap"], "publishes_raw": false,
     "rig": "none", "tier": 4, "platforms": ["smzdm.com"],
     "search_hints": ["<model> site:smzdm.com 评测"], "lang": "zh", "verify_status": "seeded"},
    {"id": "bilibili_audio", "name": "B站 数码/耳机区 (aggregate)",
     "style_profile": "Aggregate of Chinese video reviewers of very uneven methodology — a few measure, many are pure impression or sponsored. Judge each uploader individually at search time rather than trusting the platform. Useful for fit/feature demos and zeitgeist; verify tonal claims against measurements.",
     "lean_tags": ["mixed-quality", "per-uploader-varies", "video"],
     "covers": ["iem", "headphone", "tws", "dac", "amp", "dap"], "publishes_raw": false,
     "rig": "varies", "tier": 4, "platforms": ["bilibili.com"],
     "search_hints": ["<model> 测评 site:bilibili.com"], "lang": "zh", "verify_status": "seeded"}
  ]
}
```

- [ ] **Step 3: Validate JSON parses**

Run: `python3 -c "import json;json.load(open('2-hifi-review/references/source-registry.json',encoding='utf-8'));print('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add 2-hifi-review/references/source-registry.json 2-hifi-review/schemas/source-registry.schema.json
git commit -m "feat(2-hifi-review): seed style-profiled media roster + schema"
```

### Task 2: Web-refine roster style profiles (flip `verify_status` to `web_verified`)

**Files:**
- Modify: `references/source-registry.json`

- [ ] **Step 1: For each `sources[]` entry, run a verification search**

For each entry, use the WebSearch tool with a query like `"<name>" headphone review methodology measurements`. Refine the `style_profile` from **methodology evidence**, not reputation — confirm/adjust: does it publish measurements? what does it lean toward? how should its claims be weighted? Tighten the 2–3 sentences and `lean_tags` to match what the source actually does. Never compress a source into a single bucket.

- [ ] **Step 2: Set `verify_status` to `web_verified` on every refined entry**

Edit each entry's `verify_status`. Leave `seeded` only if a source could not be verified (note why in the `style_profile`).

- [ ] **Step 3: Re-validate JSON parses** (same command as Task 1 Step 3) → `ok`.

- [ ] **Step 4: Commit**

```bash
git add 2-hifi-review/references/source-registry.json
git commit -m "feat(2-hifi-review): web-refine roster style profiles"
```

### Task 3: `references/band-taxonomy.json` + schema

**Files:**
- Create: `references/band-taxonomy.json`, `schemas/band-taxonomy.schema.json`

- [ ] **Step 1: Write `references/band-taxonomy.json`**
```json
{
  "version": "0.1.0",
  "bands": [
    {"id": "sub_bass",     "hz": [20, 60],     "zh": "极低频", "en": "sub-bass",      "perception_zh": "下潜/震撼",   "perception_en": "rumble/slam"},
    {"id": "mid_bass",     "hz": [60, 200],    "zh": "中低频", "en": "mid-bass",      "perception_zh": "力度/温暖",   "perception_en": "punch/warmth"},
    {"id": "lower_mids",   "hz": [200, 500],   "zh": "下中频", "en": "lower-mids",    "perception_zh": "厚度/浑浊",   "perception_en": "body/mud"},
    {"id": "center_mids",  "hz": [500, 1000],  "zh": "中频",   "en": "center-mids",   "perception_zh": "人声主体",   "perception_en": "vocal body"},
    {"id": "upper_mids",   "hz": [1000, 3000], "zh": "上中频", "en": "upper-mids",    "perception_zh": "人声前倾/喊", "perception_en": "presence/shout"},
    {"id": "lower_treble", "hz": [3000, 6000], "zh": "低高频", "en": "lower-treble",  "perception_zh": "清晰/齿音",   "perception_en": "clarity/sibilance"},
    {"id": "mid_treble",   "hz": [6000, 10000],"zh": "中高频", "en": "mid-treble",    "perception_zh": "细节/刺耳",   "perception_en": "detail/harshness"},
    {"id": "air",          "hz": [10000, 20000],"zh": "极高频","en": "air",           "perception_zh": "空气感/亮泽", "perception_en": "air/sparkle"}
  ],
  "quanta_scale": [
    {"q": -3, "zh": "大幅不足", "en": "severely lacking"},
    {"q": -2, "zh": "偏少",     "en": "reduced"},
    {"q": -1, "zh": "略少",     "en": "slightly lacking"},
    {"q":  0, "zh": "中性",     "en": "neutral"},
    {"q":  1, "zh": "略多",     "en": "slightly elevated"},
    {"q":  2, "zh": "偏多",     "en": "elevated"},
    {"q":  3, "zh": "过量",     "en": "excessive"}
  ]
}
```

- [ ] **Step 2: Write `schemas/band-taxonomy.schema.json`**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "bands", "quanta_scale"],
  "additionalProperties": false,
  "properties": {
    "version": {"type": "string"},
    "bands": {"type": "array", "items": {
      "type": "object",
      "required": ["id", "hz", "zh", "en", "perception_zh", "perception_en"],
      "additionalProperties": false,
      "properties": {
        "id": {"type": "string"}, "hz": {"type": "array", "items": {"type": "number"}},
        "zh": {"type": "string"}, "en": {"type": "string"},
        "perception_zh": {"type": "string"}, "perception_en": {"type": "string"}
      }}},
    "quanta_scale": {"type": "array", "items": {
      "type": "object", "required": ["q", "zh", "en"], "additionalProperties": false,
      "properties": {"q": {"type": "integer"}, "zh": {"type": "string"}, "en": {"type": "string"}}}}
  }
}
```

- [ ] **Step 3: Validate parses** → `python3 -c "import json;json.load(open('2-hifi-review/references/band-taxonomy.json',encoding='utf-8'));print('ok')"` → `ok`.

- [ ] **Step 4: Commit**
```bash
git add 2-hifi-review/references/band-taxonomy.json 2-hifi-review/schemas/band-taxonomy.schema.json
git commit -m "feat(2-hifi-review): band taxonomy + quanta scale (single source of truth)"
```

### Task 4: `references/targets.json` + schema

**Files:**
- Create: `references/targets.json`, `schemas/targets.schema.json`

- [ ] **Step 1: Write `references/targets.json`** (band-level offsets vs the `center_mids` anchor = 0; approximate representations of each published target's band balance — values flagged for research validation in Task 18)
```json
{
  "version": "0.1.0",
  "anchor_band": "center_mids",
  "quanta_thresholds_db": {"neutral": 1.5, "slight": 4.0, "notable": 7.0},
  "peak_detection": {"min_prominence_db": 3.0},
  "targets": {
    "harman_ie_2019": {"label": "Harman In-Ear 2019", "applies_to": ["iem", "tws"],
      "band_levels_db": {"sub_bass": 6.0, "mid_bass": 4.0, "lower_mids": 0.5, "center_mids": 0.0,
        "upper_mids": 3.0, "lower_treble": 1.0, "mid_treble": -2.0, "air": -4.0}},
    "harman_oe_2018": {"label": "Harman Over-Ear 2018", "applies_to": ["headphone"],
      "band_levels_db": {"sub_bass": 4.0, "mid_bass": 3.0, "lower_mids": 0.5, "center_mids": 0.0,
        "upper_mids": 3.0, "lower_treble": 0.0, "mid_treble": -3.0, "air": -5.0}},
    "ief_neutral": {"label": "Crinacle IEF Neutral", "applies_to": ["iem", "tws"],
      "band_levels_db": {"sub_bass": 4.0, "mid_bass": 2.0, "lower_mids": 0.0, "center_mids": 0.0,
        "upper_mids": 2.0, "lower_treble": 0.5, "mid_treble": -2.0, "air": -3.0}},
    "diffuse_field": {"label": "Diffuse Field", "applies_to": ["iem", "headphone"],
      "band_levels_db": {"sub_bass": 0.0, "mid_bass": 0.0, "lower_mids": 0.0, "center_mids": 0.0,
        "upper_mids": 3.0, "lower_treble": 1.0, "mid_treble": 0.0, "air": -2.0}}
  }
}
```

- [ ] **Step 2: Write `schemas/targets.schema.json`**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "anchor_band", "quanta_thresholds_db", "targets"],
  "additionalProperties": false,
  "properties": {
    "version": {"type": "string"},
    "anchor_band": {"type": "string"},
    "quanta_thresholds_db": {"type": "object",
      "required": ["neutral", "slight", "notable"], "additionalProperties": false,
      "properties": {"neutral": {"type": "number"}, "slight": {"type": "number"}, "notable": {"type": "number"}}},
    "peak_detection": {"type": "object"},
    "targets": {"type": "object"}
  }
}
```

- [ ] **Step 3: Validate parses** → `ok`.

- [ ] **Step 4: Commit**
```bash
git add 2-hifi-review/references/targets.json 2-hifi-review/schemas/targets.schema.json
git commit -m "feat(2-hifi-review): target band-balance table + schema"
```

### Task 5: `references/source-gear-thresholds.json` + schema

**Files:**
- Create: `references/source-gear-thresholds.json`, `schemas/source-gear-thresholds.schema.json`

- [ ] **Step 1: Write `references/source-gear-thresholds.json`**
```json
{
  "version": "0.1.0",
  "competence_tiers_by_sinad_db": [
    {"tier": "transparent",  "min_sinad": 100},
    {"tier": "very_good",    "min_sinad": 90},
    {"tier": "adequate",     "min_sinad": 80},
    {"tier": "compromised",  "min_sinad": 0}
  ],
  "audible_transparency_note": "Most listeners cannot ABX distinguish sources above ~SINAD 90 / THD+N ~0.003% at matched level. Differences above this are engineering/feature, not sound.",
  "output_impedance_rule": {"damping_factor_min": 8, "explanation": "zout must be <= load/8 for <~1 dB FR deviation; multi-BA IEMs are most sensitive."},
  "drive_target_spl_db": 110,
  "hiss_risk_rule": {"high_if_target_sens_db_mw_gte": 118, "and_snr_db_lt": 110}
}
```

- [ ] **Step 2: Write `schemas/source-gear-thresholds.schema.json`**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "competence_tiers_by_sinad_db", "output_impedance_rule", "drive_target_spl_db"],
  "additionalProperties": false,
  "properties": {
    "version": {"type": "string"},
    "competence_tiers_by_sinad_db": {"type": "array", "items": {
      "type": "object", "required": ["tier", "min_sinad"], "additionalProperties": false,
      "properties": {"tier": {"type": "string"}, "min_sinad": {"type": "number"}}}},
    "audible_transparency_note": {"type": "string"},
    "output_impedance_rule": {"type": "object"},
    "drive_target_spl_db": {"type": "number"},
    "hiss_risk_rule": {"type": "object"}
  }
}
```

- [ ] **Step 3: Validate parses** → `ok`.

- [ ] **Step 4: Commit**
```bash
git add 2-hifi-review/references/source-gear-thresholds.json 2-hifi-review/schemas/source-gear-thresholds.schema.json
git commit -m "feat(2-hifi-review): source-gear competence + matching thresholds"
```

### Task 6: Prose references — `signature-glossary.md` + `research-bibliography.md`

**Files:**
- Create: `references/signature-glossary.md`, `references/research-bibliography.md`

- [ ] **Step 1: Write `references/signature-glossary.md`** with these exact sections (real content, not placeholders):
  - **Source orientation (writing a style_profile)** — a 2–3 sentence neutral description of *methodology* (does the source measure? what does it lean toward? how to weight it), never an insult; plus the rule that the skill re-judges orientation dynamically from each source's actual content rather than using fixed buckets.
  - **量感 descriptor → band table** — for each of the 8 bands, the canonical zh/en term and the perception phrase (mirror `band-taxonomy.json`).
  - **风格 labels** — `暖声/warm, 明亮/bright, V形/V-shape, 中频前倾/mid-forward, 暗声/dark, 均衡/neutral, 低频猛/bass-heavy, 混合/mixed` each with its one-line band-rule.
  - **Technicality terms (review-only)** — `声场/soundstage, 结像/imaging, 解析/resolution, 动态/dynamics, 瞬态/transient, 音色/timbre, 齿音/sibilance, 染色/coloration` each with a neutral definition.
  - **Normalization map** — a 2-column table mapping common free-text descriptors (both languages) to a canonical attribute, e.g. `厚 / warm / lush lower-mids → attr:lower_mids_elevated`; `齿音 / sibilant / piercing 6-8k → attr:lower_treble_peak`; `糊 / veiled / rolled-off treble → attr:treble_reduced`. At least 15 rows.

- [ ] **Step 2: Write `references/research-bibliography.md`** — a cited list (title + source + one-line relevance) covering: Harman target research (Olive & Welti), IEC 60318-4 (711) coupler, Diffuse-Field/IEF target rationale, audible transparency / SINAD thresholds (ABX literature), output-impedance damping rule. Mark any value used in `targets.json`/`source-gear-thresholds.json` that still needs validation.

- [ ] **Step 3: Commit**
```bash
git add 2-hifi-review/references/signature-glossary.md 2-hifi-review/references/research-bibliography.md
git commit -m "docs(2-hifi-review): bilingual glossary + research bibliography"
```

---

## Phase 2 — Fixtures + goldens (these define the engines' contracts; write before engines)

### Task 7: `evals/schema_check.py` (stdlib JSON-Schema subset validator)

**Files:**
- Create: `evals/schema_check.py`

- [ ] **Step 1: Write the validator** (supports the subset the schemas use: type, required, properties, additionalProperties:false, items, enum, minimum, maximum, const)
```python
#!/usr/bin/env python3
"""Minimal stdlib JSON-Schema (draft-07 subset) validator. No external deps."""
import json

def validate(inst, schema, path="$"):
    errs = []
    t = schema.get("type")
    if "enum" in schema and inst not in schema["enum"]:
        errs.append(f"{path}: {inst!r} not in enum {schema['enum']}")
    if "const" in schema and inst != schema["const"]:
        errs.append(f"{path}: {inst!r} != const {schema['const']!r}")
    if t == "object" or (t is None and isinstance(inst, dict) and "properties" in schema):
        if not isinstance(inst, dict):
            return errs + [f"{path}: expected object, got {type(inst).__name__}"]
        for r in schema.get("required", []):
            if r not in inst:
                errs.append(f"{path}: missing required '{r}'")
        props = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for k in inst:
                if k not in props:
                    errs.append(f"{path}: unexpected property '{k}'")
        for k, v in inst.items():
            if k in props:
                errs += validate(v, props[k], f"{path}.{k}")
    elif t == "array":
        if not isinstance(inst, list):
            return errs + [f"{path}: expected array"]
        if "items" in schema:
            for i, it in enumerate(inst):
                errs += validate(it, schema["items"], f"{path}[{i}]")
    elif t in ("number", "integer"):
        if isinstance(inst, bool) or not isinstance(inst, (int, float)):
            errs.append(f"{path}: expected {t}")
        else:
            if t == "integer" and not float(inst).is_integer():
                errs.append(f"{path}: expected integer")
            if "minimum" in schema and inst < schema["minimum"]:
                errs.append(f"{path}: {inst} < minimum {schema['minimum']}")
            if "maximum" in schema and inst > schema["maximum"]:
                errs.append(f"{path}: {inst} > maximum {schema['maximum']}")
    elif t == "string":
        if not isinstance(inst, str):
            errs.append(f"{path}: expected string")
    elif t == "boolean":
        if not isinstance(inst, bool):
            errs.append(f"{path}: expected boolean")
    return errs

def validate_file(inst_path, schema_path):
    with open(inst_path, encoding="utf-8") as f:
        inst = json.load(f)
    with open(schema_path, encoding="utf-8") as f:
        schema = json.load(f)
    return validate(inst, schema)
```

- [ ] **Step 2: Smoke-test it**

Run: `python3 -c "import sys;sys.path.insert(0,'2-hifi-review/evals');from schema_check import validate_file as v;print(v('2-hifi-review/references/band-taxonomy.json','2-hifi-review/schemas/band-taxonomy.schema.json'))"`
Expected: `[]` (empty = valid)

- [ ] **Step 3: Commit**
```bash
git add 2-hifi-review/evals/schema_check.py
git commit -m "test(2-hifi-review): stdlib json-schema subset validator"
```

### Task 8: Transducer FR fixtures + expected goldens

**Files:**
- Create: `evals/fixtures/warm_iem.csv`, `evals/fixtures/warm_iem.expected.json`
- Create: `evals/fixtures/vshape_tws.csv`, `evals/fixtures/vshape_tws.expected.json`
- Create: `evals/fixtures/neutral_hp.csv`, `evals/fixtures/neutral_hp.expected.json`

- [ ] **Step 1: Write `evals/fixtures/warm_iem.csv`** — a minimal but realistic raw FR (≥ 2 points per band; `freq,dB`). Construct so that, after anchor-normalisation to `harman_ie_2019`, bass is elevated and treble is reduced (→ warm). Use these rows:
```
20,78
40,77
60,75
120,73
200,70
350,66
700,64
1500,67
2500,68
4500,63
8000,58
14000,52
```

- [ ] **Step 2: Compute the expected JSON by hand-spec, but DO NOT hand-compute dev_db** — instead write `warm_iem.expected.json` after the engine exists. To keep TDD honest, for now write the *structural* expectation with the fields you are certain of (`signature.label_en` = `"warm"`, `category`, `target`) and leave `bands` to be filled when the engine is first run in Task 10 Step 3. Create the file with this skeleton:
```json
{
  "device": "fixture:warm_iem", "category": "iem",
  "target": "harman_ie_2019", "rig": "iec711",
  "signature": {"label_en": "warm"}, "precision": "quantitative"
}
```
(The full golden is frozen in Task 10 Step 3 once the engine output is reviewed and judged correct.)

- [ ] **Step 3: Write `evals/fixtures/vshape_tws.csv`** (bass↑ + treble↑, mids recessed):
```
20,82
40,81
60,79
120,75
200,70
350,64
700,62
1500,63
2500,66
4500,67
8000,66
14000,60
```
and `vshape_tws.expected.json` skeleton with `"category":"tws"`, `"target":"harman_ie_2019"`, `signature.label_en":"V-shape"`.

- [ ] **Step 4: Write `evals/fixtures/neutral_hp.csv`** (close to `harman_oe_2018` balance):
```
20,74
40,73.5
60,73
120,72
200,70.5
350,70
700,70
1500,71
2500,72.5
4500,70
8000,68
14000,65
```
and `neutral_hp.expected.json` skeleton with `"category":"headphone"`, `"target":"harman_oe_2018"`, `signature.label_en":"neutral"`.

- [ ] **Step 5: Commit**
```bash
git add 2-hifi-review/evals/fixtures/
git commit -m "test(2-hifi-review): transducer FR fixtures + golden skeletons"
```

### Task 9: Source-gear fixtures + eval-cases.json + schema

**Files:**
- Create: `evals/fixtures/transparent_dac.json`, `evals/fixtures/transparent_dac.expected.json`
- Create: `evals/fixtures/weak_amp_300ohm.json`, `evals/fixtures/weak_amp_300ohm.expected.json`
- Create: `evals/eval-cases.json`, `schemas/eval-cases.schema.json`

- [ ] **Step 1: Write source-gear input fixtures** (these are the *args* a caller would pass — stored as JSON for the harness):

`evals/fixtures/transparent_dac.json`:
```json
{"device": "fixture:transparent_dac", "class": "dac", "sinad": 118, "thdn": 0.00016, "snr": 122, "zout": 0.4, "power": "32:500,300:120", "target_z": 32, "target_sens": 104}
```
`evals/fixtures/weak_amp_300ohm.json`:
```json
{"device": "fixture:weak_amp", "class": "amp", "sinad": 95, "thdn": 0.002, "snr": 105, "zout": 10, "power": "32:80,300:9", "target_z": 300, "target_sens": 97}
```

- [ ] **Step 2: Write expected-JSON skeletons** (freeze fully in Task 11):

`transparent_dac.expected.json`:
```json
{"device": "fixture:transparent_dac", "class": "dac", "competence_tier": "transparent",
 "system_matching": {"damping_ok": true, "drives_adequately": true}}
```
`weak_amp_300ohm.expected.json`:
```json
{"device": "fixture:weak_amp", "class": "amp", "competence_tier": "very_good",
 "system_matching": {"damping_ok": false, "drives_adequately": false}}
```
(Note: weak_amp zout=10Ω vs 300Ω load → damping_factor 30 ≥ 8, so `damping_ok` is actually `true`; verify and correct in Task 11 — this skeleton intentionally only freezes once the engine runs.)

- [ ] **Step 3: Write `evals/eval-cases.json`** (the routing + behavior cases from spec §4.6):
```json
{
  "version": "0.1.0",
  "cases": [
    {"id": "happy.transducer.warm_iem", "type": "happy", "device_class": "transducer", "must_activate": true, "note": "raw FR -> warm 量感 vector"},
    {"id": "happy.transducer.compare", "type": "happy", "device_class": "transducer", "must_activate": true, "note": "two devices -> aligned delta table"},
    {"id": "happy.source.transparent_dac", "type": "happy", "device_class": "source", "must_activate": true, "note": "high SINAD -> transparent"},
    {"id": "happy.source.drive_match", "type": "happy", "device_class": "source", "must_activate": true, "note": "amp + 300ohm -> drive verdict"},
    {"id": "boundary.screenshot_only_fr", "type": "boundary", "device_class": "transducer", "must_activate": true, "note": "graph image -> qualitative precision"},
    {"id": "boundary.no_measurement", "type": "boundary", "device_class": "transducer", "must_activate": true, "note": "reviews only -> consensus profile + downgrade banner"},
    {"id": "boundary.conflicting_sources", "type": "boundary", "device_class": "transducer", "must_activate": true, "note": "Tier-1 vs dissent -> flag"},
    {"id": "cleaning.syndicated_dupes", "type": "cleaning", "device_class": "transducer", "must_activate": true, "note": "dedup to one, keep 3 source ids"},
    {"id": "cleaning.marketing_copy", "type": "cleaning", "device_class": "transducer", "must_activate": true, "note": "strip hype"},
    {"id": "cleaning.style_weighting", "type": "cleaning", "device_class": "transducer", "must_activate": true, "note": "pure-impression review vs measurement-backed source -> style-weight + record dissent"},
    {"id": "negative.buying_rec", "type": "negative", "must_activate": false, "note": "推荐 ¥1000 耳机"},
    {"id": "negative.eq_request", "type": "negative", "must_activate": false, "note": "EQ tuning"},
    {"id": "negative.speaker", "type": "negative", "must_activate": false, "note": "speakers out of scope"},
    {"id": "adversarial.fictional_model", "type": "adversarial", "must_activate": true, "note": "no evidence -> refuse to invent"},
    {"id": "adversarial.snake_oil_source", "type": "adversarial", "device_class": "source", "must_activate": true, "note": "warmer DAC claim -> measurements say transparent, hold line"}
  ]
}
```

- [ ] **Step 4: Write `schemas/eval-cases.schema.json`**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object", "required": ["version", "cases"], "additionalProperties": false,
  "properties": {
    "version": {"type": "string"},
    "cases": {"type": "array", "items": {
      "type": "object", "required": ["id", "type", "must_activate", "note"],
      "additionalProperties": false,
      "properties": {
        "id": {"type": "string"},
        "type": {"enum": ["happy", "boundary", "cleaning", "negative", "adversarial"]},
        "device_class": {"enum": ["transducer", "source"]},
        "must_activate": {"type": "boolean"},
        "note": {"type": "string"}
      }}}
  }
}
```

- [ ] **Step 5: Validate both parse + eval-cases validates against its schema**

Run: `python3 -c "import sys;sys.path.insert(0,'2-hifi-review/evals');from schema_check import validate_file as v;print(v('2-hifi-review/evals/eval-cases.json','2-hifi-review/schemas/eval-cases.schema.json'))"`
Expected: `[]`

- [ ] **Step 6: Commit**
```bash
git add 2-hifi-review/evals/fixtures/ 2-hifi-review/evals/eval-cases.json 2-hifi-review/schemas/eval-cases.schema.json
git commit -m "test(2-hifi-review): source-gear fixtures + eval-cases + schema"
```

---

## Phase 3 — Transducer engine `fr_analyze.py` (TDD)

### Task 10: Implement `scripts/fr_analyze.py` + freeze transducer goldens

**Files:**
- Create: `scripts/fr_analyze.py`, `schemas/fr-analysis.schema.json`
- Modify: `evals/fixtures/*_*.expected.json` (freeze full goldens)

- [ ] **Step 1: Write `schemas/fr-analysis.schema.json`**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["device", "category", "target", "rig", "alignment", "bands", "signature", "precision", "warnings"],
  "additionalProperties": false,
  "properties": {
    "device": {"type": "string"}, "category": {"enum": ["iem", "headphone", "tws"]},
    "target": {"type": "string"}, "rig": {"type": "string"},
    "alignment": {"type": "object", "required": ["method", "offset_db"], "additionalProperties": false,
      "properties": {"method": {"type": "string"}, "offset_db": {"type": "number"}}},
    "bands": {"type": "array", "items": {
      "type": "object", "required": ["id", "hz", "dev_db", "quanta", "label_zh", "label_en"],
      "additionalProperties": false,
      "properties": {"id": {"type": "string"}, "hz": {"type": "array", "items": {"type": "number"}},
        "dev_db": {"type": "number"}, "quanta": {"type": "integer", "minimum": -3, "maximum": 3},
        "label_zh": {"type": "string"}, "label_en": {"type": "string"}}}},
    "signature": {"type": "object", "required": ["label_zh", "label_en", "rule_fired"],
      "additionalProperties": false,
      "properties": {"label_zh": {"type": "string"}, "label_en": {"type": "string"}, "rule_fired": {"type": "string"}}},
    "precision": {"enum": ["quantitative", "qualitative"]},
    "warnings": {"type": "array", "items": {"type": "string"}}
  }
}
```

- [ ] **Step 2: Write `scripts/fr_analyze.py`**
```python
#!/usr/bin/env python3
"""Transducer objective engine: FR (freq,dB) + target -> band deviations, 量感, 风格."""
import argparse, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "references")

def load_json(name):
    with open(os.path.join(REF, name), encoding="utf-8") as f:
        return json.load(f)

def parse_fr(path):
    pts = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p for p in line.replace(",", " ").replace("\t", " ").split() if p]
            if len(parts) < 2:
                continue
            try:
                pts.append((float(parts[0]), float(parts[1])))
            except ValueError:
                continue
    if len(pts) < 8:
        sys.exit("ERR_FR_PARSE: <8 numeric points from %s" % path)
    pts.sort()
    return pts

def band_avg(pts, lo, hi):
    vals = [db for hz, db in pts if lo <= hz <= hi]
    return sum(vals) / len(vals) if vals else None

def to_quanta(dev, thr):
    a, s = abs(dev), (1 if dev >= 0 else -1)
    if a <= thr["neutral"]: return 0
    if a <= thr["slight"]: return s
    if a <= thr["notable"]: return s * 2
    return s * 3

def qlabel(taxo, q):
    for it in taxo["quanta_scale"]:
        if it["q"] == q: return it
    return {"zh": "?", "en": "?"}

def qof(bands, bid):
    for b in bands:
        if b["id"] == bid: return b["quanta"]
    return 0

def signature(bands):
    bass = (qof(bands, "sub_bass") + qof(bands, "mid_bass")) / 2.0
    mids = (qof(bands, "lower_mids") + qof(bands, "center_mids") + qof(bands, "upper_mids")) / 3.0
    treb = (qof(bands, "lower_treble") + qof(bands, "mid_treble") + qof(bands, "air")) / 3.0
    def L(zh, en, rule): return {"label_zh": zh, "label_en": en, "rule_fired": rule}
    if max(qof(bands, "sub_bass"), qof(bands, "mid_bass")) >= 2 and treb <= 0:
        return L("低频猛", "bass-heavy", "a bass band>=2 & treble<=0")
    if bass >= 1 and treb >= 1 and mids <= 0.5:
        return L("V 形", "V-shape", "bass>=1 & treble>=1 & mids<=0.5")
    if bass >= 1 and treb <= -0.5:
        return L("暖声", "warm", "bass>=1 & treble<=-0.5")
    if treb >= 1 and bass <= 0:
        return L("明亮", "bright", "treble>=1 & bass<=0")
    if qof(bands, "upper_mids") >= 1 and bass <= 0:
        return L("中频前倾", "mid-forward", "upper_mids>=1 & bass<=0")
    if treb <= -1:
        return L("暗声", "dark", "treble<=-1")
    if max(abs(bass), abs(mids), abs(treb)) <= 1:
        return L("均衡", "neutral", "all sections within +/-1")
    return L("混合", "mixed", "no dominant rule")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fr")
    ap.add_argument("--target", required=True)
    ap.add_argument("--rig", default="unknown")
    ap.add_argument("--device", default="")
    ap.add_argument("--category", default="iem")
    args = ap.parse_args()

    taxo, targets = load_json("band-taxonomy.json"), load_json("targets.json")
    if args.target not in targets["targets"]:
        sys.exit("ERR_TARGET_UNKNOWN: %s" % args.target)
    tgt, thr, anchor = targets["targets"][args.target], targets["quanta_thresholds_db"], targets["anchor_band"]

    pts = parse_fr(args.fr)
    raw = {b["id"]: band_avg(pts, b["hz"][0], b["hz"][1]) for b in taxo["bands"]}
    if raw.get(anchor) is None:
        sys.exit("ERR_NO_ANCHOR: no data in %s" % anchor)
    offset = tgt["band_levels_db"][anchor] - raw[anchor]

    bands, warnings = [], []
    for b in taxo["bands"]:
        bid = b["id"]
        if raw[bid] is None:
            warnings.append("no_data_band:%s" % bid); continue
        dev = (raw[bid] + offset) - tgt["band_levels_db"][bid]
        q = to_quanta(dev, thr); lab = qlabel(taxo, q)
        bands.append({"id": bid, "hz": b["hz"], "dev_db": round(dev, 1), "quanta": q,
                      "label_zh": lab["zh"], "label_en": lab["en"]})
    out = {"device": args.device, "category": args.category, "target": args.target,
           "rig": args.rig, "alignment": {"method": "anchor_%s" % anchor, "offset_db": round(offset, 1)},
           "bands": bands, "signature": signature(bands), "precision": "quantitative", "warnings": warnings}
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run on each fixture, REVIEW the output for correctness, then freeze the goldens**

Run:
```bash
cd 2-hifi-review
python3 scripts/fr_analyze.py evals/fixtures/warm_iem.csv --target harman_ie_2019 --rig iec711 --device fixture:warm_iem --category iem
```
Confirm `signature.label_en == "warm"` and the band quanta are sane (bass `+`, treble `-`). If correct, save the full stdout as `evals/fixtures/warm_iem.expected.json`. Repeat for `vshape_tws.csv` (`--target harman_ie_2019 --category tws`, expect `V-shape`) and `neutral_hp.csv` (`--target harman_oe_2018 --rig gras --category headphone`, expect `neutral`). **If a signature is wrong, fix the fixture dB values or the `signature()` thresholds until the intended label is produced — do not freeze a wrong golden.**

- [ ] **Step 4: Verify goldens validate against the schema**

Run: `python3 -c "import sys,glob,json;sys.path.insert(0,'evals');from schema_check import validate as v;import json;s=json.load(open('schemas/fr-analysis.schema.json'));[print(g, v(json.load(open(g)),s)) for g in glob.glob('evals/fixtures/*_*.expected.json') if 'dac' not in g and 'amp' not in g]"`
Expected: each prints `[]`.

- [ ] **Step 5: Commit**
```bash
cd /Users/vince/playground/skill-developer
git add 2-hifi-review/scripts/fr_analyze.py 2-hifi-review/schemas/fr-analysis.schema.json 2-hifi-review/evals/fixtures/warm_iem.expected.json 2-hifi-review/evals/fixtures/vshape_tws.expected.json 2-hifi-review/evals/fixtures/neutral_hp.expected.json
git commit -m "feat(2-hifi-review): transducer FR engine + frozen goldens"
```

---

## Phase 4 — Source-gear engine `source_analyze.py` (TDD)

### Task 11: Implement `scripts/source_analyze.py` + freeze source goldens

**Files:**
- Create: `scripts/source_analyze.py`, `schemas/source-analysis.schema.json`
- Modify: `evals/fixtures/transparent_dac.expected.json`, `evals/fixtures/weak_amp_300ohm.expected.json`

- [ ] **Step 1: Write `schemas/source-analysis.schema.json`**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["device", "class", "measured", "competence_tier", "system_matching", "warnings"],
  "additionalProperties": false,
  "properties": {
    "device": {"type": "string"}, "class": {"enum": ["dac", "amp", "dac_amp", "dap"]},
    "measured": {"type": "object", "required": ["sinad_db", "thdn_pct", "snr_db", "zout_ohm"],
      "additionalProperties": false,
      "properties": {"sinad_db": {"type": "number"}, "thdn_pct": {"type": "number"},
        "snr_db": {"type": "number"}, "zout_ohm": {"type": "number"}}},
    "competence_tier": {"enum": ["transparent", "very_good", "adequate", "compromised"]},
    "system_matching": {"type": "object",
      "required": ["target_z_ohm", "damping_factor", "damping_ok", "max_spl_db", "drives_adequately", "hiss_risk"],
      "additionalProperties": false,
      "properties": {"target_z_ohm": {"type": "number"}, "target_sens_db_mw": {"type": "number"},
        "damping_factor": {"type": "number"}, "damping_ok": {"type": "boolean"},
        "max_spl_db": {"type": "number"}, "drives_adequately": {"type": "boolean"},
        "hiss_risk": {"enum": ["low", "medium", "high", "unknown"]}}},
    "warnings": {"type": "array", "items": {"type": "string"}}
  }
}
```

- [ ] **Step 2: Write `scripts/source_analyze.py`**
```python
#!/usr/bin/env python3
"""Source-gear engine: measured metrics -> competence tier + system matching."""
import argparse, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "references")

def load_json(name):
    with open(os.path.join(REF, name), encoding="utf-8") as f:
        return json.load(f)

def tier_for(sinad, tiers):
    for t in tiers:  # assumed ordered high->low
        if sinad >= t["min_sinad"]:
            return t["tier"]
    return tiers[-1]["tier"]

def parse_power(s):
    out = {}
    for pair in s.split(","):
        if ":" in pair:
            load, mw = pair.split(":")
            out[float(load)] = float(mw)
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--device", default="")
    ap.add_argument("--class", dest="klass", default="dac")
    ap.add_argument("--sinad", type=float, required=True)
    ap.add_argument("--thdn", type=float, default=0.0)
    ap.add_argument("--snr", type=float, default=0.0)
    ap.add_argument("--zout", type=float, required=True)
    ap.add_argument("--power", default="")          # "load:mW,load:mW"
    ap.add_argument("--target-z", type=float, dest="tz", default=0.0)
    ap.add_argument("--target-sens", type=float, dest="tsens", default=0.0)  # dB/mW
    args = ap.parse_args()

    cfg = load_json("source-gear-thresholds.json")
    tier = tier_for(args.sinad, cfg["competence_tiers_by_sinad_db"])
    warnings = []

    sm = {"target_z_ohm": args.tz, "damping_factor": 0.0, "damping_ok": False,
          "max_spl_db": 0.0, "drives_adequately": False, "hiss_risk": "unknown"}
    if args.tz > 0:
        df = round(args.tz / args.zout, 1) if args.zout > 0 else 9999.0
        sm["damping_factor"] = df
        sm["damping_ok"] = args.zout <= args.tz / cfg["output_impedance_rule"]["damping_factor_min"]
        if not sm["damping_ok"]:
            warnings.append("high_output_impedance_vs_load")
        if args.tsens > 0 and args.power:
            pw = parse_power(args.power)
            # nearest available load at/above target, else max available
            cand = [l for l in pw if l >= args.tz] or list(pw.keys())
            if cand:
                load = min(cand, key=lambda l: abs(l - args.tz))
                mw = pw[load]
                sm["max_spl_db"] = round(args.tsens + 10 * math.log10(mw), 1)
                sm["drives_adequately"] = sm["max_spl_db"] >= cfg["drive_target_spl_db"]
                if not sm["drives_adequately"]:
                    warnings.append("insufficient_power_for_%s_ohm" % int(args.tz))
        hr = cfg.get("hiss_risk_rule", {})
        if args.tsens >= hr.get("high_if_target_sens_db_mw_gte", 1e9) and args.snr and args.snr < hr.get("and_snr_db_lt", 0):
            sm["hiss_risk"] = "high"
        elif args.tsens >= 110:
            sm["hiss_risk"] = "medium"
        else:
            sm["hiss_risk"] = "low"
        if args.tsens > 0:
            sm["target_sens_db_mw"] = args.tsens

    out = {"device": args.device, "class": args.klass,
           "measured": {"sinad_db": args.sinad, "thdn_pct": args.thdn, "snr_db": args.snr, "zout_ohm": args.zout},
           "competence_tier": tier, "system_matching": sm, "warnings": warnings}
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run on the two source fixtures, review, freeze goldens**

Run:
```bash
cd 2-hifi-review
python3 scripts/source_analyze.py --device fixture:transparent_dac --class dac --sinad 118 --thdn 0.00016 --snr 122 --zout 0.4 --power "32:500,300:120" --target-z 32 --target-sens 104
```
Expect `competence_tier:"transparent"`, `damping_ok:true`, `drives_adequately:true`. Save full stdout to `evals/fixtures/transparent_dac.expected.json`.
Then:
```bash
python3 scripts/source_analyze.py --device fixture:weak_amp --class amp --sinad 95 --thdn 0.002 --snr 105 --zout 10 --power "32:80,300:9" --target-z 300 --target-sens 97
```
Expect `competence_tier:"very_good"`; damping_factor 30 → `damping_ok:true`; max_spl = 97 + 10·log10(9) ≈ 106.5 < 110 → `drives_adequately:false`. Save full stdout to `evals/fixtures/weak_amp_300ohm.expected.json` (correct the Task 9 skeleton's `damping_ok` to the engine's true value).

- [ ] **Step 4: Validate goldens vs schema**

Run: `python3 -c "import sys,json;sys.path.insert(0,'evals');from schema_check import validate as v;s=json.load(open('schemas/source-analysis.schema.json'));[print(g, v(json.load(open('evals/fixtures/%s'%g)),s)) for g in ['transparent_dac.expected.json','weak_amp_300ohm.expected.json']]"`
Expected: each `[]`.

- [ ] **Step 5: Commit**
```bash
cd /Users/vince/playground/skill-developer
git add 2-hifi-review/scripts/source_analyze.py 2-hifi-review/schemas/source-analysis.schema.json 2-hifi-review/evals/fixtures/transparent_dac.expected.json 2-hifi-review/evals/fixtures/weak_amp_300ohm.expected.json
git commit -m "feat(2-hifi-review): source-gear engine + frozen goldens"
```

---

## Phase 5 — Output contract + traceability gate

### Task 12: `schemas/evaluation.schema.json` + `scripts/validate_output.py` (TDD)

**Files:**
- Create: `schemas/evaluation.schema.json`, `scripts/validate_output.py`
- Create: `evals/fixtures/eval_good.json`, `evals/fixtures/eval_bad_untraced.json`

- [ ] **Step 1: Write `schemas/evaluation.schema.json`** (class-discriminated; shared backbone of `evidence` + `claims`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["device", "device_class", "evidence", "claims", "gaps", "trace"],
  "additionalProperties": false,
  "properties": {
    "device": {"type": "string"},
    "device_class": {"enum": ["transducer", "source"]},
    "language": {"enum": ["zh", "en", "bi"]},
    "tonal": {"type": "object"},
    "engineering": {"type": "object"},
    "literary_zh": {"type": "string"},
    "literary_en": {"type": "string"},
    "evidence": {"type": "array", "items": {
      "type": "object", "required": ["source_id", "tier", "freshness"],
      "additionalProperties": false,
      "properties": {"source_id": {"type": "string"}, "source_lean": {"type": "string"},
        "tier": {"type": "integer", "minimum": 1, "maximum": 4}, "freshness": {"type": "string"},
        "url": {"type": "string"}, "snippet": {"type": "string"}}}},
    "claims": {"type": "array", "items": {
      "type": "object", "required": ["text", "provenance", "source_ids", "confidence"],
      "additionalProperties": false,
      "properties": {"text": {"type": "string"},
        "provenance": {"enum": ["measured", "consensus", "prior"]},
        "source_ids": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "attribute": {"type": "string"}, "dissent": {"type": "string"}}}},
    "gaps": {"type": "array", "items": {"type": "string"}},
    "trace": {"type": "object", "required": ["skill_version", "loaded_source_ids", "environment_stability"],
      "additionalProperties": false,
      "properties": {"skill_version": {"type": "string"},
        "loaded_source_ids": {"type": "array", "items": {"type": "string"}},
        "environment_stability": {"enum": ["stable", "unstable"]}}}
  }
}
```

- [ ] **Step 2: Write a passing fixture `evals/fixtures/eval_good.json`**
```json
{
  "device": "Example IEM", "device_class": "transducer", "language": "bi",
  "evidence": [
    {"source_id": "crinacle", "source_lean": "measurement-anchored + subjective ranking", "tier": 1, "freshness": "2026-04", "snippet": "bass +6 dB vs IEF"},
    {"source_id": "erji", "source_lean": "impression-led, warm lean", "tier": 3, "freshness": "2026-03"}
  ],
  "claims": [
    {"text": "Sub-bass elevated (+2 量感).", "provenance": "measured", "source_ids": ["crinacle"], "confidence": 0.9, "attribute": "sub_bass"},
    {"text": "Soundstage above average.", "provenance": "consensus", "source_ids": ["erji", "crinacle"], "confidence": 0.6, "attribute": "soundstage", "dissent": "1/4 sources call it average"}
  ],
  "gaps": ["No distortion data found."],
  "trace": {"skill_version": "0.1.0", "loaded_source_ids": ["crinacle", "erji"], "environment_stability": "unstable"}
}
```

- [ ] **Step 3: Write a FAILING fixture `evals/fixtures/eval_bad_untraced.json`** (two seeded violations: a claim with an empty `source_ids`, and a transducer technicality tagged `measured`)
```json
{
  "device": "Bad Example", "device_class": "transducer", "language": "en",
  "evidence": [{"source_id": "asr", "source_lean": "measurement-absolutist", "tier": 1, "freshness": "2026-01"}],
  "claims": [
    {"text": "Best soundstage ever.", "provenance": "measured", "source_ids": [], "confidence": 0.5, "attribute": "soundstage"}
  ],
  "gaps": [],
  "trace": {"skill_version": "0.1.0", "loaded_source_ids": ["asr"], "environment_stability": "unstable"}
}
```

- [ ] **Step 4: Write the failing test first — `scripts/validate_output.py`**
```python
#!/usr/bin/env python3
"""Traceability + schema gate for an evaluation JSON. Exit 1 on any violation."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "evals"))
from schema_check import validate  # noqa: E402

TECHNICALITIES = {"soundstage", "imaging", "resolution", "dynamics", "transient", "timbre"}

def check(doc, schema):
    errs = validate(doc, schema)
    ev_ids = {e["source_id"] for e in doc.get("evidence", [])}
    for i, c in enumerate(doc.get("claims", [])):
        if not c.get("source_ids"):
            errs.append(f"claims[{i}]: no source_ids (untraceable)")
        for sid in c.get("source_ids", []):
            if sid not in ev_ids:
                errs.append(f"claims[{i}]: source_id '{sid}' not in evidence")
        if doc.get("device_class") == "transducer" and c.get("attribute") in TECHNICALITIES \
                and c.get("provenance") == "measured":
            errs.append(f"claims[{i}]: technicality '{c.get('attribute')}' tagged measured (must be consensus)")
        if doc.get("device_class") == "source" and "audibl" in c.get("text", "").lower() \
                and c.get("provenance") != "measured":
            errs.append(f"claims[{i}]: audible-difference claim not backed by measurement")
    return errs

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: validate_output.py <evaluation.json>")
    with open(os.path.join(HERE, "..", "schemas", "evaluation.schema.json"), encoding="utf-8") as f:
        schema = json.load(f)
    with open(sys.argv[1], encoding="utf-8") as f:
        doc = json.load(f)
    errs = check(doc, schema)
    for e in errs:
        print("VIOLATION:", e)
    print("OK" if not errs else "FAIL (%d)" % len(errs))
    sys.exit(0 if not errs else 1)

if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run on the good fixture → expect exit 0**

Run: `cd 2-hifi-review && python3 scripts/validate_output.py evals/fixtures/eval_good.json; echo "exit=$?"`
Expected: `OK` and `exit=0`.

- [ ] **Step 6: Run on the bad fixture → expect exit 1 with both violations**

Run: `python3 scripts/validate_output.py evals/fixtures/eval_bad_untraced.json; echo "exit=$?"`
Expected: two `VIOLATION:` lines (no source_ids; technicality tagged measured) and `exit=1`.

- [ ] **Step 7: Commit**
```bash
cd /Users/vince/playground/skill-developer
git add 2-hifi-review/schemas/evaluation.schema.json 2-hifi-review/scripts/validate_output.py 2-hifi-review/evals/fixtures/eval_good.json 2-hifi-review/evals/fixtures/eval_bad_untraced.json
git commit -m "feat(2-hifi-review): evaluation output contract + traceability gate"
```

---

## Phase 6 — SKILL.md + rules (always-loaded entry + progressive disclosure)

### Task 13: `evals/run_all.py` regression runner (wires L0 + L1 + determinism)

**Files:**
- Create: `evals/run_all.py`

- [ ] **Step 1: Write `evals/run_all.py`** (mirrors the sibling skill; adapts to two engines)
```python
#!/usr/bin/env python3
"""Regression runner for 2-hifi-review (stdlib only).
L0 schema (references + eval-cases + every golden) | L1 golden (engines == *.expected.json)
| determinism | output-gate (good passes, bad fails) | SKILL.md token budget."""
import glob, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from schema_check import validate, validate_file  # noqa: E402
SCH = os.path.join(ROOT, "schemas"); FIX = os.path.join(HERE, "fixtures")

def run(*a):
    p = subprocess.run([sys.executable, *a], capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr

def l0():
    errs = []
    pairs = [("references/band-taxonomy.json", "schemas/band-taxonomy.schema.json"),
             ("references/targets.json", "schemas/targets.schema.json"),
             ("references/source-gear-thresholds.json", "schemas/source-gear-thresholds.schema.json"),
             ("references/source-registry.json", "schemas/source-registry.schema.json"),
             ("evals/eval-cases.json", "schemas/eval-cases.schema.json")]
    for inst, sch in pairs:
        errs += [f"{inst}: {e}" for e in validate_file(os.path.join(ROOT, inst), os.path.join(ROOT, sch))]
    fr_s = json.load(open(os.path.join(SCH, "fr-analysis.schema.json")))
    for g in glob.glob(os.path.join(FIX, "*_*.expected.json")):
        if any(x in g for x in ("dac", "amp", "eval_")):
            continue
        errs += [f"{os.path.basename(g)}: {e}" for e in validate(json.load(open(g)), fr_s)]
    return errs

def l1():
    res = []
    for g in glob.glob(os.path.join(FIX, "*.expected.json")):
        base = os.path.basename(g)
        if base in ("eval_good.json", "eval_bad_untraced.json"):
            continue
        if base.endswith("_dac.expected.json") or base.endswith("amp_300ohm.expected.json"):
            inp = json.load(open(g[:-len(".expected.json")] + ".json"))
            args = [os.path.join(ROOT, "scripts", "source_analyze.py"),
                    "--device", inp["device"], "--class", inp["class"],
                    "--sinad", str(inp["sinad"]), "--thdn", str(inp["thdn"]), "--snr", str(inp["snr"]),
                    "--zout", str(inp["zout"]), "--power", inp["power"],
                    "--target-z", str(inp["target_z"]), "--target-sens", str(inp["target_sens"])]
        else:
            csvf = g[:-len(".expected.json")] + ".csv"
            exp = json.load(open(g))
            args = [os.path.join(ROOT, "scripts", "fr_analyze.py"), csvf,
                    "--target", exp["target"], "--rig", exp["rig"],
                    "--device", exp["device"], "--category", exp["category"]]
        rc, out, err = run(*args)
        ok = rc == 0 and json.loads(out) == json.load(open(g))
        res.append((base, ok))
    return res

def gate():
    rc_good, _, _ = run(os.path.join(ROOT, "scripts", "validate_output.py"), os.path.join(FIX, "eval_good.json"))
    rc_bad, _, _ = run(os.path.join(ROOT, "scripts", "validate_output.py"), os.path.join(FIX, "eval_bad_untraced.json"))
    return rc_good == 0 and rc_bad == 1

def entry_tokens():
    txt = open(os.path.join(ROOT, "SKILL.md"), encoding="utf-8").read()
    return round((len(txt) / 4 + len(txt.split()) * 1.3) / 2)

def main():
    ok = True
    print("== L0 schema =="); e0 = l0(); print("  PASS" if not e0 else "  FAIL")
    [print("   ", e) for e in e0]; ok &= not e0
    print("== L1 golden =="); g = l1()
    [print(f"  {'PASS' if p else 'FAIL'}  {n}") for n, p in g]
    ok &= all(p for _, p in g)
    print("== output gate =="); gg = gate(); print("  PASS" if gg else "  FAIL"); ok &= gg
    print("== SKILL.md tokens =="); t = entry_tokens(); print(f"  {t} (budget 900)"); ok &= t < 900
    print(f"\nRESULT: {'GREEN' if ok else 'RED'}")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run it (SKILL.md absent yet → token step will error; comment expectation)**

Run: `cd 2-hifi-review && python3 evals/run_all.py; echo "exit=$?"`
Expected: L0 PASS, L1 all PASS, output gate PASS; the SKILL.md token step raises FileNotFoundError. That's expected until Task 14 — proceed.

- [ ] **Step 3: Commit**
```bash
cd /Users/vince/playground/skill-developer
git add 2-hifi-review/evals/run_all.py
git commit -m "test(2-hifi-review): L0/L1/determinism/gate regression runner"
```

### Task 14: `SKILL.md` (always-loaded entry, < 900 tokens)

**Files:**
- Create: `2-hifi-review/SKILL.md`

- [ ] **Step 1: Write `SKILL.md`**
````markdown
---
name: 2-hifi-review
description: >
  Objective, source-traceable evaluation of HiFi gear. For transducers
  (IEM / headphone / TWS): 量感 (per-band quantity) + 风格 (signature) from
  frequency-response-vs-target, technicalities from review consensus. For
  source gear (DAC / amp / DAP): measured competence (SINAD/THD/output-Z/power)
  + system matching + chip/topology — a competent source is audibly transparent.
  Searches all sources (measurements, media reviews, specs/family) via a
  style-profiled media roster (orientation judged dynamically), cleans them, renders a bilingual
  verdict where every claim traces to evidence. Triggers: "客观评价这条耳机",
  "对比 A 和 B 的声音", "这个 DAC 素质如何 / 推得动吗", "$2-hifi-review".
  Not for: buying/价格 recommendations; EQ tuning; speakers; non-audio.
---

# hifi-review

Produce an **objective, evidence-traceable** evaluation of a HiFi device.
Evidence hierarchy: **① measurement/curve data (objective anchor) → ② media
reviews (corroboration + what measurement can't show) → ③ specs/family (low-weight
priors)**. Literary phrasing is allowed but **may never exceed or contradict the
evidence**. Output is **bilingual (中文 + English)**. Read-only — it writes only its
own report. **Accuracy ≫ speed.**

Two device classes, two objective models:
- **Transducer** (IEM/headphone/TWS) → 量感 + 风格 from FR-vs-target; technicalities
  from **review consensus only** (never tagged `measured`).
- **Source gear** (DAC/amp/DAP) → measured competence + system matching; chip/topology
  are priors. Resist玄学/snake-oil: if measurements say transparent, say so.

## Protocol — 8 steps (branches on device class)

1. **Scope & classify** — confirm objective eval/compare; set `device_class ∈ {transducer, source}`. Reject buying-rec / EQ / speakers / non-audio (redirect).
2. **Identify** — exact model + variant (cable/filter/pad/firmware), driver or chip/topology, sub-category (→ rig+target or measurement set). Disambiguate only if genuinely ambiguous.
3. **Gather (live)** — fetch per class; use `references/source-registry.json` to target known reviewers and locate a person's content. Record each source's tier + **style-lean** + freshness + language. See `rules/retrieval-playbook.md`.
4. **Clean & normalize (mandatory)** — dedup, strip marketing/non-evidence, normalize descriptors to the glossary, reconcile scales, flag outliers, **preserve provenance**. See `rules/data-cleaning.md`.
5. **Measure & quantize** — transducer: `python3 scripts/fr_analyze.py <fr> --target <id>`; source: `python3 scripts/source_analyze.py --sinad … --zout … [--target-z …]`. Screenshot-only FR → qualitative path. See `rules/tonal-mapping.md`, `rules/source-gear-eval.md`.
6. **Corroborate** — transducer: technicalities from cleaned consensus, **style-weighted** (measurement-backed high-trust; impression-led bias-corrected), N/M agreement, flag conflicts (`rules/technicalities-from-reviews.md`). source: engineering + transparency verdict.
7. **Synthesize** — class-discriminated profile + bilingual literary render; tag each claim `measured|consensus|prior` + confidence; mark gaps "证据不足". See `rules/literary-rendering.md`; compare → `rules/comparison-mode.md`.
8. **Self-verify** — `python3 scripts/validate_output.py <out.json>` (schema + traceability). Emit `trace`. Never proceed past a FAIL.

Always obey `rules/accuracy-guardrails.md`: never invent a dB value or curve; never
compare incompatible rigs/targets without a flag; record dissent, don't average it away.

## Modules

| File | When to load |
|------|--------------|
| `rules/retrieval-playbook.md` | Step 3 — where to find curves/reviews/specs per class; squig export; screenshot read; stop rule |
| `rules/data-cleaning.md` | Step 4 — dedup / de-market / normalize / reconcile / flag / provenance |
| `rules/tonal-mapping.md` | Step 5 (transducer) — band table, dB→量感 thresholds, 风格 rules |
| `rules/technicalities-from-reviews.md` | Step 6 (transducer) — review-only attributes, consensus + style weighting |
| `rules/source-gear-eval.md` | Step 5–6 (source) — SINAD/THD/Zout/power tiers, transparency, chip/topology, matching |
| `rules/accuracy-guardrails.md` | Always — rig/target compatibility, never-invent, conflict handling, EOL/freshness |
| `rules/literary-rendering.md` | Step 7 — anchored 文学化, provenance tags, bilingual rendering, forbidden over-claims |
| `rules/comparison-mode.md` | Comparison — target/rig alignment, per-band delta table, not-comparable rule |
| `references/source-registry.json` | Step 3/6 — style-profiled media roster + search hints |
| `references/band-taxonomy.json`, `references/targets.json` | Step 5 transducer single sources of truth |
| `references/source-gear-thresholds.json` | Step 5 source single source of truth |
| `references/signature-glossary.md` | Steps 4,7 — bilingual term + normalization map; how to write a source style_profile |

## Scripts

| File | Usage |
|------|-------|
| `scripts/fr_analyze.py <fr.csv> --target <id> [--rig --device --category]` | transducer engine → band Δ / 量感 / 风格 JSON |
| `scripts/source_analyze.py --sinad N --zout N [--power "32:250" --target-z --target-sens]` | source engine → competence tier + matching JSON |
| `scripts/validate_output.py <evaluation.json>` | schema + traceability gate (exit 1 on violation) |
| `evals/run_all.py` | L0 schema + L1 golden + determinism + output gate + token budget |
````

- [ ] **Step 2: Run the regression runner — now fully green**

Run: `cd 2-hifi-review && python3 evals/run_all.py; echo "exit=$?"`
Expected: `RESULT: GREEN`, `exit=0`, and the token line under 900.

- [ ] **Step 3: If tokens ≥ 900**, move the Scripts table detail into a comment or trim prose until under budget; re-run. Do not drop a module row.

- [ ] **Step 4: Commit**
```bash
cd /Users/vince/playground/skill-developer
git add 2-hifi-review/SKILL.md
git commit -m "feat(2-hifi-review): SKILL.md entry (protocol + module/script tables)"
```

### Task 15: The eight `rules/*.md` files

**Files:**
- Create: `rules/retrieval-playbook.md`, `rules/data-cleaning.md`, `rules/tonal-mapping.md`, `rules/technicalities-from-reviews.md`, `rules/source-gear-eval.md`, `rules/accuracy-guardrails.md`, `rules/literary-rendering.md`, `rules/comparison-mode.md`

Each file is prose guidance the agent loads on demand. Write the **actual content** below (condensed but complete — no "fill in later").

- [ ] **Step 1: `rules/retrieval-playbook.md`** — sections: *Per-class source order* (transducer: squig.link/Crinacle → oratory1990 → RTINGS → reviews → specs; source: ASR → manufacturer/AP measurements → reviews → chip/topology). *Finding a person's content*: read `source-registry.json[].search_hints`, substitute `<model>`. *Reading squig.link*: how to get raw txt (the `?share=` export / the per-measurement `.txt`); prefer raw over screenshot. *Screenshot path*: when only an image exists, read the curve shape qualitatively, set `precision:"qualitative"`, never invent dB. *Stop rule*: stop when you have ≥1 Tier-1 measurement + ≥2 independent reviews (or have exhausted sources); log what's missing.

- [ ] **Step 2: `rules/data-cleaning.md`** — the mandatory Step-4 pipeline, in order: *Ingest* (each item → source_id + tier + style-lean + freshness + lang). *Dedup* (collapse syndicated/identical text; keep all contributing source_ids). *De-market* (drop manufacturer copy, sponsored/affiliate hype, unsubstantiated superlatives; keep only evidence-bearing claims). *Normalize* (map descriptors to canonical attributes via `signature-glossary.md`). *Reconcile scales* (star/“8/10”/“good” → direction+magnitude or keep qualitative). *Flag* (mark sources contradicting Tier-1 measurement or consensus; down-weight low tier; **record dissent, never delete it**). *Provenance* (every surviving claim keeps backward links). Output = canonical evidence set feeding Steps 5–6.

- [ ] **Step 3: `rules/tonal-mapping.md`** — restate the 8 bands + Hz from `band-taxonomy.json`; the dB→量感 thresholds (≤1.5→0, ≤4→±1, ≤7→±2, >7→±3); the 风格 rules **exactly as encoded in `fr_analyze.py.signature()`** (bass-heavy, V-shape, warm, bright, mid-forward, dark, neutral, mixed) so prose and code stay in lockstep; a note that the engine is band-resolution and sharp peaks are handled as separate flagged features.

- [ ] **Step 4: `rules/technicalities-from-reviews.md`** — the review-only attribute set (soundstage, imaging, resolution, dynamics, transient, timbre); each rated on a 5-point scale **with an N/M agreement count**; **style weighting**: measurement-backed claims → high trust regardless of source; impression-led → treat as subjective, bias-correct a warm-preference lean and **down-weight but never discard**; orientation judged from each source's actual content, not a fixed bucket; the hard rule that none of these may be tagged `provenance:"measured"`.

- [ ] **Step 5: `rules/source-gear-eval.md`** — the SINAD competence tiers (from `source-gear-thresholds.json`); the audible-transparency principle (above ~SINAD 90 differences are engineering/feature, not sound); output-impedance damping rule (`zout ≤ load/8`) and what high zout does to multi-BA IEMs; power→max-SPL drive check; hiss-risk heuristic; chip/topology (ESS/AKM/Cirrus/BB/R-2R, op-amp vs discrete, Class A/AB) as **low-weight priors only**; the explicit snake-oil guardrail.

- [ ] **Step 6: `rules/accuracy-guardrails.md`** — never invent a dB value or curve shape; IEC 711 (IEM) vs GRAS (headphone) and cross-measurer curves are **not** directly comparable without a flag; conflicting sources → report disagreement with counts, don't average; note EOL/discontinued + measurement date; IEM insertion-depth + unit-to-unit channel imbalance caveats; copyright/ToS (short cited snippets only, respect rate limits).

- [ ] **Step 7: `rules/literary-rendering.md`** — the rule that literary language *colors* but never *exceeds* a Stage-B/C/D fact; each rendered sentence must map to ≥1 claim with provenance + confidence; bilingual rendering (中文 first then English, or paired); a worked before/after example (raw band vector → accurate-but-literary 中英 paragraph); the forbidden list (superlatives without evidence, audible claims for transparent sources, technicalities stated as measured).

- [ ] **Step 8: `rules/comparison-mode.md`** — align both devices to the **same** target + rig before comparing; emit a per-band delta table (A.quanta − B.quanta); state when devices are **not comparable** (different rig/target with no common ground) and refuse a false-precision verdict; carry every comparative claim's provenance + confidence.

- [ ] **Step 9: Commit**
```bash
git add 2-hifi-review/rules/
git commit -m "docs(2-hifi-review): eight on-demand rules files"
```

---

## Phase 7 — meta four-piece + packaging

### Task 16: `meta/` four-piece acceptance set

**Files:**
- Create: `meta/skill-design-record.json`, `meta/metric-plan.json`, `meta/release-checklist.json`

- [ ] **Step 1: Write `meta/metric-plan.json`** (the accuracy-gating set from spec §4.7)
```json
{
  "schema_version": "1.0.0",
  "skill_id": "skill.2-hifi-review",
  "required_metrics": [
    "tonal_band_accuracy", "signature_label_accuracy",
    "source_competence_tier_accuracy", "system_match_correctness",
    "claim_traceability_rate", "unsupported_claim_rate", "measured_vs_consensus_mistag_rate",
    "cleaning_dedup_recall", "marketing_strip_precision",
    "activation_precision", "false_positive_rate", "false_negative_rate",
    "pass_k_all", "variance", "cost_per_success", "loaded_context_tokens_p50"
  ],
  "gates": {
    "tonal_band_accuracy_min": 0.85,
    "signature_label_accuracy_min": 0.85,
    "source_competence_tier_accuracy_min": 0.85,
    "claim_traceability_rate_eq": 1.0,
    "unsupported_claim_rate_eq": 0.0,
    "measured_vs_consensus_mistag_rate_eq": 0.0,
    "activation_precision_min": 0.9
  },
  "non_gating_recorded": ["cost_per_success", "loaded_context_tokens_p50"],
  "notes": "Accuracy >> speed: cost/latency recorded, not gating."
}
```

- [ ] **Step 2: Write `meta/skill-design-record.json`** referencing the units by id (no duplicated prose)
```json
{
  "schema_version": "1.0.0",
  "skill_id": "skill.2-hifi-review",
  "version": "0.1.0",
  "trigger": {
    "must_activate_on": ["objective evaluation/comparison of IEM/headphone/TWS", "DAC/amp/DAP quality + drive-match", "supplying an FR link/CSV/screenshot to interpret"],
    "must_not_activate_on": ["buying/价格 recommendation", "EQ tuning", "speakers", "non-audio"],
    "device_classes": ["transducer", "source"],
    "risk_level": "low (read-only); primary risk is accuracy"
  },
  "execution_protocol_steps": ["scope_classify", "identify", "gather_live", "clean_normalize", "measure_quantize", "corroborate", "synthesize", "self_verify"],
  "resources": {
    "rules": ["retrieval-playbook", "data-cleaning", "tonal-mapping", "technicalities-from-reviews", "source-gear-eval", "accuracy-guardrails", "literary-rendering", "comparison-mode"],
    "references": ["source-registry", "band-taxonomy", "targets", "source-gear-thresholds", "signature-glossary", "research-bibliography"],
    "scripts": ["fr_analyze", "source_analyze", "validate_output"]
  },
  "control_boundaries": {
    "allowed_tools": ["Read", "Write(report only)", "Bash(engines/validator)", "network(retrieval)"],
    "forbidden": ["fabricating measured values/curves", "unsupported audible-difference claims", "unflagged cross-rig comparison", "wholesale copyright reproduction"],
    "evidence_rule": "every claim links >=1 source_id + provenance tag; dissent recorded"
  },
  "test_assets": {"eval_cases": "evals/eval-cases.json", "fixtures": "evals/fixtures/", "runner": "evals/run_all.py"},
  "metric_plan_id": "meta/metric-plan.json",
  "reference_ids": ["develop-principle:industrial_skill_design", "develop-principle:skill_testing_process", "develop-principle:quantitative_skill_metrics", "develop-principle:skill_lifecycle_governance"]
}
```

- [ ] **Step 3: Write `meta/release-checklist.json`** (the KB's 10 gates)
```json
{
  "schema_version": "1.0.0",
  "skill_id": "skill.2-hifi-review",
  "version": "0.1.0",
  "gates": [
    {"id": "structure", "desc": "trigger/protocol/resources/controls/tests/metrics/lifecycle present", "status": "pending"},
    {"id": "activation", "desc": "activation_precision>=0.9 on routing cases", "status": "pending"},
    {"id": "behavior", "desc": "end-to-end + trajectory + output-contract pass", "status": "pending"},
    {"id": "cost", "desc": "loaded_context recorded; SKILL.md<900 tokens", "status": "pending"},
    {"id": "control", "desc": "policy_violation_rate==0 (no fabrication, no unflagged cross-rig)", "status": "pending"},
    {"id": "regression", "desc": "run_all.py GREEN", "status": "pending"},
    {"id": "paired", "desc": "marginal_lift>0 vs no-skill (accuracy + traceability)", "status": "pending"},
    {"id": "version", "desc": "semver + CHANGELOG", "status": "pending"},
    {"id": "rollback", "desc": "known-good version + steps", "status": "pending"},
    {"id": "observability", "desc": "trace has skill_version + loaded_source_ids + environment_stability", "status": "pending"}
  ]
}
```

- [ ] **Step 4: Commit**
```bash
git add 2-hifi-review/meta/
git commit -m "docs(2-hifi-review): meta four-piece (design record, metric plan, release gates)"
```

### Task 17: Packaging — `agents/openai.yaml`, `CHANGELOG.md`, `README.md`

**Files:**
- Create: `agents/openai.yaml`, `CHANGELOG.md`, `README.md`

- [ ] **Step 1: Write `agents/openai.yaml`** — mirror the sibling skill's file (open `/Users/vince/.claude/skills/low-visibility-fix/agents/openai.yaml`, copy its shape, swap name/description to `2-hifi-review` and a one-line summary).

- [ ] **Step 2: Write `CHANGELOG.md`**
```markdown
# Changelog

## 0.1.0 — 2026-06-02
- Initial release. Two-track objective evaluation (transducer 量感/风格 + source-gear
  competence/matching), mandatory data-cleaning, style-profiled media roster, bilingual
  output, evidence-traceability gate. L0–L1 + output-gate regression green.
```

- [ ] **Step 3: Write `README.md`** — one-paragraph purpose, the 8-step protocol summary, how to run the three scripts + `evals/run_all.py`, and a pointer to the spec. Keep it short; deep content lives in `rules/` and `references/`.

- [ ] **Step 4: Commit**
```bash
git add 2-hifi-review/agents 2-hifi-review/CHANGELOG.md 2-hifi-review/README.md
git commit -m "chore(2-hifi-review): packaging (openai branding, changelog, readme)"
```

---

## Phase 8 — Integration, validation of reference values, release

### Task 18: Validate reference values against the bibliography

**Files:**
- Modify: `references/targets.json`, `references/source-gear-thresholds.json` (only if research disagrees)

- [ ] **Step 1: For each target's `band_levels_db`**, cross-check the relative band balance against the cited Harman/IEF/DF research in `research-bibliography.md` (use WebSearch if needed). Adjust values that are clearly off; keep the anchor at 0.

- [ ] **Step 2: If any value changes, re-run the transducer goldens** (Task 10 Step 3) — a target change shifts `dev_db`. Re-freeze any golden whose intended signature still holds; if a signature flips, fix the fixture, not the science.

- [ ] **Step 3: Run `evals/run_all.py` → GREEN.**

- [ ] **Step 4: Commit** (only if changed)
```bash
git add 2-hifi-review/references 2-hifi-review/evals/fixtures
git commit -m "fix(2-hifi-review): validate target/threshold values vs research"
```

### Task 19: Live activation + behavioral eval (agent-level, like the sibling skill)

**Files:**
- Create: `meta/live-eval-results.json`

- [ ] **Step 1: Routing test** — for each `evals/eval-cases.json` case, dispatch a fresh subagent with only the case `note` as the user turn and ask whether `2-hifi-review` should activate. Record predicted vs `must_activate`. Compute activation precision/recall.

- [ ] **Step 2: Behavioral test** — run one happy transducer case and the `adversarial.snake_oil_source` case end-to-end (with cached fixtures). Confirm: the happy case emits a schema-valid, gate-passing evaluation; the snake-oil case holds the line (no unsupported audible-difference claim).

- [ ] **Step 3: Write `meta/live-eval-results.json`** with the measured activation precision/recall and the two behavioral verdicts (mirror the sibling skill's file shape).

- [ ] **Step 4: Commit**
```bash
git add 2-hifi-review/meta/live-eval-results.json
git commit -m "test(2-hifi-review): live activation + behavioral evals"
```

### Task 20: Flip release gates, merge to main

**Files:**
- Modify: `meta/release-checklist.json` (gates → `pass`)

- [ ] **Step 1: Run the full regression once more** → `cd 2-hifi-review && python3 evals/run_all.py` → GREEN.

- [ ] **Step 2: Set each `release-checklist.json` gate `status` to `pass`** where evidence exists (regression GREEN, activation eval ≥0.9, SKILL.md<900, trace fields present). Leave any unmet gate `pending` with a note.

- [ ] **Step 3: Commit the checklist**
```bash
git add 2-hifi-review/meta/release-checklist.json
git commit -m "chore(2-hifi-review): mark release gates pass for 0.1.0"
```

- [ ] **Step 4: Merge to main** (use the `superpowers:finishing-a-development-branch` skill to choose merge vs PR). Default — merge locally:
```bash
git checkout main
git merge --no-ff 2-hifi-review -m "merge(2-hifi-review): objective hifi review skill 0.1.0"
```

- [ ] **Step 5: Verify the skill loads** — confirm `2-hifi-review/SKILL.md` frontmatter `name` is accepted by Claude Code. If a leading digit is rejected, set frontmatter `name: hifi-review` (keep the folder name), commit, and note in CHANGELOG.

---

## Self-review checklist (run before handing off)

**Spec coverage:** every spec §6 file has a task — roster (T1–2), band-taxonomy (T3), targets (T4), source-gear-thresholds (T5), glossary+bibliography (T6), schema_check (T7), fixtures+eval-cases (T8–9), fr_analyze (T10), source_analyze (T11), evaluation schema+validator (T12), run_all (T13), SKILL.md (T14), 8 rules (T15), meta four-piece (T16), packaging (T17), value validation (T18), live evals (T19), release+merge (T20). ✓

**Two-track + cleaning + roster + bilingual + accuracy-gating** all have concrete tasks. ✓

**Type consistency:** band ids, quanta range −3..3, source `style_profile`/`lean_tags` (no faction enum), provenance `measured|consensus|prior`, device_class `transducer|source`, engine output keys, and the `system_matching` field names are identical across schemas, engines, validator, and goldens. ✓

**No placeholders:** every code/schema/data step contains the actual content; rules files specify real section content, not "write rules here." ✓
