# Enforcement gates — the anti-gaming core

The discipline in SKILL.md only works if the loop can't be quietly cheated. These
are the gates that turn "I did TDD" from an honor claim into a verifiable one.
They are what put this skill ahead of "always write a test first" TDD skills:
those guard *intent*; these guard *behavior*.

Load this when you're in a RED/GREEN cycle, fixing a bug, or about to claim done.

---

## 1. Verification-evidence gate

A status claim is only as good as the run behind it.

> **No "red confirmed", "tests pass", or "done" without the command you ran and
> its actual output + exit status.**

- When you (or the subagent you delegated the run to) report RED or GREEN, the
  report includes the command and the real failure/pass output — not a summary,
  not a guess.
- **Banned phrasings** (they signal you didn't run it): "should pass", "this
  will fail", "looks correct", "seems to work", "probably green". Replace each
  with the run.
- This is cheap because you already delegate the targeted run (SKILL.md step 3).
  The rule is just: *consume the evidence, don't paraphrase it away.*

Why it matters: the #1 documented LLM-TDD failure is claiming a test was watched
fail (or that everything passes) without running it. Evidence kills that.

---

## 2. Revert-to-red gate (every bug fix)

A regression test that would pass *without* the fix is worthless. Prove it isn't:

```
1. Write the failing test that reproduces the bug.
2. Run it → RED. Confirm it fails for the RIGHT reason (the bug), not a typo/import error.
3. Apply the fix.
4. Run it → GREEN.
5. REVERT the fix (git stash / undo just the production change — keep the test).
6. Run it → it MUST go RED again.
7. Restore the fix. Run it → GREEN.
```

If step 6 stays green, the test does not exercise the bug — it's vacuous.
Strengthen the assertion (tighten the expected value, assert the specific
behavior, not an incidental side effect) until reverting the fix turns it red.

Worked example (Python):
```python
# bug: discount() ignores the cap and can return a negative price
def test_discount_never_below_zero():
    assert discount(price=10, pct=200) == 0      # was returning -10
```
- RED: `pytest -k discount_never_below_zero` → fails (returns -10).
- Fix `discount` to clamp at 0. GREEN.
- Revert the clamp → re-run → RED again (returns -10). ✓ the test catches the bug.
- Restore. GREEN.

The eval harness automates this: it applies the agent's diff, then reverts the
**production** hunk and re-runs the new test, asserting it goes red. A test that
survives the revert is a FAIL.

---

## 3. GREEN strategies — how minimal is minimal {#green-strategies}

From Kent Beck. The answer to "I wrote the whole general solution in GREEN"
(over-implementation) and "my test passes trivially" (under-testing):

- **Fake It** — return the literal constant the test expects, then generalize on
  the next case. Fastest way to confirm the test is wired and to get to green.
- **Obvious Implementation** — type the real implementation directly, but *only*
  when it's genuinely trivial. "If your brain writes checks your fingers can't
  cash, downshift to Fake It / Triangulation."
- **Triangulation** — only generalize the implementation once you have **two or
  more** examples that force it. One example never justifies the general form.

And: **Refactor removes duplication; it never adds behavior.** New behavior means
a new RED first — it does not belong in the REFACTOR step.

---

## 4. Context-isolated test-author (optional; non-trivial NEW behavior)

An agent that already knows how it will implement a feature will subconsciously
write the test *around* that implementation — "cheating without meaning to." For
non-trivial new behavior where genuine test-first matters, isolate the two roles:

- Dispatch a **test-author subagent** given the **contract/spec only** (signature,
  inputs, expected behavior, edge cases) — and *not* the planned implementation.
  It writes the failing test.
- You (or an implementer subagent) then make it pass.

Keep this lightweight: it's a recommendation for high-stakes logic, not a
mandatory step for every group. For a small group, watch-it-fail + revert-to-red
is enough.

---

## 5. Independent-verifier subagent (before claiming done)

Inline self-review is post-hoc rationalization. For a non-trivial change, dispatch
a **fresh verifier subagent** that sees only the diff + the test file (not your
reasoning) and confirms:

- each new/changed test was RED before it was GREEN (evidence present),
- no test asserts on a mock object / a test-only method on a production class
  (see testing-anti-patterns.md),
- net test count for the touched feature-group did **not** grow (modify mode),
- the implementation has no behavior the tests don't cover (YAGNI).

It returns a pass/fail verdict with specifics. Fix what it flags before reporting.

---

## 6. Commit-the-red checkpoint (optional, anti-tamper)

After watching RED, commit the failing test as its own checkpoint before writing
the implementation. Then, if the test is later altered to force green, it shows up
plainly in the diff against that checkpoint. Cheap insurance on larger changes.

---

These gates compose with the right-size gate and modify mode in SKILL.md: only
engage TDD when the change warrants it, keep the suite lean, and — when you do
engage — make every red/green claim provable and every regression test
revert-proven.
