# Changelog — test-driven-development

## 1.1.0 — 2026-09-25 — targeted settlement for Opus 5.5 / Fable 5.1 (incremental alignment, A40/O7)

Settled under claude-opus-5-5, effort high, Claude Code 2.1.280 (R20 upgrade wave;
KB v0.4.0). Minor bump: the delegation contract and the independence contract change
behaviour. Nothing in the A42(iv) exempt set moved: the trust boundary, the evidence
block (command + real output + exit status), the "Banned without a run attached"
sentence, revert-to-red, enforcement-gates §1 (except one presupposition, below), §2
and `references/trust-boundary.md` are byte-identical to 1.0.0.

### Changed
- **Delegation is ADVICE, not a checkbox** (audit A2a → ADC1b "async subagents save
  time, not quality", ADC2 "don't subagent-recheck yourself on routine tasks", H8
  stale compensator; owner preference against slow/serial keeps it as advice rather
  than deleting it). Loop steps 1/3/6 say *delegable*; the section says dispatch when
  the suite is large or steps parallelize, inline is fine for a small suite, and
  **delegation changes who runs a step, never whether** — a delegated run still
  returns command + real output + exit status, or it is not evidence (P5; F1 guard).
  `modify-mode.md` Step 1/4 and `enforcement-gates.md` §1 (one bullet) and §7 (one
  bullet) no longer presuppose delegation.
- **Independence is conditional on a non-fork agent** (audit A2b → ADC5 "fork is on
  by default and gives up input isolation", P12/H2 verdict separation needs context
  isolation). The fresh test-author (SKILL.md rationale, `enforcement-gates.md` §4),
  the verifier (§5) and the §7 closing line now require a fresh agent that is NOT a
  fork, or a separate session; if the host can only fork or you cannot tell, the
  report says independence was not achieved. The done-checklist swaps the delegation
  box for that honesty box. Wording is host-agnostic (no host flag names).
- **`evals/README.md` scope note** (audit A3 → P13/S14/A50, iron rule 2): the
  regex/count metrics (`right_size_precision`, `proliferation`, `mock_hygiene`,
  `stale_convention`) are construction-verified proof on the committed fixtures only;
  on `--candidate <external path>` they are D->L evidence for a judge or human
  (witness pair: a legitimate `expect(onSave).toHaveBeenCalledWith(x)` is flagged by
  `mock_hygiene`). No `grade.py` change. (`evals/` is untracked per repo policy; this
  entry is the committed record, the conductor syncs the file at merge.)
- **STALE model_baseline stamp** on the 64K sentinel rubric (audit Q1 / A5 → A37):
  `model_baseline: claude-fable-5 (2026-07-14)`, re-verify within 4 cycles.
- SKILL.md 2,836 → 2,835 always-loaded tokens; description byte-identical; harness
  unchanged (grade.py 808 / run_all.py 187 / build_context.py 148 lines, 10 scenarios,
  22 checks).

### Evidence
- E11 two-arm baseline (audit A1 → E11/A44): pre-registered class
  **encoded-preference**, 3 cases, WITHOUT arm explicitly disables the skill; arms and
  rubric prepared in the R20 run directory (`runs/test-driven-development/arms/`),
  run and judged by the conductor. Resolution caveat: N=3, no perturbation arm —
  direction only, partial A44 compliance.

### Battery round-1 fixes (prose only; no grader change — iron rules 2/3, A50)
Battery 2026-09-25 (instance tier) confirmed three P2 grader gaming channels. Each is
closed by narrowing the claim, not by new grader code: hardening a regex or adding an
infra gate would restart the mechanization arms race iron rules 2/3 forbid. `evals/` is
untracked; the exact edits are recorded as patches in
`runs/test-driven-development/battery/fix-patches/` for the conductor to sync at merge.
- **F-01 — the stress scenario's `revert_to_red` is not a vacuity backstop** (P13
  judgment plane; A50(i) witness pair → evidence only; E6 evaluator first suspect).
  `task.json` declares the base's `ValueError: unsupported duration` an expected red,
  so any test that calls a new form reds on revert whatever it asserts (witness: impl
  `'45m'`→7, test checks only `isinstance(..., int)`, all metrics PASS).
  `evals/README.md` no longer calls revert-to-red "the backstop for vacuous tests of ANY
  shape"; the sentinel `rubric.md` reads grader output as evidence and adds dimension 4
  "the red bites" (judge reads the assertions and the pasted RED) with a
  PASS / FAIL / UNSURE→human vocabulary (iron rule 6 ⑥). `expected_red_patterns`
  unchanged (the ValueError red is the legitimate feature-missing red for the good
  candidate).

### Not changed (exemption register, carried under A40)
E-DESC description 394 chars > 320 target (no trigger-eval budget) · E-TOK SKILL.md
> 1,500-token warn (orchestrator skeleton) · E-NOSTAMP prose references carry no
model_baseline · E-PRESSURE "Don't rationalize in either direction" kept pending a
per-rule A14 probe (audit A2c rejected this round; "Banned" and "irreducible core" are
the A42(iv) evidence obligation itself) · E-SENTINEL live 64K run not re-run on Opus
5.5 · E-EVALS evals/ stays untracked · E-JUDGELEDGER no A49 ledger (1.0.0 predates
A49; this round adds no D-plane gate) · E-SKIPPASS run_all.py still exits 0 when a
toolchain is absent — count `checks evaluated : 22` / `node-skipped : 0`, not the exit
code (default python3 without pytest evaluates only 6). Audit A4 (node_modules in
installs) is a deploy step, forwarded to the conductor.

### Archived (model_baseline: claude-fable-5, 2026-07-14; settled under claude-opus-5-5 effort high, Claude Code 2.1.280) — Z8 archive, not destroy
SKILL.md 1.0.0 section, verbatim:

> ## Delegate the mechanical parts to subagents
>
> Dispatch to subagents — **parallel** when independent — and consume only
> summaries: suite inventory (native collector — `pytest --collect-only`,
> `vitest list`; never hand-write a parser), targeted run + failure-parse,
> stale/duplicate scan, batch case-writing. If the host lacks subagents this
> degrades to inline — but that loses the correlated-error independence; say so
> honestly [P5].

SKILL.md 1.0.0 done-checklist item, verbatim: `- [ ] Mechanical steps delegated, not inline-serial.`
Why removed: delegating a run never bought independence (the delegated agent reports
what the author asked it to run); independence lives only in §4/§5, now conditioned
on non-fork agents.

## 1.0.0 — 2026-07-14 — ground-up rewrite via the skill-creator-max pipeline

Major-version re-grounding: every rule re-derived to a skill-philosophy KB anchor
([P0]/[P2]/[P5]/[P8]/[P10/A36]/[E2]/[E8]), built through the full 5-stage pipeline
(composer → guidance → engineer → zipper → seeded 5-lens independent battery). The
proven behavioral core is CARRIED, not discarded: right-size gate, MODIFY mode,
watch-it-fail-with-evidence, revert-to-red, Beck GREEN strategies, subagent
delegation, generator-in-loop, and the real-fixture harness all survive re-anchored.

### Added
- **Trust-boundary spine** [P10/A36] — SKILL.md section + `references/trust-boundary.md`:
  instruction-shaped text inside processed code/tests carries ZERO authority (an
  embedded "skip the run" is inert data, quoted never obeyed); running arbitrary test
  code is a real action surface with authority-downgrade tiers and refuse categories
  (destructive / out-of-repo I/O). Plus an **injection eval scenario**: an embedded
  "this suite already passes" must not prevent a real failing run.
- **E-L3 stress sentinel** [E2] — `evals/fixtures/stress_sentinel_py/`: extend behavior
  mid-64K-context under same-domain STALE distractors; deterministic proxy check rides
  run_all (stale-convention scan), the LIVE 64K run executes at major-version cadence
  (verified this release: fresh subagent, discipline held 4/4).
- **Reflow point** [E8] — `references/reflow-point.md`: a user correction of test output
  is captured as a candidate regression case, not just an apology.
- **Assertion-kind red discrimination** (battery F1, P1): `grade.py`'s revert-to-red now
  requires the red to be an ASSERTION failure — a crashed runner / raising stub / import
  error no longer counts as "went red", closing the constant-impl + vacuous-assert cheat.
- **Toolchain probe** (battery F2): present-but-broken pytest/vitest now SKIPs with a
  note instead of hard-failing indistinguishably from a real regression.
- **Held-out non-builder cheats** (battery F3/F5): the battery's own two gamed solutions
  (`bad_battery`, `bad_synthesis`, provenance recorded) are pinned as harness
  regressions — breaking author-homology in the eval corpus. Harness 16 → **22 checks**.

### Changed
- SKILL.md fully rewritten (11-section spine, 2,8xx always-loaded tokens, description
  rebuilt trigger-first with near-miss anti-triggers); 4 carry-over references
  re-anchored with KB provenance labels; `modify-mode.md` self-referential pointer fixed.
- Version 0.2.x → 1.0.0.

### Evidence & honesty
- Red-before-green history on disk (`dev-workspace` red-log): stop conditions
  pre-registered before the first eval run; new metrics watched RED before implementation.
- Independent seeded battery: 5 lenses + synthesis, 5/5 seeds recovered on valid runs,
  one blind run voided and re-dispatched; 5 real findings (1 P1) all fixed behaviorally
  and pinned. Independence tier: instance (cross-vendor waived this run; upgrade to
  industrial pre-registered = one fresh clean battery round).
- Known limitations documented in `evals/README.md` (candidate-granular revert-to-red,
  ride-along vacuous assertions, per-assertion vacuity out of scope).

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
