# Loop run-state — mp-cli-sup-harden

External scratch ledger (survives context resets). Loop: `.loop/mp-cli-sup-harden.loop.md`.
Branch: `harden-mp-cli-sup` · baseline tag: `mp-cli-sup-baseline`.

## Current position
- **Stage:** 3 (adversarial_harden) — IN PROGRESS
- **Stage 1 (baseline_and_harness):** ✅ PASSED gate
- **Stage 2 (upgrade_to_release_gate):** ✅ PASSED gate
- **Stage 3 (adversarial_harden):** running fresh-context battery to 3 consecutive clean

## Stage 2 — delivered
- Fixed all 3 drift findings: dropped the "46" magic number (→ point to cli-contract),
  compat pin → vince-mp-cli@0.2.0, skill.version → 0.2.0.
- release-manifest: passed:true + executable `evidence` array (validate-skill, run_all,
  run_all --self-test, backing tool `npm run validate` 60/60). Added CHANGELOG.md.
- Documented the verifier in SKILL.md ("Verifying the skill").
- run_all 10/10 green; self-test 10/10 discriminate; release gate MET.
- Self-test caught a 2nd instrument issue: removing the magic number made the
  step_count mkFail mutation a no-op → fixed to INJECT a claim (correct/wrong).

## Stage 1 — delivered
Built + froze the deterministic check toolkit (all shipped in `scripts/`):
- `scripts/run_all.mjs` — 10 capability-grounded checks + `--self-test` (per-check mutation discrimination, 10/10).
- `scripts/check_release_gate.mjs` — executes manifest evidence by exit code + requires self-test (RED at baseline: passed:false).
- `scripts/check_battery_clean.mjs` — reads battery ledger, N-consecutive-clean + regressions green (RED at baseline: no ledger).
- Self-test caught + fixed 1 harness bug (prose `vince-mp execution` false positive → code-context extraction).

## Stage 1 — baseline findings (run_all RED, 3 real drift → Stage 2 worklist)
1. `step_count_claim_matches`: SKILL.md says "46 step types", capabilities has **45**.
2. `cli_compat_pin_current`: release-manifest pins `vince-mp-cli@0.1.0`, installed is **0.2.0**.
3. `skill_version_coherent`: manifest skill.version `0.1.0` ≠ metric-plan candidate `0.2.0`.

## Battery ledger (stage 3)
- machine ledger: `.loop/mp-cli-sup-battery.json`
- **Round 1 (4 fresh skeptics):** DIRTY — 24 confirmed defects, ALL fixed + locked.
- **Round 2 (3 fresh skeptics):** DIRTY — 15 MORE defects, ALL fixed + locked. Deeper finds:
  R1's harness checks were string-presence PROXIES (accepted inverted safety polarity, incidental-prose
  coverage, markdown-split fabrication) — rebuilt to verify MEANING; KEYSTONE fix = self-test now seeds
  a subtle near-miss per content check. check_release_gate evidence now shell-free; check_battery_clean
  closes whitespace-context + unrelated-check-lock bypasses (both verified via a dishonest-ledger spot-check).
  Usability: doctor-can't-diagnose-attach reworded; scan precondition; network recipe; shot-vs-screenshot.
- run_all 13/13, self-test 13/13 (multi-seed), release gate MET. 39 defects locked. Escalations E1–E6.
- **Rounds 3–8:** 15 + 7 + 5 + 8 + 4 + 1 more defects, ALL fixed + locked. Severity collapsed each
  round (structural holes → doc-completeness → one-char regex edges → 1 doc nuance).
- **CONVERGED (Round 8):** the harness/structural skeptic gut-tested all 14 checks + attacked
  self-test / gate / battery / the full doc↔CLI surface → "no new defect; converged." Only a single
  low-med doc item remained (console --no-session), now fixed.
- **Totals:** 80 confirmed defects fixed across 8 rounds; 14-check harness (self-test 14/14); release
  gate MET; 5 accepted honest-limits; 6 tool-side escalations (E1–E6).
- consecutive-clean counter: 0 / 3 — the STRICT gate is ASYMPTOTIC (fresh adversarial agents on a
  rich skill always surface one more micro-edge; the loop-principle documents this non-convergence).
  Stopped at Round 8 for the on_the_loop human decision: continue toward the asymptotic gate, or finalize.
