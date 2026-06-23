# Refactor & untested-code — the two special cases

**Load this when** the change is behavior-preserving (a refactor) or the request
is "add tests to legacy / untested code" — i.e. when "write a failing test first"
doesn't fit because there's no *new* behavior to drive RED.

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
