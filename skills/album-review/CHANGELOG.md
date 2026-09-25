# Changelog — album-review

All notable changes to this skill. Format loosely follows Keep a Changelog;
versioning is semver.

## [0.3.0] — 2026-09-25

Incremental alignment to the philosophy KB v0.4.0 (A40, R20 wave, low tier). The
gates' verdict logic did not change; what changed is **what the docs say the
backing gate proves**, a packaging bug that made the gate unreachable on public
installs, and a missing trust-boundary statement.

### Fixed
- **Backing gate over-claimed (P13/S14, A22; this skill's own 0.2.0 E12 precedent).**
  `validate_backing.py` checks schema, that fact-labelled claims carry a
  `source_id`, and that ids resolve in `evidence[]`. The docstring, SKILL.md
  Scripts row, README(.en) and research-protocol §3 said fabricated facts are
  caught; a fact labelled `interpretation` with no source, or an invented
  `evidence[]` entry, exits 0. All sites now state the scope and name the three
  things it does not check (support, label honesty, prose↔backing). The dangling-id
  message reads `(dangling reference)` instead of `(fabricated)` — the script
  cannot know intent. Over-correction guarded: the gate still catches unsourced
  fact-labelled claims and dangling ids (cases `untraced_fact`,
  `fabricated_evidence_ref`).
- **Public installs crashed at Step 6 (Controls: "Ship is blocked on any non-zero
  exit" must be reachable).** `validate_backing.py` imported `schema_check` from
  `evals/`, which never ships (repo `.gitignore`, `.clawhubignore`); a
  tracked-files-only install raised `ModuleNotFoundError`. `schema_check.py` moved
  byte-identical to `scripts/` (sha256 unchanged), no try/except fallback
  (fail-closed). The harness no longer puts `evals/` on `sys.path`, which had
  masked the crash.
- **Metrics named what their instruments do not measure (E11 instrument validity,
  A20).** "ungrounded-claim rate" → "untraced fact-label rate (reference
  integrity)"; "activation precision" (a regex over 7 prompts) → "route-classifier
  agreement (regex proxy; not skill activation)"; real activation precision is
  declared 未测 until a description-driven trigger eval runs.
- **README path drift (hygiene).** The registry is `rules/judge-must-flag.md`, not
  `evals/JUDGE-MUST-FLAG.md`; the 0.2.0 entry below is left as written (history).

### Added
- **Trust boundary (P10, A36, S13).** SKILL.md Controls + rules/research-protocol.md:
  fetched pages, snippets and caller-supplied material are data; directives inside
  them are not followed and are named in the report. Scripts table declares both
  scripts read-only.
- Local evals: case `public_install_scripts_run` (`git archive HEAD` extract, both
  scripts return a verdict with no Traceback; red at c2a922b, green after the move),
  case `mislabeled_fact_exits_zero` + fixture `backing_mislabeled_fact.json`
  registered in `rules/judge-must-flag.md`, and `evals/behavioral/injection_sentinel.md`
  (E11 sentinel). 20 → 22 cases, GREEN.

### Deliberately NOT done
No prose↔backing string match, no regex for "fact labelled as interpretation", no
evidence fetch / similarity check. Each is a semantic judgment with obvious witness
pairs ('1987 年那种冷冽的合成器质感' vs '录于 1987 年'); they stay judge reads (P13,
iron rule 2). No detector for "steering text" either — P10 is a source rule.

### Exemptions carried (A40; not brought to the 0.4.0 constitution this wave)
EX1 no full generation settlement of the rule body (the E11 run is the only
settlement evidence) · EX2 no `allowed-tools` frontmatter · EX3 no calibration
record for the judge-must-flag read · EX4 E11 at N=3, direction only, no
third arm/MDE · EX5 no model_baseline stamps on pre-existing deterministic
fixtures (not model-bound) · EX6 section linter / CJK counter carried without A50
lineage work · EX7 0.2.0 history paths left as written.

### Release gate
`python3 evals/run_all.py` GREEN (22/22) **and** a human/judge rejects every
fixture in `rules/judge-must-flag.md`. E11 two-arm record: run directory of the
R20 wave (not shipped).

## [0.2.0] — 2026-07-31

Honesty pass on the publish gate. The validator did not change; what changed is
**what the skill claims the validator proves**, and what the evals treat as an
exemplar. Anchors: **E12** (a gate that scores a degenerate input as a pass is a
broken target, not a passing run; false positives first), **H7** (a success-side
metric without its completeness partner must be labelled 未测), **H4/H5**
(disjunctive stop condition with an escalate exit).

### Fixed
- **Locked decision over-claimed its own scope.** "Padding cannot game the floor"
  was proven only for Latin/digit/punctuation padding (`cjk_padding_fails_floor.md`).
  **汉字-level repetition padding was never covered** — a 10,500-字 wall of one
  repeated paragraph exits 0 today. SKILL.md now states the exact scope, names the
  blind spot, and says plainly that exit 0 is evidence of length, never of substance.
- **A degraded input was frozen into the evals as a positive.**
  `evals/fixtures/obscure_degraded.md` was generator filler: one ~150-字 paragraph
  repeated to 10,500 字, asserted by the harness as a legitimate honest-degradation
  review. It is replaced by **hand-written, non-repeating prose** (10,190 字, zero
  repeated 20-grams, synthetic album so no real discography is misdescribed) that
  keeps the 公开资料有限 / 资料不足 markers and still clears the gate. The generator
  no longer produces this file — see the note in `_gen_fixtures.py`.
- **Step 6 had a one-sided stop rule** ("fix and re-run until exit 0"), which
  rewards padding whenever the floor cannot honestly be reached. Replaced with a
  disjunction: **green** (exit 0 → ship) / **fix** (a real gap → fix it) /
  **escalate** (two consecutive rounds add zero net substance and the floor is
  still unmet → stop patching and report that the floor and this album's material
  are incompatible — a charge against the contract, settled by the human). Adding
  字 to close the gap is banned outright.

### Added
- `evals/JUDGE-MUST-FLAG.md` — registry of negatives the deterministic gate
  **cannot** catch, so a known blind spot stays visible instead of silently absent.
- `evals/fixtures/repetition_padded_10k.md` — the first entry: full section
  coverage, 10,500 字, **exits 0**, and is junk.
- `evals/run_all.py` case `judge_must_flag_registry` — checks only what a machine
  can honestly check (the registry exists; every listed fixture is present and
  named in it). 18 → 20 cases, GREEN.
- `rules/metric-plan.md` — the completeness partner of the length metric
  (distinct-content / repetition rate) is declared **未测, no instrument**, rather
  than left implied by the success-side numbers.

### Deliberately NOT done
No repetition-rate, similarity, or distinct-n-gram threshold was added to
`check_review.py`. "Is this distinct content or one paragraph in a hall of
mirrors" is a semantic judgment; a threshold that decides it would fire on
legitimate reviews (a 逐曲 section legitimately reuses vocabulary), and a
mis-firing gate gets ignored, which is worse than no gate. The blind spot is
handled by prose + registered negatives + a human/judge read.

### Release gate
`python3 evals/run_all.py` GREEN (20/20) **and** a human/judge rejects every
fixture in `evals/JUDGE-MUST-FLAG.md`.

## [0.1.0] — 2026-06-04

Initial built + tested release (via the skill pipeline; Stage 2 engineer).

### Added
- Thin SKILL.md orchestrator with Use-when / Do-NOT trigger surface and a
  7-step protocol (preflight+route → classify → research → reason → write →
  verify → report).
- `scripts/check_review.py` — deterministic validator: CJK-汉字 length window
  [10000,15000] (regex `[一-鿿]`, Latin/digits/punctuation excluded), a
  genre-adapted required-section linter (`standard` / `classical`, the latter
  enforcing WORK-vs-PERFORMANCE + 参考录音/版本比较), an optional `--backing`
  traceability gate, and an adjacent-input `classify_route` guard.
- `scripts/validate_backing.py` + `schemas/backing.schema.json` — backing JSON
  contract; every fact-class claim's `source_id` must exist in `evidence[]`
  (fabricated / untraced facts FAIL).
- `rules/` (research-protocol, genre-lenses, output-template, metric-plan),
  `references/source-roster.md`, `assets/` (review-template, backing.example).
- `evals/run_all.py` re-runnable harness (imports the mechanism from `scripts/`)
  + 17 fixture cases covering all 10 adversarial edges; 17/17 GREEN.

### Release gate
Ship only when `python3 evals/run_all.py` exits 0 (GREEN). Roster/template
changes require re-running the eval fixtures.

### Rollback
Revert to the prior `SKILL.md` + `scripts/`.
