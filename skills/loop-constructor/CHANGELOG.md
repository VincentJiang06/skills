# Changelog — loop-constructor

All notable changes to this skill. Versioning is semver on the loop-design JSON
schema the linter binds to: a new required field / renamed key is a breaking change.

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
