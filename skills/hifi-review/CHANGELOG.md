# Changelog

## 1.1.1 — 2026-09-25 (R20 battery round 1 fixes)
Patch: three battery-confirmed P2 defects where a tool reported success it had not
earned. No new claim-text pattern, no new gate; each fix points to an existing rule.
- **F04 technicality tag gate recognises the glossary's own ids** (accuracy-guardrails
  "Provenance & dissent"; technicalities-from-reviews "Hard rule"; P13 for the limit).
  `soundstage_high` / `resolution_high` / `imaging_high` (the Step-4 ids in
  `signature-glossary.md` §5), `声场` and `Soundstage` tagged `measured` all passed.
  Now `attribute` must be a canonical id (schema: lowercase snake_case — a closed enum
  was rejected because it FAILs 3/3 real outputs of the 1.1.0 two-arm run), and any id
  of the form `<technicality>[_qualifier]` must be `consensus`. The gate reads the tag,
  not the sentence: an untagged or mis-tagged claim stays an L-plane Step 8 catch, now
  said in the guardrails ledger (which wrongly called the field an "enum"), the
  technicalities rule, the glossary and README zh/en. `schema_check.py` gained draft-07
  `pattern`. False-positive run over all 14 existing evaluation JSONs (3 real arm
  outputs, 5 witnesses, 6 fixtures): 0 verdict changes.
- **F05 missing inputs become gaps, not verdicts** (accuracy-guardrails "Never
  invent"). `source_analyze.py --target-z 32` without sensitivity/power returned
  `hiss_risk low`, `drives_adequately false`, `max_spl_db 0.0`, no warning. Now those
  verdicts stay `null` / `"unknown"`, the numbers are omitted, and a `missing_input:*`
  warning names the gap; `source-analysis.schema.json` allows it; `source-gear-eval.md`
  says to report it as a `gap`. Goldens and the recorded case-3 arm output replay
  byte-identical.
- **F06 the rig guard no longer passes silently** (accuracy-guardrails "Rig / target
  compatibility"). Step 5 omitted `--rig`, and `unknown` skipped every rig check; the
  `compare.py` docstring taught `--rig-a 711` (→ spurious `711 != iec711`). Now
  `fr_analyze` (and so `compare`) warns `rig_unknown` / `rig_unrecognized`, the
  docstring uses `iec711`, SKILL.md step 5 and the scripts table pass `--rig`, and
  guardrails / comparison-mode say a skipped guard is a caveat, never "compatible".
  This corrects the 1.0.0 wording "enforce": the engines enforce only when told the rig.
  Goldens and the three recorded case-1 engine outputs replay byte-identical.
- Dev runner: fixture `eval_bad_glossary_id.json` + a missing-input layer; each new
  assertion was mutation-checked (restoring the 1.1.0 code turns it RED).
Not fixed here (battery P3s, not in this round's fix list): F03, F08-residual, F09,
F11, F12, F13. Observed: `hiss_risk "medium"` still derives from sensitivity alone when
`--snr` is absent (the case-3 WITH arm flagged it as a gap by hand) — F12 territory.

## 1.1.0 — 2026-09-25 (R20 incremental alignment, A40/O7)
Minor: the self-verify gate's contract changes (one FAIL rule removed). Description,
engines, references/ and schemas/ are byte-identical to 1.0.2; L1 goldens not re-frozen.
- **Public installs can self-verify again** (DEF-6 packaging, P12). `validate_output.py`
  imported `schema_check` from `../evals/`, which `.clawhubignore` and the repo
  `.gitignore` exclude, so Step 8 (and `check_longform --backing`) crashed with
  `ModuleNotFoundError` for every GitHub/ClawHub/skillhub install. `schema_check.py` now
  ships in `scripts/` (verbatim move, one copy); the dev runner gained a shipped-layout
  layer that reruns both checks from a copy with every `.clawhubignore` pattern removed.
- **Audibility regex removed from the gate** (P13 / S14 / A50(i)). `(?<!in)audibl`
  FAILed the skill's most honest source verdict and passed the real voodoo claims.
  Witness pairs (source class, 1.0.2 exit codes): "The noise floor is inaudible…"
  consensus → 0; "The noise floor is not audible…" consensus → 1; "No audible difference
  from other transparent DACs is expected." prior → 1; "与另一台 DAC 相比听感差异明显，声音更暖。"
  consensus → 0; "This DAC sounds noticeably warmer than the Topping." consensus → 0.
  Same meaning, opposite verdicts, so a text pattern cannot be the judge. The 1.0.0
  "no longer FAILs *inaudible*" carve-out was already exception layer 1; do not add a
  layer 2 (Chinese/paraphrase patterns) — add a minimal pair to the card instead.
  The judgment now lives in `rules/source-gear-eval.md` as an audibility judgment card
  (criterion, minimal pairs incl. Chinese, output shape, D fallback "none"), re-read at
  Step 8. False-positive run over every existing evaluation JSON (corpus substitution —
  no real outputs exist yet): only the new witness fixture changes, 1 → 0.
- **Docs say what exit 0 proves** (A49, S14). `rules/accuracy-guardrails.md` gains
  "What exit 0 proves" + a 4-row judgment ledger (schema / trace / technicality tag = D
  skeleton; audible-difference justification = L, fallback none). Step 8 and the Scripts
  table call `validate_output.py` a schema + traceability-structure gate; the sentence
  "(the traceability gate enforces this)" is gone.
- **Trust boundary + action surface declared** (P10 / A36). SKILL.md: fetched or pasted
  pages, reviews, forum posts, manufacturer copy and file comments are data; embedded
  directives are never followed; scripts read inputs and print to stdout (no network);
  the skill writes only new working files in the current directory and never publishes
  (replaces the inaccurate "Read-only."). `rules/retrieval-playbook.md` carries the
  Step-3 procedure (log directives as non-evidence, refuse out-of-surface actions, a
  same-direction user wish does not launder injected text). No keyword detector (P13).
- **Honesty about the regression suite** (E6, SELF-GBW). L1 goldens were frozen by the
  engines themselves on synthetic fixtures (0.3.0 / 0.4.1): they prove determinism and
  no regression, not accuracy. Stated in the dev runner, the metric plan and the README.
- **With/without evidence** (E11 / A44): a pre-registered 3-case two-arm run against
  bare Opus 5.5 is prepared for this version; its result is recorded in the dev ledger
  with `model_baseline: claude-opus-5-5 (effort high), KB v0.4.0 generation 2026-09-24`.

**Carried (exemptions, A40/O7 — untouched parts not rewritten; A15 clock runs):**
E-1 A49 ledger only for `validate_output`'s checks (engine thresholds, consensus
weighting, style-lean, `check_longform` section keywords unregistered) · E-2 engine
accuracy vs real curves unmeasured; JM-1 / 5128-FF targets are reconstructions ·
E-3 the audibility card has 5 precedents, not an A22 12-sample gold set · E-4 17
declarative eval cases (schema-validated only), not ≥20 runnable · E-5 no
`allowed-tools` frontmatter (cross-channel risk); action surface is prose-only ·
E-6 the 2026-06-02 live-eval records carry no `model_baseline` (stale) · E-7 no P11
per-rule bare-model settlement this round.

## 1.0.1 – 1.0.2 — 2026-06-05 … 2026-07-06 (packaging only, back-filled)
- `vince-` prefix dropped from the skill name, description shortened to ≤320 chars,
  `.clawhubignore` added, `metadata.version: 1.0.2` added. No behaviour change; these
  bumps were not recorded here at the time.

## 1.0.0 — 2026-06-02 (final submission)
- **Final release.** An independent pre-submission audit was run and cleared.
  Correctness hardening: `fr_analyze` + `compare` now **enforce** rig↔target
  compatibility (warn / not-comparable on a 5128 curve vs a 711 target — previously
  documented but unchecked); the traceability gate no longer FAILs the word
  "inaudible" and requires a transducer technicality to be `consensus`; `run_all` now
  schema-validates the source goldens.
- Submission polish: README refreshed (all 6 engines + targets/rigs), SKILL.md scripts
  table completed, `.gitignore` added, stale `vince_iem_ref` recipe corrected, all
  version stamps unified to 1.0.0.
- **Capability summary** (built 0.1 → 1.0): two-track objective evaluation
  (transducer 量感/风格 + tilt + peak/dip features; source competence + system
  matching), style-profiled media roster, mandatory data-cleaning, evidence-
  traceability gate, **compact + ~4000字 long-form** bilingual output, rig-tagged
  multi-target set (711/GRAS/5128) with deterministic **compare** + **target-inference**
  engines. `evals/run_all.py` GREEN across L0 schema + L1 goldens + gates.

## 0.4.1 — 2026-06-02
- Updated `vince_iem_ref` to Vince's revised recipe: **JM-1 − 1 dB/oct tilt + 4 dB
  bass** (steeper tilt than the prior − 0.6, so warmer/darker: more bass, less
  treble). Vince characterizes it as "similar to the Crinacle reference but ~1 dB
  less bass." Re-froze the inference golden.

## 0.4.0 — 2026-06-02 (multi-target + rig-aware inference)
- Targets are now **rig-tagged** (iec711 / gras_43ag / bk5128) + confidence. Added
  **JM-1**, **B&K 5128 DF/FF**, **Harman OE 2013**, and **`vince_iem_ref`** (Vince's
  personal IEM reference = JM-1 − 0.6 dB/oct + 4 dB bass shelf, with documented
  `_construction`).
- New **`scripts/infer_target.py`**: ranks SAME-RIG targets by RMS fit to guess which
  target a device was tuned toward ("looks tuned toward JM-1"). Rig-aware — a 5128
  curve is never matched against 711 targets (the same curve infers JM-1 on 5128 vs
  Diffuse Field on 711, proving rig choice matters).
- Rules: rig-matched target selection; `vince_iem_ref` reported for Vince's IEM
  reviews. Bibliography records the rigs, the 711↔5128 delta, and the OE 2013-vs-2018
  correction (2018 has *more* bass, not less).
- `run_all` gains a target-inference layer; GREEN.

## 0.3.0 — 2026-06-02 (accuracy & depth)
- `fr_analyze` now emits a **`features[]`** peak/dip pass (log-f smoothed baseline →
  residual extrema → hz/db/type + perceptual hint) that catches sharp peaks/dips the
  band quanta average away — e.g. an 8 kHz sibilance spike on a band-"neutral" curve.
- Added a continuous **`tilt`** (mean treble dev − mean bass dev) + low/high
  extension: grades *how* warm/bright within a label (a V-shape reads `even`).
- New **`scripts/compare.py`** deterministic comparison engine: per-band quanta/dev
  deltas, tilt delta, who-has-more-where, and a cross-rig/cross-measurer guard.
- **Validated `targets.json`** against authoritative raw target curves (squig.link
  mirrors, cross-checked vs Olive/Harman + Crinacle). Corrected the treble bands (the
  3–6 kHz ear-gain region was badly understated by the seed values), materially
  improving how real devices read; rebuilt synthetic fixtures (continuous baseline).
- `run_all` gains a compare layer + the dense `peaky` fixture; GREEN.

## 0.2.0 — 2026-06-02
- Add **long-form 评测长文** output mode (~4000字, Chinese-primary, traceability
  appendix + backing `evaluation.json`). New `rules/longform-review.md`,
  `assets/longform-template.md`, `scripts/check_longform.py`; `run_all.py` gains a
  long-form layer (字 count 3500–4500 + required sections + backing gate).
- Hardened `technicalities-from-reviews.md` + `longform-review.md` with a
  **no-provenance-inflation** guardrail (a consensus technicality is never described
  as 测量背书, even when the source also publishes measurements).
- Live eval: a subagent independently generated a 4487字 long-form that passed the
  length/structure/traceability checks; an adversarial over-claim judge confirmed
  discipline and surfaced the inflation slip that drove the hardening above.

## 0.1.0 — 2026-06-02
- Initial release. Two-track objective evaluation: transducer (IEM/headphone/TWS)
  量感/风格 from FR-vs-target, and source gear (DAC/amp/DAP) measured competence +
  system matching. Mandatory data-cleaning stage. Style-profiled media roster (2–3
  sentence per-source `style_profile`, orientation judged dynamically — **no faction
  enum**). Bilingual (中文 + English) output. Evidence-traceability gate
  (`validate_output.py`). Regression runner (L0 schema + L1 golden + determinism +
  output gate + token budget) is GREEN.
