# Changelog — logic-pacer

All notable changes to this skill. Versioning is semantic; the version of record lives in
`SKILL.md` frontmatter `metadata.version`.

## 1.1.0

Incremental alignment (A40, R20 wave, 2026-09-25, Opus 5.5). Minor: the script's candidate
contract and the verify adjudication behaviour change. Each item names its anchor.

- **pace_checks.py token candidates narrowed by orthographic structure** (P13 / iron rule 2:
  no semantic judgment mechanised; A51 iii: no word lists, no NER). Digit-runs always; a
  CJK-dominant source keeps every Latin token (1.0.0 behaviour, byte-identical); a
  Latin-dominant source keeps only capitalised non-sentence-initial tokens and internal-caps
  tokens (acronyms, CamelCase). 1.0.0 treated every English word as a name: 188 false
  "missing name" hits on 70 real English pairs, 12 on the audit's one-sentence probe.
- **FP measured on all existing real corpus** (iron rule 7 / A50 ii): 70 ZH pairs 0 -> 0;
  70 EN pairs 188 -> 1 (Foucauldian, a real proper adjective); audit probe 12 -> 0; Quetelet
  worked example 0 -> 0; humanizer worked rewrites 854 -> 245 (scope mismatch + title-case
  headings); humanizer corpus 49 sources, Latin candidates 9,046 -> 548. New hits are a subset
  of old hits on every pair, so no new FP class can appear. Residual classes, reported and not
  patched: title-case headings and quoted titles, capitalised word after a colon, ALL-CAPS
  emphasis words.
- **New silent-failure class stated, not hidden**: a sentence-initial English name is not a
  candidate. The report names the candidate rule and verify step 1 says so; step 3 re-reads
  every attribution (INV-fidelity-no-silent-alteration; failure_cost c).
- **Battery fix F-R2: Chinese numerals disclosed as unchecked** (P10: the stated contract must
  match what the script does; INV-fidelity-no-silent-alteration; failure_cost c). Number
  candidates are runs of >=2 ASCII digits, so 十九→二十, 一八三五→一八四零, 三→两 gave zero hits
  while SKILL.md said "every digit-run". Now SKILL.md verify step 1, the report's
  `candidate_rule` text and both READMEs (boundary + ledger J4) say Chinese numerals are not
  script-checked; step 3 re-reads every Chinese-numeral date and count. Deliberately no new
  numeral matcher (iron rule 2 / P13: whether 三个 and 两个 is a real change or a legitimate
  trim is a judgment, and the fix default is prose). Candidate selection is unchanged: FP
  re-measured on R1-R7, every reading identical to before the fix.
- **Verify step 4 adjudicates every hit** (DEF-surface-flags-loud): each absent token is
  marked as a dropped name/number/attribution to confirm or a trim of a non-name, never
  silently deleted; zero hits is not "fidelity clean".
- **`--gate` removed**; the report says FLAGS, JSON keys `violations`/`clean` renamed to
  `flags`/`no_flags` plus `candidate_rule` (A49 single final-verdict residence: the script
  never decides pass/fail). selftest 13 -> 16 checks (English traps e1-e3), all 13 kept.
- **Runtime hygiene** (P10): removed the U3 build-time paragraph from SKILL.md and the U1/U3
  notes from the probe (U1's anchor-growth procedure is now in the README maintainer notes);
  probe D2 is stated generically (Quetelet entities only as an example); the probe's claim that
  raw fixtures live under `evals/` was false on disk and is removed.
- **model_baseline** stamp claude-opus-5-5 / 2026-09-25 (A37): the E11 evidence binds to it.
- **1.0.0 evidence claims have no artifact on disk**: `run_harness.py`, the 24-case corpus and
  "probe 4/4" below are self-reports only; no file was found in the installed skill, the source
  repo or the dev worktrees (P10). They are annotated here, not rewritten.
- **E11 two-arm run (A14/E11)**: three cases (ZH in-distribution, EN held-out, ZH held-out
  genre); WITH = this release, WITHOUT = bare model explicitly told not to load any skill; each arm
  its own copy of the source; pre-registered acceptance: L = 0, W >= 1, no WITH fidelity hard fail,
  WITH cost <= 3.0x. Run 1 (pre-battery-fix b24ce38) was judged W3/L0 but its judge saw the arm
  directory names, so it counts as direction only (`arms/_archive/run1-b24ce38/`). **Run 2 (this
  release's text, 6469808): W2 / L1 / T0 -> the pre-registered line is NOT met (gate_failed).**
  Case 1 (ZH, McNamara) WITH narrowly preferred: same leaps unfolded at 1.17x vs 1.26x, only
  inferences already in the source. Case 2 (EN, benchmarks) WITH preferred: same junctures at 1.17x
  vs 1.35x, tighter and closer to the author's register. Case 3 (ZH, black-hole encyclopedia lead,
  mostly followable) WITHOUT narrowly preferred: the WITH arm declined a two-sentence local swap
  (friction mentioned before the accretion disc) citing this skill's "NOT reorder points" rule, and
  the bare model's swap read better. No fidelity hard fail in any arm; every name and number
  survived; both arms' change reports were honest. Cost proxy (tool calls, tokens not exposed): WITH
  1.0x / 1.4x / 1.4x of WITHOUT, under the 3.0x line. Not retire_recommended (W = 2). **Resolution
  caveat**: N = 3, narrow margins, one same-family judge for all three cases, the blinding leaked
  again (the judge saw `with/` / `without/`, arm process notes unstripped), and the calibration
  controls have no recorded verdicts, so this is direction, not an effect size. Records:
  run dir `e11/verdicts.json`, `e11/cost.json`, `arms/judgement.md`.
- **Open question for the owner (not fixed, fix budget spent)**: case 3 suggests the anti-trigger
  "NOT reorder points" is being applied to a local two-sentence swap that repairs a leap (a premise
  used before it is introduced), which is arguably inside the skill's own job (tell #2). Whether to
  narrow that rule is a design ruling, left to the owner.
- **FP register R6** (iron rule 7): 12 arm outputs (run 1 + run 2), 1.0.0 check 6 ordinary-word
  hits -> 1.1.0 check 0; the judge found no name or number lost in any arm. Final re-measure on all
  registered corpora at release: R1 0 -> 0, R2 188 -> 1, R3 0 -> 0, R5 854 -> 245, R6 6 -> 0,
  R7 12 -> 0, R4 candidates 9,046 -> 548; pass line OK; selftest 16/16.
- **Battery** (instance tier: same model, fresh contexts; two rounds, one fix round, iron rule 3
  respected). Round 1 (b24ce38): seeds 5/5 hit; 10 confirmed = 1 P2 (F-R2, fixed in dda1d38) +
  9 P3. Round 2 (6469808): seeds 5/5 hit; 7 confirmed, all P3, 7 refuted, no P0/P1, none in the
  round-1 fix code, no fix round. **Open residuals (P3, carried, not fixed)**: `--terms` with two
  empty lists prints "none" instead of "not checked" (F-G2/F-06); a name after an abbreviation
  ending in "." (Dr., cf., e.g., U.S.) is not a candidate, so the "only sentence-initial names are
  unchecked" disclosure is incomplete (F-R3/F-07); an ASCII number changed into a superstring
  (20 -> 200, 15% -> 150%) is not flagged, substring test with no digit boundary (F-R4/F-08);
  other F-R4 false negatives (Gödel/Émile, single digits, empty source); malformed `--terms`
  gives a traceback (F-R5); the probe's "judge must reproduce these labels" cannot be run and no
  alignment record exists (F-EA1/F-09); the selftest's "stance" check cannot fail but counts in
  16/16 (F-EA2/F-11); the probe's A-POS-1 anchor file carries the builder's annotations (F-12);
  tell #2 reads "a premise the sentence it is introduced" (missing "in"), worded differently in
  the probe (F-14); worked-example attribution scope shift (F-C2); unsourced judge-bias
  superlative (F-EV2); Pinker quote drops "I know of" (F-EV3).
- Model-policy deviation (skill-creator-max policy of 2026-09-13 wants a Fable builder and Opus
  evaluators): at the owner's direction every role here (builder, attacker, adjudicator, E11 arms
  and judge, FP labeller) is Opus 5.5, so independence is instance-tier only, not model-tier.
- Carried under exemption: description length (E1), A-F tutorial settlement (E2), CJK anchor
  list (E3), probe calibration anchors Quetelet-only (E4), register check `--terms`-only (E5),
  the worked example's parenthetical about `evals/` (E6, flagged to the conductor).

## 1.0.0

First build (skill-creator-max engineer stage).

- SKILL.md spine: triage-abstain-gate · transform-a-f (six moves) · concision-length ·
  hard-constraints · verify-and-output. Thin orchestration + pointers; detail in references/.
- Trigger: slow the LOGIC pace of already-admired expository prose (reduce inferential step
  size, given-new re-anchoring) while keeping voice + vocabulary + facts/claims/stance and
  staying lean (net <= ~1.3x). Anti-trigger: de-AI (→humanizer-academic), simplify-words /
  对齐词汇, summarize/translate, reorder points, generate-new.
- references/: mechanisms (six-mechanism theory), anti-patterns (forbidden moves),
  worked-example-quetelet (canonical before/after, 1.267x), step-followability-probe
  (blind fresh-subagent cold-reader rubric).
- scripts/pace_checks.py: deterministic objective gates (length ratio, protected-term diff,
  fidelity-anchor presence proxy) with a --selftest that plants traps and proves discrimination.
  Read-only; measurement, not oracle.
- Evidence: red-before-green behavioral baseline (bare prompt), 24-case layer-tagged corpus,
  blind probe 4/4 alignment on the anchor set.
- Known design boundary: a silent stance/claim inversion that preserves entities and
  proposition count is UNSCRIPTABLE — kept as a model-level fidelity invariant + the blind
  probe, deliberately NOT downgraded to a countable check.
- Fix (battery breach, P2/P3): pace_checks fidelity was Quetelet-hardcoded and went vacuously
  "clean" on any other input. Generalised the fidelity gate to a corpus-independent check
  (every source Latin-name + digit-run must survive, works on any prose); made the
  register/downgrade word list OPTIONAL via `--terms FILE`, and — without it — the script now
  reports register as "not checked" instead of a false "none/clean". SKILL.md verify step-1
  description corrected to match. Added an off-corpus regression to run_harness.py proving the
  vacuity is closed (dropped name/date flagged generically; downgrade reported not-checked).
