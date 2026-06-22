# Changelog — mp-cli-sup

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
