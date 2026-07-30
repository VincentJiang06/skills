# Fresh-reader checklist — for `<task>`

The linter checks *structure*; it cannot tell whether a real-looking check
actually discriminates. Re-read the emitted design **cold** and answer every box
**per stage**. Any "no" → fix the design and re-run the linter. A green linter on
a hollow check is exactly the trap this pass exists to catch.

## Per stage: `<stage id>`

- [ ] **Runnable.** Could I literally run `<check>` against this codebase right
      now? (Not pseudo-code, not a command that doesn't exist yet.)
- [ ] **Fails on broken.** Name how I'd break the implementation — does `<check>`
      go non-zero on that break? If I can't make it fail, the check is hollow.
- [ ] **Not a hidden no-op.** It isn't a subtler always-green gate the linter
      can't see: a test suite with zero assertions, a `grep` over a file the same
      stage writes, a custom command that always exits 0, a check whose target the
      agent also authors.
- [ ] **Asserts the OUTCOME, not a proxy.** It checks the observable result (row
      count, status-by-input, pixel), not a surface token ("SQL contains LIMIT",
      "a 429 appeared"). A grep/diff catches **new/untracked** files
      (`git status --porcelain`) AND pins its reference (`git diff <baseline-tag>`,
      not bare `git diff` which ignores staged/committed edits). Coverage is
      **scoped** to the changed module (`--cov=<pkg>`), not an aggregate
      `--cov=src`. A soak/statistical gate states its trial count and the residual
      rate it can detect. A "vs baseline" check captures the baseline before any change.
- [ ] **`falsifiable_when` is a real break,** not a restatement of the goal.
- [ ] **`passing_but_wrong` is honest** — a concrete implementation that passes
      this check but is wrong (or a justified `"none: <why exhaustive>"`). If I
      can think of a false-pass it omits, the check is still too weak.
- [ ] **Failure branches reachable** from this check's actual failure modes.
- [ ] **Success matches proof.** `stop_conditions.success` (design-level) is
      actually *proven* by the stage checks — not broader than what they verify.

## Design level

- [ ] **Decision log honest.** D0–D6 (`selection_log`) each have a real
      justification, not a label. D1's stage boundaries pass the seam test.
- [ ] **Cadence matches the knobs (D6).** If D6 claims *completeness-first*, the
      design actually shows it — low `max_iterations`, large per-stage scope,
      `plan_execute_verify`/`explore_narrow`, and a THOROUGH per-stage check (not a
      smoke). Guidepost: completeness-first ≈ single-digit-low caps (≤4); a
      completeness_first label at ≥8 caps + `retry` + a smoke check is a **mislabel**
      (the linter can't catch it — that's why this box exists). Same in reverse for
      *iteration-first*.
- [ ] **Maker/checker concrete.** `maker_checker.scope` names a specific
      adversarial target (the diff + the per-stage checks), not "review quality".
- [ ] **Roles genuinely separate (§II).** `roles.evaluator` is a *fresh* context
      that never saw the impl or the generator's reasoning, and is adversarial (told
      to prove the artifact broken) — not the generator wearing a reviewer hat. A
      loop where the builder grades itself converges on slop. **Read the mandate
      prose against the attested booleans**: `separate_context:true` above a mandate
      that says the evaluator reviews its own diff is a lie the linter cannot see —
      the booleans are author-attested; this box is where the attestation is checked.
- [ ] **The check is outside the generator's write surface (§II).** If the design did
      NOT buy an independent evaluator, the runnable check is the arbiter — so the
      judging script and its result file are read-only to the generator, or the check
      runs via a hook/wrapper the generator doesn't invoke. Named in
      `maker_checker.scope`. A generator that can edit the check or its verdict is
      grading itself through the back door.
- [ ] **Contract actually pins the behavior (§III).** `contract.assertions` are
      enough to catch a plausible wrong build, not a rubber-stampable handful.
      The numbers are **lower bounds over machine-gradable assertions** (endpoint
      **≥ 8**, module **≥ 12**, app **≥ 20**; ceiling = 3× the bound, so a thin
      contract is never fixed by padding). The linter's floor of 3 is a *lower*,
      different thing — clearing it does not clear this box. Each assertion is a real
      testable claim with a check that can FAIL — and the check *asserts the
      outcome*, not mere existence (`test -f service.js` proves a file exists, not
      that billing works). `human-verify:` entries are for the genuinely
      non-machine-checkable residue, not a way to dodge grading (the linter already
      refuses to count them toward its floor). Every stage DoD traces back to the
      contract rather than restating the spec.
- [ ] **Restart vs escalate (§V).** A stage that can become archaeology has a
      `restart` route (discard + re-derive from the contract), and the design does
      NOT put a human in the way of a restart — human escalation is reserved for a
      **wrong contract**, not a broken build.
- [ ] **The stall trigger is a pre-registered counter (§V).** "Patching has stalled"
      is written as a number *before* iteration 1 ("2 consecutive same-class
      failures → restart"; "a top-severity defect inside the previous iteration's own
      fix → restart"), not left to in-flight judgment. If I can only find prose that
      says the agent should "consider restarting when progress slows", the route will
      never fire — optimism defers it every round.
- [ ] **Stop condition closes on BOTH sides (D5).** There is a **zero-change gate**
      ("N consecutive iterations with zero new changes → stop", the anti-arms-race
      brake) AND a **minimum-progress floor** below which an early "done / can't
      proceed" routes to `escalate` instead of counting as a stop. Caps
      (iterations/time/budget) are written inside `stop_conditions` and are only
      changeable from outside the loop. One-sided = half a stop condition.
- [ ] **Subjective checks calibrated (§VI).** Any taste/quality gate is a rubric
      scorer with weighted axes calibrated on good-vs-slop references — not a vague
      "looks good"; and its `passing_but_wrong` is honest that a rubric only
      converges toward the taste written down.
- [ ] **Harness earns its keep (§VIII).** Nothing in `harness_primitives` /
      scaffolding is there only to babysit a capability the model now has for free;
      degrees-of-freedom match the task (high-freedom prose for open work, precise
      scripts only for the fragile/irreversible steps). A durable on-disk state set
      (contract/progress/append-only log) exists so the loop survives a context loss /
      `codex resume`.
- [ ] **Harness parts classified, and not self-classified (§VIII).** Each
      scaffolding component is labelled **compensating** ("the model can't do this
      yet" → settled by a bare-model with/without comparison, stamped with the model
      baseline) or **structural** ("an architectural constraint still holds" →
      settled by whether that constraint still exists). The class is recorded for the
      checker to confirm, not asserted by whoever built the component — a builder who
      can self-label a part "structural" can exempt anything from pruning by naming it.
- [ ] **Run report pairs its numbers (§VII·b).** Every success/autonomy metric the
      loop will report has its integrity/damage counterpart beside it — gates-green ↔
      weakened-assertion diff audit, autonomous-resolution ↔ regression escapes,
      throughput ↔ defect/rollback rate — or an explicit `not measured` tag (sampled
      audit is the legal degradation; dropping the line is not).
      `iterations_to_acceptance` is read both ways: too low means the check is too
      weak, not that the loop is fast. Benefit claims are verified by external
      timing / a gate, not by the participants.
- [ ] **Bottleneck named (§IX).** The report says where the current weakest link is
      (plan? verification? taste?) and what you'd harden next — not "all smooth".
- [ ] **Autonomy matches risk.** `human_placement` follows D3 (weak check or
      irreversible high-blast ⇒ `in_the_loop`).
- [ ] **Caps real.** Every stage + the outer loop carry a finite `max_iterations`;
      the stage graph is acyclic (enterable + terminating).
- [ ] **Routing sane.** Every `on_failure.loopback` targets an upstream stage.
