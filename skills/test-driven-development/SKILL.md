---
name: test-driven-development
description: >
  Test-driven development for NON-TRIVIAL behavior — write or update a failing
  test FIRST, watch it fail, then write minimal code to pass. The test suite is
  a LIVING SPEC of the current target: as the target changes you EDIT / MERGE /
  DELETE tests, not only add. Use when implementing real logic (a
  function/method/endpoint/component with branching or edge cases), fixing a bug
  (reproduce with a failing test first), or changing behavior of already-tested
  code (update its tests to the new target). Prefer MODIFYING the existing suite
  over growing it: one test per feature-group, merge related cases into one
  parametrized test, delete tests the change made stale. Delegate the mechanical
  parts — suite inventory, test runs, stale-test scans — to subagents. Do NOT
  engage for trivial/mechanical edits (renames, formatting, comments, type-only,
  config/constant tweaks), throwaway prototypes/spikes, generated code, or
  pure-docs changes.
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

Behavior-preserving work doesn't fit "write a failing test first" — handle it explicitly:

- **Refactor with green tests already covering it** → do **not** write a new
  failing test. The existing tests are your safety net: run them after, keep them
  green. There's no new behavior to RED.
- **Refactor untested code, or a request to "add tests to legacy code"** → write
  **characterization tests** that pin the *current* behavior **first**, then
  change. This is the one legitimate test that passes when written — its "red"
  equivalent is confirming it actually exercises the target (assert a deliberately
  wrong value once, watch it fail, then lock in the real value). Only then refactor.
  This fires because you're about to **change** existing untested behavior — not
  merely because some code lacks tests. A trivial or brand-new addition (a plain
  getter, a one-liner) still goes through the right-size gate above and usually skips.

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
   not per assertion. No features, options, or "improvements" beyond the test (YAGNI).
5. **REFACTOR** — clean up while staying green. Re-run to confirm.
6. **Stale-scan** *(delegate)* — dispatch a subagent to find tests this change
   made stale or duplicated; consolidate or delete them.
7. **Report** — say what you **added vs edited vs merged vs deleted**, not just
   "tests pass".

## Modify mode — the default once a suite exists

The suite tracks the *current* target. Before adding anything, check what's there
and prefer to change it:

| Situation | Do this | Not this |
|---|---|---|
| An existing test already covers the area | **Edit / strengthen** it | Add a second overlapping test |
| New behavior is related to an existing test | **Merge** into one parametrized/table-driven test | Add a separate near-duplicate |
| Target changed → an existing test asserts the old behavior | **Update** it to the new target (or **delete** if obsolete) | Leave old + new asserting in conflict |
| N micro-behaviors of one feature | **One** parametrized test with N cases | N separate tests |
| Coverage already exists elsewhere | **Consolidate / delete** the duplicate | Grow net test count for the same group |
| Genuinely new feature-group, nothing covers it | **Add ONE** group test | A test per assertion |

Net rule: for the same feature-group, the test count should **not** grow just
because the code changed. Worked examples + per-stack consolidation patterns:
[references/modify-mode.md](references/modify-mode.md).

## Delegate the mechanical parts to subagents

Keep the main thread fast and uncluttered. Dispatch these to subagents — in
**parallel** when independent — and consume only their summary:

- **Suite inventory** — run the native collector, return the tests covering the area.
- **Targeted run + failure-parse** — run *only* the relevant test(s), return
  pass/fail + the failure message (not the full-suite noise, not a re-run per assertion).
- **Stale / duplicate scan** — find tests referencing removed/renamed symbols or
  overlapping coverage.
- **Batch case-writing** — when a group needs many parametrized cases, draft them
  in a subagent, then review.

Don't do all of this inline and serially — that's the slow, redundant process this
skill exists to replace.

## Watch it fail — the irreducible core

```
NO production code for a behavior without first seeing its test FAIL — once per feature-group.
```

If you didn't watch it fail, you don't know the test tests the right thing. For
*new or changed* behavior, a test that passes the moment you write it is testing
existing behavior or nothing — so it must fail first. (The sole exception is a
deliberate **characterization** test pinning existing behavior before a refactor;
there you confirm it exercises the target instead — see "Two special cases" above.)
This gate is **per feature-group** (not per assertion, not per micro-behavior),
and it is never skipped — not even when "it obviously fails." Confirm the failure
is the *expected* one (feature missing), not a typo or import error.

## Real behavior over mocks

Test what the code does, not what a mock does. Use real code; mock only what's
genuinely unavoidable (true external I/O), and never assert on the mock itself.
When adding mocks or test-only helpers, load
[references/testing-anti-patterns.md](references/testing-anti-patterns.md).

## Before you call it done

- [ ] Right-size gate applied — engaged on real behavior, skipped on trivia (reason stated).
- [ ] Each feature-group has **one** test (parametrized for its edges), not one-per-assertion.
- [ ] Watched each group's test fail for the expected reason before implementing.
- [ ] Modify mode honored — edited/merged/deleted where a suite already covered the area; no duplicates added.
- [ ] No stale tests left asserting the old target.
- [ ] Mechanical steps (inventory, runs, stale-scan) delegated, not done inline-serial.
- [ ] All tests green; output clean (no errors/warnings); real behavior, not mock behavior.
- [ ] Reported what was added vs edited vs merged vs deleted.

Can't check a box? You skipped a step — fix it before claiming done.
