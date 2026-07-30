# Changelog — mp-cli-sup

## 0.2.2

Documentation-only. Closes a one-sided stop condition in the adversarial-hardening
loop. No runtime-debugging behavior, no script, and no CLI contract changed.

### Fixed
- **The hardening loop had only a convergence arm.** `check_battery_clean.mjs`
  answers "are we clean yet?" and nothing else, so read as *the* stop rule it
  licenses an unbounded fix-the-door / break-the-door race: every round that finds
  a defect justifies another round. `SKILL.md` now states the stop condition as a
  **disjunction of four typed sub-conditions, first to fire wins** — `converged`
  (the gate is GREEN), `cap` (round/budget ceilings written into the condition
  before round 1; the loop may trigger a cap but never edit one — cap changes
  happen outside the loop, by a human, with a recorded reason), `no-progress`
  (a round adds zero `confirmed_defects` **and** zero `added_check`), and
  `RESTART-ESCALATE` (a confirmed defect regresses against a check the *previous*
  round added → the fixes have become the defect source: stop, report honestly,
  do not keep patching). Anchors: **H5** (limits inside the condition, adjusted
  only outside the loop), **H4** (fix / restart / escalate are three exits with
  distinct criteria), **A45(iv)** (structured stop conditions may be disjunctive,
  each sub-condition typed).

### Deliberately NOT done (registered fallback)
- No machine check was added for the three new arms (no round counter, no
  no-progress detector, no ledger scan for "this round's defect names last round's
  `added_check`"). "Did this fix cause that defect" is a semantic judgment, and a
  loop whose stop rule is enforced by code the same loop keeps editing is the
  failure being fixed here, not the fix. Prose first; mechanization is the
  **fallback for when prose demonstrably fails** — i.e. if a future battery run
  blows through a cap or continues past a fired RESTART-ESCALATE despite the
  written rule, that observed miss is the evidence needed to justify a
  ledger-level check, and only the arms it actually missed.

## 0.2.0

Finalizes the local-JSON-CLI release that was measured industrial on 2026-06-05
(see `assets/metric-plan.json`) but never closed its release gate, and adds the
deterministic verification the skill was missing.

### Added
- `scripts/run_all.mjs` — a deterministic eval harness that checks the skill's
  documented contract (every `vince-mp` command / shorthand / workflow step /
  important error code, plus version & compatibility pins) against the live
  `vince-mp capabilities --json`, so the docs cannot silently drift from the
  installed CLI. `--self-test` seeds one defect per check class into a copy of
  the skill and proves every check discriminates (the suite has since grown to 14 checks).
- `scripts/check_release_gate.mjs` — closes the release gate only on real
  evidence: it executes each command in `release_gate.evidence` by exit code
  (it does not trust the `passed` boolean) and requires the harness self-test to
  still pass, so a weakened harness cannot be used to close the gate.
- `scripts/check_battery_clean.mjs` — gate for an independent adversarial
  battery (N consecutive clean rounds + every prior defect locked by a green
  regression check).

### Fixed (contract drift caught by the new harness)
- `SKILL.md` claimed "46 step types"; the CLI exposes **45**. Removed the brittle
  magic number — it now points to `references/cli-contract.md`.
- `release-manifest.json` pinned `vince-mp-cli@0.1.0`; the installed CLI is
  **0.2.0**. Updated the compatibility pin.
- `release-manifest.json` `skill.version` (0.1.0) was incoherent with
  `metric-plan.json` candidate **0.2.0**. Aligned + flipped `release_gate.passed`
  to `true` with executable evidence.

## 0.1.0
- Initial CLI-backed skill: locks to the local `vince-mp` JSON CLI backend and
  attach-only safety rules.
