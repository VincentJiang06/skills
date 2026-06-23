# Changelog — humanizer-academic

Versioning: the rewrite **behavior** is the public contract. A **breaking change**
is any shift in default rewrite aggressiveness or in the register floor (the
minimum formality the skill preserves). Those bump the major version.

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
