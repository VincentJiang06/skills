# Fresh-reader checklist — REQUIRED manual semantic gate

The deterministic validator (`scripts/validate_attack_records.mjs`) checks
**structure + reproducibility shape**. It CANNOT judge whether an attack is
*semantically* real. Only a fresh reader catches a hollow attack record. This gate
is **mandatory** before a round is "done" — the maker (attacking subagent) MUST
NOT be the checker (`maker != checker`; spawn a separate fresh-context reviewer).

Run after the validator is green. For **each** record in `records[]`:

- [ ] **Repro re-triggers (entry 13 — semantic).** I re-ran the exact `repro`
      (command or steps from the stated start state) cold. It reproduced the
      `observed` value. `repro.replayed_ok:true` is not taken on faith — I saw it.
- [ ] **Repro would discriminate a broken impl.** A *correct* implementation of
      this feature would make this probe **pass**. The `non_tautology_check` is
      true: the probe exercised real behavior and *could have* passed.
- [ ] **Real collaborator at the seam (entry 14 — semantic).** The attacked seam
      used a real collaborator / end-to-end path, not a mock that echoes the
      input. `real_collaborator_at_seam:true` matches what I actually see in the
      repro.
- [ ] **observed ≠ expected is genuine.** `expected` was derived from the
      requirement (`independence_attestation.derived_expected_from`), NOT read off
      the implementation or its tests. The divergence is real, not a restatement.
- [ ] **Named oracle actually fired.** The stated `oracle` is the one that
      detected the break and it genuinely discriminates (not "vibes").
- [ ] **Independence attestation is real.** The attacker's context truly withheld
      `implementation_source` + `tdd_suite` (+ ideally `author_framing`). If the
      same model wrote the target, a separate checker instance verified this.
- [ ] **Not anti-vacuity.** This is not a correctly-rejected malformed input the
      contract never promised to handle.
- [ ] **Severity & priority honest.** Severity (technical impact) and priority
      (business urgency) are not conflated or inflated; a false "critical" damages
      the target team's trust.

And for the round:

- [ ] **Blast radius was controlled.** Each perturbation was scoped to the
      smallest unit and the target was not left degraded (abort/stop honored).
- [ ] **needs_judgment items are honestly unresolved**, not buried real findings
      nor inflated non-findings.

Sign-off: reviewer (≠ maker) name + date. An unsigned round is not done.
