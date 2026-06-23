# run-state — skill-pipeline-debug loop

Externalized ledger (harness primitive). Design: `.loop/skill-pipeline-debug.design.json` ·
Runbook: `.loop/skill-pipeline-debug.loop.md`. **STATUS: COMPLETE (2 iterations).**

| stage | status | gate check | last result |
|-------|--------|-----------|-------------|
| build_eval_harness | ✅ GREEN | `node evals/skill-pipeline-debug/selftest.mjs` | 17/17 assertions (both polarities/scorer); HARDENED after maker/checker |
| debug_guidance | ✅ GREEN | `run_all.mjs --stage guidance` | 4/4 incl held-out; trigger-based elicitation added |
| debug_engineer | ✅ GREEN | `run_all.mjs --stage engineer` | 2/2; mutation score uuid 0.83, csv 0.70 (>0.5); NO engineer edits needed |
| debug_conductor_attacker | ✅ GREEN | `run_all.mjs --stage conductor` | 2/2; attacker gated after re-audit, verdict folded, ordering machine-enforced |
| (regression) round6 | ✅ GREEN | `skill-conductor/evals/round6_pipeline_checks.mjs` | 56/56 (token regression caught+fixed) |

## Log

- **Iter 1 — built all stages green.** Stage 0 harness (scorers+selftest+run_all+5 fixtures).
  Stage 1: added trigger-based elicitation to skill-guidance (detect_context_gaps.mjs +
  rules/elicitation.md + Step 6); 4 blind subagents produced specs, 4/4 incl held-out. Stage 2:
  2 blind subagents built uuid + csv skills from the rich specs; both pass own harness + mutation
  probe — NO engineer edits needed (confirms #2 root-cause was upstream guidance). Stage 3: wired
  vince-attacker into conductor as the gated late-stage battery (final-acceptance.md + SKILL.md);
  real attacker run caught a planted uppercase-accept defect; verdict folded via min().
- **Maker/checker (3 adversarial lenses) found real green-but-wrong:** (A) scoreGuidance greened
  content-free filler (length-only isFilled + substring coverage) + mutation_probe fooled by a
  one-constant canary [2 MAJOR]; (B) detector keyword-gameable both ways [HIGH/MED]; (C) conductor
  sound, ordering convention- not machine-enforced [minor].
- **Iter 2 — hardened + re-verified:** mutation_probe → all-sites mutation SCORE (canary now 0.09
  flippedRed=false); scoreGuidance → domain-anchoring + question-shaped anti-salad coverage (hollow
  spec now FAILs); detector → broadened wordlists + reframed as SEED-not-verdict (LLM judgment is
  the substance oracle, rules/elicitation.md); scoreConductor → machine-enforced ordering invariant.
  Both proven attacks re-run → CAUGHT. All gates green.

## Files touched (working tree — NOT committed, NOT redeployed)
- skills/skill-guidance/: SKILL.md, rules/elicitation.md (new), scripts/detect_context_gaps.mjs (new)
- skills/skill-conductor/: SKILL.md, rules/final-acceptance.md
- evals/skill-pipeline-debug/ (new harness, local): scorers.mjs, selftest.mjs, run_all.mjs,
  mutation_probe.mjs, fixtures/*, produced/* (artifacts), README.md
- zipper: UNTOUCHED (declared healthy).

## Residual (honest, asymptotic)
- Detector token-salad under-trigger can't be closed by regex — mitigated behaviorally
  (seed-not-verdict; agent judgment is the oracle), not deterministically.
- Conductor ordering is machine-enforced in the EVAL scorer; in conductor RUNTIME it is rule-prose +
  the log invariant. Follow-up: add to round6 `re_audit_verdict ∈ {candidate,industrial}` when
  `attacker_invoked===true` to enforce it in conductor's own gate.
- A 2nd maker/checker round could still surface more (asymptotic); stopped after closing all proven holes.
