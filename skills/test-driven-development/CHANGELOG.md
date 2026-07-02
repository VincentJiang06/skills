# Changelog — test-driven-development

## 0.2.0 — 2026-07-02 — correlated-error through-line

Sharpened the *why* behind the discipline and tied it to the independence family
(attacker, the loop evaluator, reorganize-logic's fresh subagents). No change to the
loop, the right-size gate, modify mode, or the real-fixture eval harness (still green).

### Added
- **Correlated-error (Knight–Leveson) rationale** in SKILL.md's "Watch it fail" core:
  when Claude writes *both* the test and the code, their mistakes correlate — a test
  unconsciously shaped to fit the implementation goes green because it mirrors the code,
  not because the code is right (green-but-wrong). Watch-it-fail + revert-to-red are the
  moves that break the correlation; for high-stakes new behavior, a fresh test-author
  subagent is the strongest form. This makes explicit *why* the existing gates exist and
  why they bite harder on a single-context model.
- `references/enforcement-gates.md` §4 now names the common-mode failure explicitly and
  points at the attacker skill as the same defense applied elsewhere.
- **TDD-inside-a-loop (generator role)** — SKILL.md section + `enforcement-gates.md` §7:
  when a loop-constructor runbook separates roles (0.2.0), TDD is the **generator's**
  inner discipline and the suite is part of the artifact, not the loop's verdict — the
  evaluator (attacker's stance) grades the negotiated contract. The no-weakening
  guarantee is **author-negotiated, not automatic**: during NEGOTIATE the generator gets
  a machine-gradable "no test assertion weakened vs baseline" cross-cutting assertion
  into the contract (loop-constructor emits none by default) — then a weakened
  assertion is a contract breach, not a pass. Also closes the "weaken-a-test disguised
  as modify-mode" hole: a modify-mode edit needs a citable target change, never a red
  you want green. Completes the family story with loop-constructor 0.2.0 /
  attacker 0.4.0 / reorganize-logic 0.2.0.

### Changed
- Added `version: 0.2.0` to frontmatter (was unversioned).

### Unchanged
- The right-size gate, MODIFY MODE, the loop, revert-to-red / verification-evidence /
  Beck GREEN-strategy gates, the subagent delegation, and the real-fixture behavioral
  harness (`evals/`, grader auto-reverts to catch vacuous tests) — all intact and green.

### Validated + hardened by an independent opus-4.8 xhigh battery (same day)
Fresh audit + adversarial + behavioral agents (executor=judge=opus-4.8 xhigh):
**behavioral** — a fresh generator-in-a-loop actor refused all three shortcuts
(weaken / skip / present-self-green-as-done) 5/5 on the judge rubric; **audit** —
every anchor/§-pointer and cross-skill claim verified against the real sibling
files (11 surfaces), one P1 found; **adversarial** — 6 evasion angles, 5 held, one
P2 found. Both fixed same-day:
- **P1: §7 presented the "no assertion weakened" contract assertion as auto-enforced**,
  when loop-constructor emits no such assertion (the only occurrence in its golden
  design is hand-authored — and a `human-verify` at that). §7 / SKILL.md / this
  CHANGELOG now make it the generator's NEGOTIATE-phase duty to get a machine-gradable
  assertion into the contract, with the honest fallback stated (without it,
  no-weakening stays your own modify-mode discipline).
- **P2: the "weakened" framing missed the cheap evasions** — delete-the-red-test-and-
  add-a-laxer-one, rename/move-it, hoist-behind-a-looser-helper (modify-mode
  legitimately sanctions deletion, making it the natural cover story). The assertion
  is now "weakened, **deleted, or renamed-around** vs a captured baseline tag" and the
  check must be vanish-aware — deletions, renames, untracked additions (the exact
  `git diff --quiet -- tests/` trap loop-constructor's loop-selection.md documents).
Real-fixture harness re-run after fixes: 16 checks, PASS.
