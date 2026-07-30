# Changelog — loop-constructor

All notable changes to this skill. Versioning is semver on the loop-design JSON
schema the linter binds to: a new required field / renamed key is a breaking change.

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
