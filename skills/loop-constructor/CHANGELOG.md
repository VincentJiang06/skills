# Changelog — loop-constructor

All notable changes to this skill. Versioning is semver on the loop-design JSON
schema the linter binds to: a new required field / renamed key is a breaking change.

## 0.5.0 — 2026-09-25

**Failure routing re-aligned to the skill-philosophy KB v0.4.0 (R20)** — non-breaking:
no schema change, no linter/renderer change (`scripts/` byte-identical to 0.4.0), eval
battery unchanged at **101/101**, linter verdict vector over the whole existing corpus
(2 goldens, the frozen 0.3.0 fixture, 6 real-task designs) identical to 0.4.0. Every
change is prose in the judgment layer, because each is a semantic call a regex cannot
decide (KB P13 / S14: no new mechanical check).

The recorded problem: 0.3.0/0.4.0 told every designed loop that "a top-severity defect
lands inside the previous iteration's own fix → `restart`" and that a human is
escalated to only for a wrong contract. KB R20 says the opposite — that signature means
stop and ask the owner whether the judgment should be mechanized at all; restarting in
the same plane only re-commits the defect. Because this skill writes other agents'
runbooks, the stale rule was copied into every design it emitted.

### Changed
- **Four-exit routing with one order** (KB `guidelines/loops.md` **H4**,
  `rules/constitution.md` **A51**) — `loops-model.md` §V now names each exit by what
  the failure accuses (escalate = contract / task impossible-or-blocked / fixer;
  re-plane = the judgment's execution plane; loopback = upstream artifact; restart =
  own stalled work) and fixes the order **escalate → re-plane → loopback → restart,
  first hit wins**. `loop-selection.md` D5 and the `loop-design-shape.md` restart
  bullet apply it and point to §V (one rule residence).
- **Fixer signatures are pre-registered escalate triggers** (**A51** (i)–(v),
  generalized to coding loops): P0/P1 inside the previous fix (or a ≥P2 regression in
  the fix area); fix-area growth >50% over the last green baseline (fix area, not the
  whole diff); a third exception layer on one threshold; a second implementation copy
  of one root cause; 2 fix rounds on one defect class per version. Each counter's
  plane is stated (P13). They count what the evaluator/attacker re-opens after a fix
  was presented as done — pre-green retries of a stage's own check stay the
  (autonomous) restart counter, so the escalate-first order does not starve restart.
- **Re-plane is the owner's disposition after the stop, not an action** (**H4** shadow
  3, **P13**/**S14**) — every fixer-signature escalate carries the plane question
  ("can a deterministic rule judge this stably at all?"); there is deliberately no
  `re-plane` `on_failure` value, so it cannot become a channel around the round cap.
- **The safe exit is never sealed** (**H4**) — "impossible / blocked → stop and
  report" survives a "don't ask, keep going" instruction (recorded as a preference).
- **Caoliao narrative corrected** (**H4**, H-series verdict 2) — the audit and the
  attacker were present and read correctly; what was missing was the authority to stop
  and re-plane, not a restart counter or more auditing.
- **Harness settlement is two-way** (**P11**) — `loops-model.md` §VIII and the SKILL.md
  Controls bullet: at each release delete what the model does for free **and** add
  back that version's named failure modes (cited by path to KB
  `adaptations/claude5-family.md`, as of 2026-09-24); every change stamped with
  `model_baseline` (resolved model id + effort + harness version).
- **Evaluator instruction files are part of the write surface** (**P10**, **K1**) —
  `loops-model.md` §II: `CLAUDE.md`, `AGENTS.md`, `.claude/` rules, auto-memory and the
  `.loop/` evaluator prompts are auto-read by a "fresh" evaluator, so they are kept
  outside the generator's write surface or hashed and verified; otherwise the design
  records the evaluator's independence as `L-i incomplete`.
- **Fresh-reader checklist** — "Restart vs escalate" becomes **"Failure routing (§V)"**
  (FAILs fixer-signature → restart/loopback, including a fresh-context restart; PARTIAL
  for an escalate without the plane question; FAILs a sealed safe exit); new box
  **"Evaluator instruction files outside the generator's write surface (§II)"**.
- **Staged golden** (main pass: string edits only, keys unchanged, still 0 FAIL / 0
  WARN; the fix round below changed one `on_failure` and added four assertions): the
  own-fix clause left the restart counter; a fixer-signature escalate (with the plane
  question) and a safe-exit escalate lead the escalate list; a matching
  `parameter_provenance.fixed` entry; `maker_checker.scope` states the instruction-file
  hashing so the golden passes its own new checklist box.
- SKILL.md stays under its 0.4.0 size (3,387 → 3,385 tokens, 3,366 after the fix
  round below): the 0.4.0 Lifecycle paragraph moved verbatim into this file (below,
  under 0.4.0).

### Battery fix round (same version; 0.5.0 was not yet released)
One independent battery round (instance tier: same model family, fresh context) hit
5/5 seeds and confirmed 14 findings (P2 ×3, P3 ×11, no P0/P1). This single permitted
fix round is prose and golden edits only; `scripts/` are still byte-identical to
0.4.0, evals still 101/101, both goldens still 0 FAIL / 0 WARN.
- **F8** (P2, **H4** routing) — the staged golden put the own-work restart counter in
  the outer failure list, which the renderer prints as a terminal STOPPED_UNMET.
  `implement_rate_limit` now carries `on_failure: restart` with its own stall counter;
  the outer list keeps only the spent restart budget. §V says where each counter is
  written.
- **F7** (P2, §III contract floors) — the staged golden had 5 machine-gradable
  assertions against the skill's own endpoint floor of 8; it now has 9 (A7 diff scope,
  A8 contract suite unchanged, A9 window reset, A10 concurrent burst).
- **F10** (P2, KB `principle.autonomy_by_blast_radius`) — D3 had three versions of the
  autonomy rule; it now has one (high blast and low reversibility, or a weak check
  guarding a high-blast or irreversible step ⇒ `in_the_loop`), and the checklist box
  and the D3 summary point to it (**A49** one residence).
- **F19** (P3) — success now cites A7, which proves the diff-scope claim; the flat
  golden's 50-run soak states its bound (≈6% at 95%, rule of three).
- **F20 / F9** (P3) — the golden's D7 log counts match its `parameter_provenance`; a
  sample size that claims variance is empirical, a minimum sample floor is a decision
  number ("re-examine per design"), and both D7 passages say which they mean.
- **F12** (P3) — SKILL.md now says D7 closes after NEGOTIATE, as loop-selection.md
  does; one restated sentence was cut to pay for it.
- **F17** (P3, **P10**) — 0 failures in 10⁴ trials bounds the residual at ≈0.03%, not
  0.3%. **F18** (P3, **P10**) — the Karpathy attribution is hedged to its KB grade C.
- **F11** (P3, §II) — the checklist says a same-context pass is an author review and
  is recorded as `fresh-reader: author, same context (L-i incomplete)`.
- **F15 / F16 / F1** (P3, **P13**) — the "Not a hidden no-op" box names what the
  linter does not block (progress.md/log.md self-report greps, decidable always-0
  shell forms, `|| true` after a quoted `#`). The linter's guarantee is narrowed in
  prose; the denylist does not grow (iron rules 2/4).
- **FL1–FL4** (P3 doc drift) — the 0.4.0 entry now says 101 cases; "Four
  disciplines" lost its wrong count; the on_failure linter row lists `restart`; the
  retired "9-step protocol" wording names the procedure the skill actually runs.
- **Carried, not fixed:** F1's quote-aware `#` strip in the linter (a structural,
  A50-admissible parser fix, deferred because this wave keeps `scripts/` unchanged and
  a new parser needs new eval cases); F14 (eval case C12's label overclaims; evals.json
  lists 40 of 101 cases; there is no trigger/routing coverage). Evals are not edited
  this wave.

### Compatibility
- Every pre-0.5 lint-green design still exits 0 (no linter change). **Persisted pre-0.5
  runbooks keep the old routing** and still lint green — only the fresh-reader §V box
  catches them; re-review, don't auto-rewrite (the renderer never overwrites).

### Carried as-is (A40 incremental alignment — exemption register)
- E-1 `lint_loop_design.mjs` + `render_loop_doc.mjs` untouched · E-2 embedded
  loop-principle KB (2026-07-06) not updated; it holds no contradicting routing text ·
  E-3 description (347 chars > 320 target) unchanged, no trigger baseline yet · E-4
  SKILL.md still over the 3,000-token target (not grown) · E-5 large reference files
  carried · E-6 no A49 judgment ledger file · E-7 no `model_baseline` stamp on the
  skill itself · E-8 install-level `search_index.json` size.
- Residual (not in this version's scope): the fresh-reader "Harness earns its keep"
  box still reads deletion-only; §VIII carries the two-way rule.

### Sibling
- `loop-constructor-codex` does not mirror 0.5.0 yet; its own upgrade must copy the §V /
  D5 / restart-bullet / checklist / golden / §II / §VIII / Controls changes (including
  the fix round above: §V counter placement, D3 single rule, D2/D7 wording, the
  checklist residual and author-review lines, golden F7/F8/F19/F20 repairs, doc drift)
  and add its codex-specific `AGENTS.md` write-surface clause.

## 0.4.0 — 2026-08-20

**Parameter provenance** (non-breaking; battery 69 → **101/101** — this line said
99/99 at release; P31/P32 and the linter's `tee`/`wc` pipe-tail rule reached the
install after this note and came back into the repo with the c2a922b sync). The recorded incident:
a 0.3.0-designed review loop pre-fixed seven classes of operational thresholds at zero
runs (scope-crossover 65%, 3.5M ceiling, 15min lens timeout, ≥20/≥90% steady-state
bars…) because every skill surface pushed numeric completeness and nothing offered a
"measured later" channel; correcting it cost ~14 external review rounds.

### Added
- **D7 — number provenance** closes SELECT: sweep every digit-bearing string, classify
  **decision | definitional | empirical** (two tests: refutability + change-channel),
  route pre-register / fix-with-red-fixture / declare-derived. One selection_log line.
- **`parameter_provenance` {fixed[], derived[]}** (optional key): derived entries carry
  formula + `calibrated_by` (an ordinary stage, ancestor of every consumer, whose own
  check validates the runtime values artifact) + `consumed_by` + `cadence` +
  `sample_rule` (censored observations enter as lower bounds) +
  `drift_policy{threshold, conservative_direction, floor_trip → escalate}`.
- **Additive `warns[]` channel**: absence on a staged design = `WARN`, never FAIL (exit
  codes unchanged; flat absence silent); presence = strict per-entry shape +
  cross-reference FAILs (unknown calibrator/consumer, ordering rule, self-calibration
  circle, missing floor_trip …). Newly-emitted designs are clean only at 0 FAIL 0 WARN.
- **Renderer provenance table** for declaration-bearing designs; declaration-free
  output stays byte-identical to 0.3.0 (eval-pinned against a captured render).
- `cadence` stays a free string — no structure emerged writing the red cases;
  inventing one with zero usage instances is this version's own disease.
- **§VIII·b information-dimension rule** (prospective twin of delete-the-harness):
  not yet measured → do not write; "derived" is not a synonym for "true"; the
  calibration machinery is itself mortal. Fresh-reader gains the numbers-audit box
  (17→18). Five KB nodes wired: loop_until_dry, unexercised_self_check,
  green_but_wrong, stop_gate_trigger_rate, verifier_asymmetry.
- Staged golden now teaches the declaration (2 decision / 2 definitional / 1 derived,
  calibrated by `characterize`); example numbers carry "re-examine per design" — the
  skill recommends **no default** drift/sample values.

### Compatibility
- Verified zero new FAILs on: both pre-0.4 goldens (archived), fable-debug-review,
  arp-build. All 69 archived eval ids preserved verbatim; 30 new red-proven cases.

### Lifecycle summary (moved verbatim from SKILL.md in 0.5.0)
- **`0.4.0` — parameter provenance (non-breaking).** SELECT closes with D7;
  staged designs declare `parameter_provenance` `{fixed[], derived[]}`; the linter
  gains an additive `warns[]` channel (absence on staged = WARN, never FAIL; exit
  codes unchanged; flat absence silent) plus strict shape + cross-reference FAILs
  when the key is present; the renderer prints a provenance table only for
  declaration-bearing designs (declaration-free output byte-identical). Every
  pre-0.4 lint-green design still exits 0. Evidence + details: `CHANGELOG.md`.

## 0.3.0 — 2026-07-31

Aligned with the **skill-philosophy KB v0.3.0 (R17) H series** (循环工程). Six prose
deltas; **no schema change, no new linter rule** — every delta lands in the judgment
layer (`references/`, the fresh-reader checklist, the rendered runbook), because each
one is a semantic call a regex cannot decide. Battery unchanged at **69/69**.
KB anchors: `Philosophy/guidelines/loops.md` H2/H4/H5/H7/H8 ·
`Philosophy/rules/constitution.md` 第九章 A45/A46 + 附录一 A45 参数行.

### Added
- **Two-sided stop gate** (KB **H5**, A45(iv)) — `loop-selection.md` **D5** now requires
  `stop_conditions` to close on *both* sides: a **zero-change gate** ("N consecutive
  iterations with zero new changes → stop", the deterministic anti-arms-race brake) AND
  a **minimum-progress floor** below which an early "done / can't proceed" routes to
  `escalate` instead of counting as a stop. Rationale on the record: the dominant
  failure mode flipped between model generations (repeated-failed-action 38.7% → 6.3%;
  giving-up-early 25.8% → 50%), so a one-sided stop condition guards yesterday's
  failure. Caps (iterations/time/budget) are written **inside** the condition and may be
  tripped by the loop, never raised by it. Demonstrated in
  `assets/golden-loop-design-medium.json`; new fresh-reader box.
- **Pre-registered stall counter** (KB **H4** + **T14**) — the three-way routing
  (`loopback`/`restart`/`escalate`) hinges on "patching has stalled", a semantic call
  that loses to optimism in flight. It must now be **quantified before iteration 1** as
  a counter ("2 consecutive same-class failures → restart"; "a top-severity defect
  inside the previous iteration's own fix → restart") and fire mechanically. Landed in
  `loops-model.md` §V, `loop-selection.md` D5, `loop-design-shape.md` (restart bullet),
  SKILL.md Controls, and a fresh-reader box. Named precedent: the seven-round
  patch-vs-break arms race whose restart criterion was met at round two but never
  written down.
- **Write-surface separation** (KB **A45(ii)**, H2) — `loops-model.md` §II: an
  independent evaluator is a *conditional* purchase, but when a design skips it the
  runnable check's **execution and result-writing must sit outside the generator's write
  surface** (judging script + verdict file read-only to the generator, or a
  hook/wrapper it does not invoke), declared in `maker_checker.scope`. Otherwise the
  generator patches the door and then stamps it. Fresh-reader box added.
- **Paired telemetry / run report** (KB **H7**, A46) — new `loops-model.md` §VII·b and a
  **"Run report (emit this when the loop stops)"** section in the rendered runbook
  (`render_loop_doc.mjs`, static text): every success/autonomy number carries its
  integrity counterpart or an explicit `not measured` tag (gates-green ↔ weakened-
  assertion diff audit; autonomous-resolution ↔ regression escapes; throughput ↔
  defect/rollback rate), and `iterations_to_acceptance` is read **both** ways — too low
  means the check was too weak to fail. Sampled audit + a visible tag is the honest
  degradation; dropping the integrity line is not. SKILL.md Report now states this as
  the run-report contract the designed loop must honour.
- **Compensating vs structural harness parts** (KB **H8**) — `loops-model.md` §VIII: a
  component to be pruned is settled by a **bare-model with/without comparison** if it is
  *compensating* ("the model can't do this yet"), or by *"is the architectural constraint
  still there?"* if it is *structural* (state on disk, role separation, stop conditions,
  the check). Structural parts are not exempt from review — they get a different
  question. The classification is **not self-declared**: it goes on the record for the
  checker to confirm, or a builder could exempt anything by naming it. Fresh-reader box
  added.

### Changed
- **Contract sizing is now stated as LOWER BOUNDS** (KB **A45(i)** + 附录一 A45) —
  endpoint/function **≥ 8**, module **≥ 12**, app-sized **≥ 20**, counted over
  *machine-gradable* assertions only, with a **ceiling of 3× the bound** so a thin
  contract is never answered by padding. The bounds exist because of a real
  rubber-stamp incident, so they are floors, not targets. Their relation to the
  linter's floor of 3 is now explicit: **3 is the absolute anti-vacuity ground and sits
  below every surface bound** — clearing the linter does not clear the sizing.
  (`loops-model.md` §III, `loop-design-shape.md`, `fresh-reader-checklist.md`, SKILL.md.)
- `loops-model.md` gained a short map of where the KB H-series deltas landed, so the
  nine LOOPS.md rules stay the file's spine rather than growing a tenth rule.

### Not changed (deliberately)
- **No new linter rule.** "Is this stall counter real?", "is this contract big enough?",
  "is this component structural?" are semantic judgments a deterministic gate cannot
  decide stably; per the repo's standing rule they belong in prose + the fresh-reader
  pass, not in `lint_loop_design.mjs`. The schema, the linter and the 69-case battery
  are byte-unchanged, so designs authored under 0.2.x still lint green.

## 0.2.0 — 2026-07-02

Folded in the LOOPS.md operating model (Karpathy, *Field Notes on Agents That Run
for Days*, v060726). The strong D0–D6 selection procedure + linter backbone is
unchanged; this makes the new loop model **enforced structure**, not prose.

### Added (enforced by `lint_loop_design.mjs` for STAGED designs)
- **`roles`** (LOOPS.md §II — Separate The Roles): `planner` / `generator` /
  `evaluator`, three contexts. The evaluator must be `separate_context: true` +
  `adversarial: true` — a model that grades its own work turns sycophantic. Required
  for staged; optional for the flat atomic unit (still shape-checked if present).
- **`contract`** (§III — Negotiate The Contract First): `assertions[]`, each with a
  unique `id`, a testable `must`, a `check` that can FAIL (or `human-verify:`), and a
  `stage` it traces to (or `cross-cutting`). Floor of 3 assertions (anti-vacuity);
  the fresh-reader judges real sufficiency (≈20 for app-sized). The contract, not the
  original spec, is what gets graded.
- **`restart`** (§V — Let The Loop Restart): a first-class `on_failure.action` —
  discard the stage's work and re-derive from the contract. Carries no `to` (a
  restart with a stray target FAILs). Escalate only a wrong contract, not a broken build.
- Mechanism is now **SELECT → NEGOTIATE → FILL → VERIFY → PERSIST** (NEGOTIATE is the
  new phase: assign roles + agree the contract before filling stage DoDs).
- New `references/loops-model.md` — the operating model: the nine rules mapped to
  where each lands, plus the judgment layer the linter can't bind (write-to-disk
  state §IV, score-the-subjective §VI, read-the-traces §VII, delete-the-harness §VIII,
  the moving bottleneck §IX).
- `render_loop_doc.mjs` surfaces the roles + contract in the persisted runbook.
- 15 new eval cases (C55–C68): roles/contract/restart traps + the render surfacing.
  Battery is 68/68.

### Changed
- `loop-selection.md` D2 check menu now includes a calibrated **rubric-scorer** for
  taste/quality DoDs; D5 lists `restart`; a new "assign roles + negotiate the
  contract" section follows D0–D6.
- `fresh-reader-checklist.md` gained boxes for role-separation, contract-sufficiency,
  restart-vs-escalate, subjective-check calibration, harness-pruning, and the
  named bottleneck.

### Compatibility
- FLAT (single-stage) designs are unchanged — `roles`/`contract` stay optional there.
- Existing staged designs authored before 0.2.0 must add `roles` + `contract` to pass
  the linter (they are the load-bearing separation + the graded criteria).

### Validated + hardened by an independent opus-4.8 xhigh battery (same day)
Four independent opus agents (executor=judge=opus-4.8 xhigh): **generation** — a fresh
reader followed SKILL→NEGOTIATE→FILL to a linter-green staged design for a
mechanism-property task (server-side pagination), 11 assertions, roles separated,
and correctly used a mechanism probe instead of an output proxy; **trigger** 12/12;
**audit** — no P0, "correct, coherent, and a genuine improvement"; **adversarial** —
scored a real win the same day it shipped, fixed immediately:
- **Machine-gradable contract floor** (the adversarial win): the count floor could be
  met by `human-verify:` rubber stamps (1 real check + 2 thumbs-up entries passed).
  The floor now counts only machine-gradable assertions (C69 regression case;
  battery 69/69).
- **Attestation boundary documented** (the other half of the win): the roles booleans
  are author-attested — stated explicitly in loop-design-shape.md + loops-model.md
  §III, and the fresh-reader roles box now checks mandate-vs-boolean contradiction
  and outcome-vs-existence checks.
- **§V restart got its own loops-model.md section** (audit P2) with the
  restart-vs-loopback-vs-escalate routing rule (friction note): loopback = upstream
  artifact wrong; restart = own work stalled; escalate = the contract itself is wrong.
- **Contract sizing rescaled to surface** (friction note): endpoint ≈ 8–12, module
  ≈ 12–20, app ≈ 20+ (was a single "≈20" that under-specified small tasks).
- **Hollow-check binding documented** (friction note): the analyzer judges the LAST
  segment of `;`/pipe chains, all-branches for `&&`, any-branch for `||`.
- Stale "Phase 3 (VERIFY)" ordinal in the Modules table fixed (audit P2).
