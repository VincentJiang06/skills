# Changelog — humanizer-academic

Versioning: the rewrite **behavior** is the public contract. A **breaking change**
is any shift in default rewrite aggressiveness or in the register floor (the
minimum formality the skill preserves). Those bump the major version.

## Candidate (not released) — pending E11 (target 4.1.0)

Incremental alignment to the skill-philosophy KB v0.4.0 (R20 wave, 2026-09-25,
built on claude-opus-5-5). `metadata.version` stays 4.0.0 until the pre-registered
E11 two-arm run passes; on a pass this heading becomes `4.1.0` (minor: the S2
settlement KEPT the contrast-frame quota, so default rewrite aggressiveness and the
register floors are unchanged — the major-bump rule does not fire). On a non-pass
the heading becomes `Candidate (not released) — <status>` and carries the evidence.

### Changed
- **Detector verdict is evidence, never a trigger** (P13/S14, A50). SKILL.md
  Boundary gains one sentence: `verdict` and `abstain_recommended` are
  in-sample-calibrated hints — never the reason to abstain or to rewrite, never a
  loop target ("rewrite until `human_like`" → one rewrite, then stop), never an
  authorship probability. Detector comments/docstring and the eval docs stop calling
  `ai_like` "the rewrite trigger". Comment-only: detector stdout is byte-identical
  (sha256) on all 98 corpus runs; no threshold, pattern or field changed.
- **Blind-judge vocabulary `pass | fail | unsure`** (iron law 6⑥, E11/A44): a judge
  that cannot decide from the texts (the source contradicts itself, a claim-strength
  change it cannot settle) says so instead of being forced into pass or fail. The
  marginal-lift check no longer calls the unedited source the "without-skill" arm —
  it proves "better than the source"; the bare-model comparison is the separate E11.
- **A42 settlement against Opus 5.5, rule by rule** (P11/Z8/A42, stamped A37):
  - S1 `lexical-en.md` §6 — the two single-word bullets (34 words) are **deleted**:
    a bare Opus 5.5 asked only to "make it read less like AI" removed 36/36
    occurrences of 12 sampled listed words in 3/3 drafts, so the list no longer
    changed behavior. Phrase tells and "never rewrite on word-presence alone" stay.
  - S2 academic contrast-frame quota (≤1 per document) — **kept**: the same bare
    model still left ≥2 frames in each of 3 frame-dense drafts (a fresh counter
    instance: 4/4/2; re-counted with an "unsure" exit: 3/4/2 certain). Stamp at the
    canonical residence (`academic-pack.md`), listing its five other residences.

- **Typical-path compression: the detector is off the default path** (zipper; P1
  context economy, Z2 per-path read tokens, A44 cost ceiling, P13 — a hint that
  cannot decide has no seat on the decision path). SKILL.md Protocol opens with
  the read order (this file + the draft until Step 1 decides to rewrite; no pack,
  no detector run to triage); Step 0.4 and the Step 5 re-run fire only on a user
  request for signals; Boundary gains one sentence saying so. Measured on the
  three E11 WITH cases, before vs after, n=1 each: detector calls 2 → 0, total input tokens −35% / −25% / ±0 (case 1/2/3),
  cost $0.657 → $0.627; decisions unchanged (abstain, rewrite, abstain; both
  abstains byte-verbatim) and a blind judge rated the new case-2 rewrite
  fidelity `pass`. Always-loaded SKILL.md +61 tokens.

### Fixed
- SKILL.md Eval section named `run_all_checks.py`, which never existed; it now names
  the three real harnesses and says `evals/` is source-repo only (A37 provenance).
- (folded from the former "Unreleased" note, a77b5be) `references/blind-judge-rubric.md`
  Track B pointed at `references/popsci-register.md`, a file that stopped existing in
  4.0.0; reference corrected to `popsci-pack.md` (documentation-only).
- evals/README counts: 115/115 → 129/129 detector checks; AI corpus 10+10 → 11+11.

### Erratum
- 3.1.0's gate was re-targeted to whole-document completeness **after** the results
  were seen. That is a new pre-registration, not a pass of the original experiment;
  the 3.1.0 numbers below stand as measured, not as a pre-registered gate pass (E9).

### Known limits and debt
- Unsettled since Opus 4.8 (X4): `popsci-pack.md`, `structural-signals.md`, the rest
  of `lexical-en.md`/`lexical-zh.md`, and the ADD moves — carried unchanged, to be
  probed rule by rule at the next settlement.
- Detector verdict thresholds are fitted in-sample on the same 27+22 corpus (X1);
  hence "hint", not verdict. Not recalibrated (would be an A50 event).
- Settlement and E11 AI samples come from one generator (claude-opus-5-5); users
  bring GPT/Kimi/Gemini text (U3). The 2026-06 multi-vendor fixtures stay as
  regression material.
- Blind judge has no A22 gold-alignment record (X3); same-family judging is
  instance-tier independence only (X6).

## 4.0.0 — Mode-split structural rebuild (2026-07-14)

**Major** — but NOT for the usual reason: the rewrite behavior, default
aggressiveness, and register floors are all unchanged. The major bump marks a
**ground-up structural rebuild** of the skill's load architecture, scope frozen
(same two modes academic/popsci, abstain-first, detector-as-diagnostic,
independent blind-judge oracle, zero net-new facts, EN/ZH). Built via the
skill-creator-max pipeline.

### Changed
- **Mode-split load architecture** (the win): the old 7 tangled reference files
  were re-carved along the exclusivity axis — mode-primary →
  `references/academic-pack.md` + `references/popsci-pack.md` (each
  self-contained), language-secondary → `references/lexical-en.md` +
  `references/lexical-zh.md`, shared non-exclusive →
  `references/structural-signals.md`; the blind-judge rubric stays standalone.
  Content was **losslessly absorbed** (32/32 coverage check; the detector script
  and the rubric are byte-identical to v3.2.0).
- **Measured token wins**: always-loaded SKILL.md 2,868 → 2,432 tok (−15%); the
  abstain path (the most common invocation) ~−35%; the academic-EN rewrite path
  ~−39% — an academic job no longer loads popsci content or the Chinese lexicon.

### Added / hardened
- **Fact-fidelity guard**: two worked NEGATIVES (a behavioral-inference
  "octopuses prefer to crawl" case + a named-entity-parallel "iron-based
  hemoglobin" case) + a sharpened Step-5 no-new-facts scan. Notably, the rebuild
  process found that the shipped v3.2.0 **itself** carried the hemoglobin
  fact-invention undetected — v4.0.0 catches it.

### Measured (blind-judge A/B vs v3.2.0, 12 files)
- **Quality held ≥ the prior version** — honest note: the win is structural,
  quality held rather than jumped. False-positive **0**, fact-invention **0**,
  ai_ness lift ≥ baseline.
- **Academic completeness genuinely improved**: one longform earned 4→5;
  +0.25 mean. Popsci quality unchanged (equal).
- Deterministic evals stay green: detector 129/129, calibrate strong-FP 0/27 +
  slop 4/4, behavioral 22/22.

### Unchanged (the load-bearing invariants)
- Abstain-first FP guard; zero net-new facts (hard fail); register floors; two
  modes; detector = diagnostic-only, blind judge = oracle.

## 3.2.0 — Contrast-frame quota + citation-shell rework + frame-first hardening (2026-07-06)

**Minor** (abstain-first and the register floors unchanged; SUBTRACT gains one
mandatory quota move in `academic`). Motivated by a comparative audit of
momo2young/humanize-academic-writing + a sourced sweep of 2024–2026 detection
research (Wikipedia AICATCH, Kobak et al. 2025 excess-vocab, Pangram phrase
ratios, 腾讯新闻 7-model ZH quantitative baseline, competitor skill survey).

### Changed
- **Contrast-frame compression is now MANDATORY with a quota in `academic`**
  (the "不是……而是……" fix): the 不是/并非……而是、这不仅是……更是、本质是/真正的
  X 是、"not just X, but Y" / "It's not X. It's Y." / "less about X than Y"
  family defaults to the direct claim; **at most ONE survivor per document**,
  only when the source argues both sides. Enforced in rewrite-protocol Step 2 +
  a new SKILL.md Step 5 verify check. Previously listed but advisory
  ("单次出现未必有问题") — which in practice meant it was never compressed.
- **Frame-first weighting**: era-drift note added (word tells decay each model
  generation; frames/structure age better) — SKILL.md Step 2 + english-patterns.
- **ZH punctuation calibration**: quantitative baseline shows ZH AI uses 破折号/
  引号 LESS than humans (排比/对偶 are the real 2–6× excess) — 破折号 stays
  drama-judged, never count-based; genre whitelist gains 文言/骈文.

### Added
- **Mechanical citation shells** family (EN §10b + ZH §9 引用壳): "According to
  research…", contentless "Smith (2020) discusses X", per-sentence parenthetical
  dumping → rework as scholars-as-agents using ONLY existing citations
  (rearrangement; zero added, zero dropped). Conditional ADD move in Step 3.
- **Over-claiming / novelty padding / speculative gap-filling** (EN §10a + ZH
  §7b): verb strength ≤ evidence strength, fixed DOWNWARD only ("proves"→
  "suggests", never strengthen a hedge); "for the first time"/首次提出/填补空白
  cut when unsubstantiated; never dress a guess as a finding.
- **Discipline-convention + non-native guards** (academic-register do-not-strip):
  ethnographic first-person/reflexivity, quant passive-heavy methods, ESL
  register are NOT tells (detectors flag real ESL prose at ~12× native rate).
- **Passive-voice density judgment** (place-aware: findings/discussion vs
  methods), connective-preserving deletes (never bare-delete a transition).
- **Punctuation-texture quota** in human-texture §3 (em-dash ≈1/300 words in EN
  academic prose, fragments rarer) + burstiness heuristic (no 3 consecutive
  same-length sentences).
- **Detector**: widened `negative_parallelism` (EN: isn't-just-about /
  less-about-than / this-isn't—it's; ZH: 并非……而是 / 这不仅是……更是 / 真正的
  X 是 / 的本质是) — amb tier, density-judged, popsci still drops the family;
  `hype` gains corpus-backed hp phrases (serves as a testament / the complex
  interplay of / would not be complete without). +14 pinned unit tests
  (`test_v32_patterns`), EN lexical §6 gains Kobak-2025 excess words.

### Unchanged (the load-bearing invariants)
- Abstain-first FP guard; zero net-new facts (hard fail); register floors;
  detector = diagnostic-only, blind judge = oracle.

## 3.1.0 — Per-mode completeness uplift (2026-06-23)

**Minor** (abstain-first and the register floors are unchanged — an additive quality
lift). Improves whole-document 完成度 in both modes, via a loop-constructor-designed
perf-uplift loop, validated by a hardened per-mode blind-judge eval + an independent
held-out attacker battery.

### Changed
- **Step 3 ADD is now required-when-triggered** (FP-safe — the abstain-first entry
  gate is unchanged, so ADD only fires on prose already judged worth rewriting):
  `academic` must surface a committed claim + promote a SOURCE-PRESENT specific;
  `popsci` must let one source-grounded analogy carry a point + land a grounded close.
- **Step 4** gains a whole-document arc note for long inputs (vary section openings;
  a synthesizing — not recap — conclusion; one through-line).
- **`references/blind-judge-rubric.md` rebuilt PER-MODE** (academic Track A + popsci
  Track B, each with a 完成度/completeness dimension; reserve-5 + paired source-vs-rewrite
  lift) — popsci completeness was previously unmeasurable (the rubric was academic-shaped).
- **`references/human-texture.md`** gains per-mode ADD worked examples.

### Measured (strict paired blind judge, whole-document priority)
- academic whole-document completeness **4.00 → 4.83**; popsci **4.17 → 4.83** (5-pt).
- over-editing on human prose **0**; fabrication **0**; deterministic harness green
  (detector 115/115, calibrate PASS, behavioral 22/22).
- **Held-out attacker battery: 2 rounds, both clean (HARDENED)** — generalizes across
  EN/ZH/mixed; no out-of-sample over-editing or fabrication; popsci craft preserved.

## 3.0.0 — Two modes + abstain-first (2026-06-21)

**Breaking** (default rewrite aggressiveness changes). Reworks the skill around
two complaints: too many false positives (over-editing good prose) and "not
useful enough".

### Added
- **Two modes** — `academic` (严肃学术论文) and `popsci` (科普严肃, serious
  popular science). Mode sets the register floor and what even counts as an AI
  tell: a rhetorical question / second person / vivid analogy is *craft* in
  popsci but a *slip* in a paper; a data triad / "significant" / numbered
  section is *normal* in a paper, not an AI tell. New `references/popsci-register.md`;
  `references/academic-register.md` gains a "do not strip" list.
- **Abstain-first protocol** — if the text already reads human for its mode, the
  skill returns it unchanged ("reads human; no rewrite needed"). It only rewrites
  when it can NAME specific removable AI signals. This is the false-positive fix
  at the protocol level.
- **Real-data eval** (`evals/corpus/`): 27 real published HUMAN excerpts
  (academic across 7 fields + serious popsci from The Conversation/NASA/Wikipedia,
  EN+ZH) and 20 AI-generated pieces. `evals/calibrate.py` reports detector FP/slop
  recall; the blind-judge workflow scores real rewrites (`evals/blind-judge-results.json`).

### Changed
- **Detector rewritten** (`scripts/detect_ai_signals.py`): repositioned as a
  low-false-positive SLOP-finder + diagnostic, NOT an AI classifier — real-data
  calibration showed modern serious AI and serious human prose overlap on every
  regex/statistical feature, so the LLM blind judge is the real oracle.
  - **Tiering**: `high_precision` (chat residue, hype, emoji, clickbait, uplift,
    templated shells — count fully) vs `ambiguous` (connectives, mild inflation,
    triads — a tell only at density).
  - **Context guards**: "statistically significant (p<.05)" no longer flagged;
    "powerful tool / robust standard errors / comprehensive review" no longer
    flagged; a three-item DATA enumeration is not a "forced triad" (parallelism +
    non-data required).
  - **Length-normalized** per-1000-token densities + an explicit
    `verdict`/`abstain_recommended`.
  - `--mode academic|popsci` flag.

### Results (real-data eval, 47 files)
- **0/27** human texts over-edited or fabricated (the over-editing complaint, fixed).
- **16/20** AI texts judged improved by the independent blind judge; **0** fabrication; **0** register breaks.
- Detector: **0** strong false positives, **100%** slop recall; unit tests 115/115.

## 2.0.1 — Detector fixes (2026-06-04)

Patch release. **Detect-only behavior only** — no change to default rewrite
aggressiveness or the register floor (the public rewrite contract is unchanged),
so this is not a breaking change. An independent battery found 5 bugs in
`scripts/detect_ai_signals.py`; each was fixed red-first (failing assertion →
fix), and both harnesses still exit 0 (`run_detector_tests.py` 32→46, all PASS;
`run_behavioral_checks.py` 22/22, unchanged).

### Fixed
- `split_sentences` no longer shatters decimals/percentages/abbreviations: a dot
  interior to a number (`3.5%`, `0.75`, `$1.2`) or inside a letter-dot chain
  (`U.S.`, `e.g.`) is masked before splitting, so statistics-heavy academic prose
  is no longer mis-counted (it was inflating `n_sentences` and `sentence_cv` on the
  exact domain this skill targets). A sentence-final `.` after a number still
  splits. (`GDP grew 3.5% in 2021.` → 1 sentence, was 2; `The U.S. economy…` → 1,
  was 3; `2021年GDP增长3.5%。` → 1, was 2.)
- `bold_label_list` now catches the dominant LLM `**Label:**` form (colon inside
  the bold), with or without a leading bullet, in both EN and ZH — previously only
  the `**Label**:` (colon outside) form fired. No double-counting of a single label.
- `report_shell` (EN) verb alternation extended with `provides|presents|offers|aims
  to provide` (previously only examines/analyzes/explores/investigates/discusses).

### Added
- New conservative `rule_of_three` structural family (EN `X, Y, and/or Z`; ZH
  甲、乙、丙) — an **authored heuristic** that resolves a code/doc mismatch (the
  docstring and `references/structural-statistical-signals.md` §A1 implied a triad
  detector that did not exist). Does not fire on two-item lists; may over-match a
  4+ item list via its trailing three items — caveat documented in code and §A1.

## 2.0.0 — Claude Code rebuild (2026-06-04)

Full rebuild from the Codex/OpenAI packaging into a Claude Code skill. **Breaking**
(version reset from 1.3.0): the entry point, mechanism, and acceptance model all
changed.

### Added
- Three-layer model as the protocol spine: **SUBTRACT** lexical + structural +
  statistical signals, then **ADD** defined academic human texture (authorial
  stance, source-grounded specificity, syntactic/paragraph burstiness, controlled
  asymmetry).
- `scripts/detect_ai_signals.py` — a **detect-only** deterministic detector
  returning a three-layer signal map (lexical hits / structural-pattern hits /
  burstiness statistics). Burstiness = coefficient of variation (population stdev /
  mean) of sentence and paragraph token-lengths; language-aware tokenization
  (1 CJK char or 1 `[A-Za-z0-9]+` run = 1 token).
- `references/human-texture.md` (the positive ADD target, EN+ZH examples) and
  `references/structural-statistical-signals.md` (the structural + statistical
  layer the old lexical denylist missed).
- `evals/` is now **skill-owned**: 10 AI papers + rubric copied to
  `evals/fixtures/`; `evals/blind-judge-rubric.md` (the independent oracle);
  `evals/run_detector_tests.py` (pinned detector unit tests, red-first);
  `evals/run_behavioral_checks.py` (mechanizable behavioral guards); worked
  rewrites under `evals/worked/` (1 EN + 1 ZH, with protocol traces).
- Trigger description now discriminates 3 adjacent false-triggers
  (academic-vs-casual humanizer, thesis-vs-poetry, detect-vs-rewrite).

### Changed
- SKILL.md ported to Claude Code frontmatter (`name` / `description` /
  `allowed-tools`); body is the SUBTRACT+ADD protocol with progressive disclosure.
- Pattern catalogues explicitly marked as **authored heuristics**.

### Removed
- `scripts/polish_english.py` — overfit eval-gaming (hardcoded to the Hong Kong
  test topic). Deleted.
- `scripts/scan_patterns.py` — superseded by the three-layer detector. Deleted.
- The closed-loop "density" metric (hits/1k-tokens of the very rules the skill
  removes) — retired in favor of the independent blind judge.
- Codex packaging `agents/openai.yaml` — moved to `legacy/` (rollback reference
  only; no longer the entry point).

### Release gate (blocks release)
Do not ship a change if any holds, judged on the eval fixtures:
- `register_preservation_score` drops vs the prior version (register-collapse), OR
- `fact_invention_rate > 0` on any worked rewrite (invented facts/numbers/cites), OR
- idempotency regresses (a second rewrite pass thrashes the first), OR
- `python3 evals/run_detector_tests.py` or `python3 evals/run_behavioral_checks.py`
  exits non-zero.

### Rollback
Revert to the prior tag and restore `legacy/openai.yaml` as the Codex entry point.
The legacy `../eval/` tree was left untouched (fixtures here are copies), so the
old workflow remains runnable.

## 1.3.0 — Codex/OpenAI skill (pre-rebuild)
Lexical-denylist humanizer packaged as `agents/openai.yaml`, with a closed-loop
density metric and sibling `../eval` Codex scripts. Retired by 2.0.0.
