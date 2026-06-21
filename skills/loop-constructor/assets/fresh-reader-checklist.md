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

- [ ] **Decision log honest.** D0–D5 (`selection_log`) each have a real
      justification, not a label. D1's stage boundaries pass the seam test.
- [ ] **Maker/checker concrete.** `maker_checker.scope` names a specific
      adversarial target (the diff + the per-stage checks), not "review quality".
- [ ] **Autonomy matches risk.** `human_placement` follows D3 (weak check or
      irreversible high-blast ⇒ `in_the_loop`).
- [ ] **Caps real.** Every stage + the outer loop carry a finite `max_iterations`;
      the stage graph is acyclic (enterable + terminating).
- [ ] **Routing sane.** Every `on_failure.loopback` targets an upstream stage.
