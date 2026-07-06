---
name: test-driven-development
description: >-
  Test-driven development for NON-TRIVIAL behavior — write a failing test FIRST,
  watch it fail, then write minimal code to pass; the suite is a LIVING SPEC you
  EDIT/MERGE/DELETE as the target changes. Use when implementing real logic, fixing
  a bug, or changing tested behavior. Do NOT use for trivial edits or prototypes.
metadata:
  version: 0.2.0
---

# Test-Driven Development

## What this is

The test suite is a **living spec** of the current target's behavior. TDD keeps
the spec and the code in sync: adjust the test **first**, watch it fail, write
the minimal code to pass. When the target changes, you **update the spec** —
edit, merge, or delete tests — you do **not** pile new tests on top of stale ones.

Guard against **both** failure modes, equally:

- **(a) Skipping tests on real behavior** → unverified code, silent regressions.
- **(b) Ritualizing trivia / piling on tests** → slow runs, a redundant, bloated,
  brittle suite that's painful to change.

Right-size every time: engage on behavior worth pinning down, stay out of
mechanical churn. The old "TDD on *everything*, one test per micro-behavior"
stance is failure mode (b) — don't.

## When to engage — the right-size gate (preflight, ~3 seconds)

Classify the change first. **ENGAGE** (write/update a failing test first) when it is:

- **New logic** — a function / method / endpoint / component with branching,
  edge cases, state, or a contract worth pinning down.
- **A bug fix** — reproduce the defect with a failing test first; it stays as a
  regression guard.
- **A behavior change to already-tested code** — update the existing tests to the
  new target (this is MODIFY MODE, below).

**DO NOT engage full TDD** — just make the change — when it is:

- **Trivial / mechanical** — renames, formatting, comments/docstrings, type-only
  changes, moving code, import reordering.
- **A config / constant tweak that no behavior depends on** — `timeout 30→60`, a
  log level, a UI label. *But a constant that **feeds logic** is the opposite —
  a tax rate in a price calc, a validation regex, a flag that **gates a branch** —
  changing it is a behavior change: engage and **update** the test that asserts the
  old value (modify mode). The qualifier is "no behavior depends on it," not "it
  looks like a constant."*
- **A throwaway prototype / exploratory spike** — throw the spike away, *then*
  TDD the real implementation.
- **Generated code** or **pure-docs** (README/markdown).

One question is the authority — it outranks the lists above when they seem to
conflict: **"could this break in a way a test would catch?"** Yes → engage; no →
skip, state the one-line reason, move on. Don't rationalize in *either* direction —
not "skip TDD just this once" on real logic, not "better add a test" on a rename.

### Two special cases: refactoring & untested code

Behavior-preserving work doesn't fit "write a failing test first":
**refactor with green tests covering it** → don't write a new failing test, keep
the existing ones green; **refactor untested / "add tests to legacy" code** →
write **characterization tests** pinning *current* behavior first, then change.
Full handling (the characterization "red" equivalent, why it fires on *change*
not on mere lack of tests): [references/refactor-and-legacy.md](references/refactor-and-legacy.md).

## The loop — once per feature-GROUP, not per assertion

A **feature-group** is one coherent behavior with its edges (e.g. "email
validation: empty / whitespace / valid"), **not** each individual assertion. Run
one cycle per group:

1. **Inventory** *(delegate)* — find tests already covering the target area.
   Dispatch a subagent running the stack's **native collector** (don't hand-write
   a parser). See [native collectors](references/modify-mode.md#native-collectors).
2. **Decide the mode** — covered already? → **modify**. Target changed, test now
   wrong? → **update/delete**. Genuinely new? → **add ONE** group test. See
   [modify mode](references/modify-mode.md).
3. **RED** — write or extend the one group test (table-driven / parametrized for
   its edges). **Watch it fail once** for the group — mandatory, never skipped.
   *Delegate* the targeted run + failure-parse to a subagent.
4. **GREEN** — minimal code to pass the whole group. Batch red→green per group,
   not per assertion. No features, options, or "improvements" beyond the test
   (YAGNI). **Do NOT touch the test to make it pass** — if the test is wrong
   that's a spec change (go back to modify mode), not a way to reach green.
   *How minimal?* Use Beck's three strategies — **Fake It** (return a constant,
   then generalize), **Obvious Implementation** (only when it's truly trivial),
   **Triangulation** (generalize only once a second case forces it). See
   [enforcement-gates.md](references/enforcement-gates.md#green-strategies).
5. **REFACTOR** — clean up while staying green. Refactor **removes duplication;
   it adds no behavior** (no new behavior = no new test here). Re-run to confirm.
6. **Stale-scan** *(delegate)* — dispatch a subagent to find tests this change
   made stale or duplicated; consolidate or delete them.
7. **Report** — say what you **added vs edited vs merged vs deleted**, not just
   "tests pass".

## Modify mode — the default once a suite exists

The suite tracks the *current* target. Before adding anything, check what's there
and **prefer to change it**: edit/strengthen an existing test, **merge** related
behavior into one parametrized test, **update or delete** a test the target moved
past, consolidate duplicates — **add ONE** group test only when nothing covers it.
Net rule: for the same feature-group, the test count should **not** grow just
because the code changed. The full situation→action table, worked examples + the
per-stack consolidation patterns: [references/modify-mode.md](references/modify-mode.md).

## Delegate the mechanical parts to subagents

Keep the main thread fast and uncluttered. Dispatch these to subagents — in
**parallel** when independent — and consume only their summary:

- **Suite inventory** — run the native collector, return the tests covering the area.
- **Targeted run + failure-parse** — run *only* the relevant test(s), return
  pass/fail + the failure message (not the full-suite noise, not a re-run per assertion).
- **Stale / duplicate scan** — find tests referencing removed/renamed symbols or
  overlapping coverage.
- **Batch case-writing** — draft a group's many parametrized cases in a subagent,
  then review.

Don't do all of this inline and serially — that's the slow, redundant process this
skill exists to replace.

## Watch it fail — the irreducible core (with EVIDENCE)

```
NO production code for a behavior without first seeing its test FAIL — once per feature-group.
NO "red/green/done" claim without the actual command + its output + exit status.
```

If you didn't watch it fail, you don't know the test tests the right thing. For
*new or changed* behavior, a test that passes the moment you write it is testing
existing behavior or nothing — so it must fail first. (The sole exception is a
deliberate **characterization** test pinning existing behavior before a refactor;
there you confirm it exercises the target instead — see "Two special cases" above.)
This gate is **per feature-group** (not per assertion, not per micro-behavior),
and it is never skipped — not even when "it obviously fails." Confirm the failure
is the *expected* one (feature missing), not a typo or import error.

**Why this bites harder when one context writes both test and code:** their mistakes
*correlate* (Knight–Leveson) — a test shaped to fit the code goes green by mirroring
the implementation, not by being right. Watch-it-fail + revert-to-red break that
correlation (the attacker/evaluator independence, turned on your own tests); for
high-stakes new behavior a **fresh test-author subagent** given only the spec is
stronger still ([enforcement-gates.md](references/enforcement-gates.md) §4).

**Evidence, not honor.** Back every "red confirmed" / "tests pass" / "done" with the
*run* — command + real output/exit code (your delegated runner returns exactly this).
Banned without it: "should pass", "probably fails", "looks correct", "seems to work".
An unverified claim is a defect ([enforcement-gates.md](references/enforcement-gates.md) §1).

## Prove the test catches the bug — the revert-to-red gate (bug fixes)

A passing regression test is worthless if it would pass *without* the fix. For
every **bug fix**, after green, prove the test is real:

```
write failing test → watch it RED (right reason) → fix → GREEN
→ REVERT the fix → re-run: the test MUST go RED again → restore the fix → GREEN
```

If the test stays green with the fix reverted, it doesn't test the bug — it's
vacuous. Strengthen it until reverting the fix turns it red. This is the single
strongest defense against green-but-useless tests, and the eval harness checks it
mechanically (`evals/` auto-reverts and asserts red). Full pattern + the optional
context-isolated test-author and independent-verifier gates:
[enforcement-gates.md](references/enforcement-gates.md).

## Real behavior over mocks

Test what the code does, not what a mock does. Use real code; mock only what's
genuinely unavoidable (true external I/O), and never assert on the mock itself.
When adding mocks or test-only helpers, load
[references/testing-anti-patterns.md](references/testing-anti-patterns.md).

## In an agent loop, you are the GENERATOR

Inside a loop-constructor runbook (separated roles), TDD is the **generator's**
inner discipline: your suite is part of the artifact, **not** the loop's verdict —
a fresh **evaluator** (the attacker stance) grades the negotiated contract. Never
present your own green as acceptance; and during NEGOTIATE, get a machine-gradable
**"no test assertion weakened, deleted, or renamed-around vs baseline"**
cross-cutting assertion into the contract (the loop does NOT emit one for you) —
then a weakened-or-vanished assertion is a **breach**, not a pass (a modify-mode
edit needs a citable target change).
Details: [enforcement-gates.md §7](references/enforcement-gates.md#tdd-in-a-loop).

## Before you call it done

- [ ] Right-size gate applied — engaged on real behavior, skipped on trivia (reason stated).
- [ ] Each feature-group has **one** test (parametrized for its edges), not one-per-assertion.
- [ ] Watched each group's test fail for the expected reason before implementing — with **evidence** (command + output), not a claim.
- [ ] Bug fix? Revert-to-red done — confirmed the test goes red without the fix, then restored.
- [ ] GREEN reached without editing the test to pass; implementation is minimal (no YAGNI bloat).
- [ ] Modify mode honored — edited/merged/deleted where a suite already covered the area; no duplicates added.
- [ ] No stale tests left asserting the old target.
- [ ] Mechanical steps (inventory, runs, stale-scan) delegated, not done inline-serial.
- [ ] All tests green; output clean (no errors/warnings); real behavior, not mock behavior.
- [ ] Reported what was added vs edited vs merged vs deleted.

Can't check a box? You skipped a step — fix it before claiming done.

## Modules

| File | Load when |
|------|-----------|
| [references/enforcement-gates.md](references/enforcement-gates.md) | The anti-gaming core: verification-evidence, revert-to-red, Beck's GREEN strategies, optional context-isolated test-author + independent-verifier subagents, TDD-inside-a-loop (generator role). |
| [references/modify-mode.md](references/modify-mode.md) | Once a suite exists: native collectors, edit/merge/delete decision, consolidation patterns. |
| [references/refactor-and-legacy.md](references/refactor-and-legacy.md) | The two special cases — behavior-preserving refactor, or "add tests to legacy / untested code" (characterization tests). |
| [references/testing-anti-patterns.md](references/testing-anti-patterns.md) | When adding mocks / test-only helpers — the over-mock and assert-on-mock traps. |

## Eval (real-fixture behavioral harness)

`evals/` holds small **real fixture repos** (pytest / vitest: must-engage,
must-skip, modify-mode + anti-gaming traps). The grader runs on the resulting
diff, **auto-reverts the production change to confirm each new test goes red**
(vacuity), counts net test growth on modify traps, and expects zero new tests
on negatives (right-size precision).
See `evals/README.md`.
