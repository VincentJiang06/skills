# Verification must be independent and executable

This rule **supersedes** the softer allowances elsewhere ("red by construction",
"inline running is acceptable at lite"). It exists because self-reported pass
counts let real bugs and hollow tests ship while the skill still reports green.
The bar: verification a *third party can re-run*, not a number you assert.

## 1. A committed, re-runnable harness (any skill that ships a script)

If the skill's mechanism is a deterministic script (a CLI/parser/transform —
most skills are), it MUST ship a committed harness the conductor can re-execute:

- Put the **mechanism in `scripts/`** (a separate file) and have
  `evals/run_all.mjs` (or `.py`) **import** it. Never embed the implementation
  inside the harness — a harness that tests its own copy proves nothing, and the
  conductor rejects it as tautological.
- The harness runs **every** eval case against the `scripts/` mechanism, prints
  one `PASS/FAIL <case>` line each, and **exits non-zero if any case fails**.
- **Run it for real** and record in the build-report's `verification`:
  `harness_required: true`, `harness_ran: true`,
  `harness_path: "evals/run_all.mjs"`, and
  `command_output` = the actual captured stdout/exit code. Pass counts come from
  **this run**, never from a mental simulation.
- A `verification.ran: true` with no re-runnable harness is **not** acceptance
  for a script skill — the conductor re-runs the harness and will catch it.

Inline / builder-as-grader running is allowed **only** for lite skills with **no
deterministic script** (pure LLM-behavioral). Even then, grade against the
written `acceptance`, and say so in `verification.evidence`.

## 2. A real red artifact (TDD is not paperwork)

"Red by construction" (the stub has no logic, so cases obviously fail) is **not**
sufficient evidence of tests-first. Before implementing:

- Scaffold the stub so it **imports cleanly and returns a fixed WRONG sentinel**
  (e.g. `return { __stub: true }`) — **never `null`/`undefined`** (a null stub
  makes idempotency/round-trip cases `null === null` trivially pass in red, hiding
  those contracts) and never a missing file. The harness must reach the
  **assertions** and fail there — including the idempotency/round-trip case —
  producing real `FAIL <case>` lines. A red log that is only a module-not-found
  crash (`ERR_MODULE_NOT_FOUND`) or a bare `EXIT:1` proves the file didn't exist,
  not that the assertions were authored first.
- Run the harness against that stub and save the **real captured stdout** to
  `<target>/.skill-engineer/red/red.log`. A valid red log contains **≥1 line
  matching `FAIL `**. Prose, a lone `EXIT:1`, or an import error is **not** a red
  log — the conductor rejects it and scores `tdd: partial` at most.
- Only then implement to green.

**1:1 doc-claim coverage:** every rule / capability / token-type / mode your
SKILL.md or `rules/` *assert* must have at least one passing case demonstrating
it on a real input. A capability you document but never test is dead
documentation — the conductor's final acceptance extracts your doc claims and
loops back on any with no green case.

Absent a real failing-run artifact, report `tdd: partial` in the build — do not
imply tests-first. At **full** altitude the **mutation** spot-check is mandatory
and must be recorded with evidence (e.g. "broke the AWS-key regex → case C1 went
red"), captured in the report; without that artifact, `tdd` is not `done`.

## 3. No tautological tests

A negative/adjacent case must assert on the skill's **behavior/output** for a
real adjacent prompt — **never** on whether a guard string appears in SKILL.md
(`grep "Do NOT"` is not a test). Self-check for every case:

> *Would this case still pass if the protocol step it's meant to protect were
> deleted?* If yes, it tests nothing — rewrite it.

A case satisfiable **without invoking the skill** is invalid and must not be
counted toward the pass total.

## 4. Boundary / adversarial coverage (not just happy paths)

Happy-path-only is not green. **Bind one green eval case to EVERY entry in the
spec's `recommended_design.adversarial_checklist`** — these are first-order
members of the skill's own input class (mixed numeric+non-numeric sibling keys,
6-field cron, bare `|` alternation, multi-key `ENV`…), exactly where the bugs
hide. Record the mapping in the build-report as
`tests.checklist_coverage[]` = `{edge, case_id, passed}`, one per checklist entry.

**This is gating, not advisory:** the conductor's E gate diffs the spec checklist
against `checklist_coverage` and loops back on any uncovered or failing entry
*before* final acceptance — so the catch happens in the build loop (which can
reach a bug-free `industrial`), not post-hoc (which only caps at `candidate`).
Also include an **idempotency / metamorphic** case for any transform (run twice →
same output; round-trip → original).

## What the build-report must carry

`verification`: `ran`, `all_required_passed`, `evidence`, and
`harness_required`. For a script skill, also carry `harness_ran: true`,
`harness_path`, and `command_output`. The conductor's E gate (and final
acceptance) re-runs `harness_path`; if it can't, or the skill ships a script
with no harness, the gate fails. Honesty over green: a real `partial`/`stopped`
beats a fake `done`.
