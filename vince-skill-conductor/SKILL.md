---
name: vince-skill-conductor
description: >
  Drive a Claude Code skill through the whole three-stage pipeline end to end
  and LOOP on quality gates. Use this whenever the user wants the full ride —
  "build a skill end to end", "run the full skill pipeline", "create, test, and
  compress a skill", "take this idea through guidance -> engineer -> zipper",
  "improve this skill through the whole pipeline" — or hands you an idea / an
  existing skill and wants a finished, tested, compressed result rather than one
  stage's output. It runs the stages in order, GATES between and after each, and
  REPEATS a stage (bounded) when its gate fails instead of pushing a failing
  artifact downstream. It owns no logic of its own — it orchestrates the three
  sibling skills and audits their artifacts.
  Do NOT use for: running just ONE stage (call that stage's skill directly —
  vince-skill-guidance, vince-skill-engineer, or vince-skill-zipper); only
  evaluating or planning a skill (use vince-skill-guidance); only compressing a
  finished skill (use vince-skill-zipper); or scaffolding files from a blank
  prompt with no pipeline to run (use skill-creator).
---

# vince-skill-conductor

Drive the three-stage skill pipeline **end to end** and **loop on quality
gates**. The core idea, in the user's words: *if testing is bad, keep testing —
repeat a stage.* Run the stages in order, **gate** between and after each, and
**repeat a stage** (bounded) when its gate fails rather than pushing a failing
artifact downstream.

This skill is a **thin orchestrator**. It runs **no scripts of its own** — it
invokes the three sibling stage skills and reads the artifacts they emit. Do
**not** reimplement guidance/engineer/zipper logic here; call them.

It runs **autonomously**: no human-in-the-loop confirmation between stages. The
deliverable is a **built + tested + (compressed) skill** plus a **conductor
run-log** conforming to `assets/conductor-log.schema.json` — the run-log is the
real output and records every gate result and every loop.

## The pipeline

```
idea / existing skill
  → Stage G  vince-skill-guidance   → <target>/.skill-guidance/handoff-spec.json
  → Stage E  vince-skill-engineer   → <target>/.skill-engineer/build-report.json
  → Stage Z  vince-skill-zipper     → lossless restructure (in place)
  → FINAL    re-run vince-skill-guidance on the BUILT skill  (guidance is the auditor)
```

The sibling skills (read them; do **not** duplicate them):
- `../vince-skill-guidance/SKILL.md`
- `../vince-skill-engineer/SKILL.md`
- `../chore-develop-vince-skill-zipper/vince-skill-zipper/SKILL.md`

Backing knowledge base for all three stages: the `develop-principle/` sibling
library (default `../develop-principle`).

## Steps

### Step 1 — Scope

Identify the **target** and the **goal/altitude**.

- **A new idea** (no skill yet): create a thin **stub SKILL.md** at the target
  dir so Stage G has something to read — a few lines of frontmatter + a one-line
  body stating the intent. A blank idea is normal input to guidance; an empty
  dir is not.
- **An existing skill/repo**: use its path as-is.

Record the original **goal** in one sentence (what the finished skill must do)
and the **target bar** / altitude. The goal is the yardstick Final Acceptance
measures intent against — write it down before you start so you can't move it
later. Open the run-log at `<target>/.skill-conductor/conductor-log.json`
(schema: `assets/conductor-log.schema.json`) with `target`, `goal`, and an empty
`stages` array — so the location is known at creation time, not just at
finalization (Step 5).

### Step 2 — Stage G (Guidance)

Invoke **vince-skill-guidance** on the target. It writes
`<target>/.skill-guidance/handoff-spec.json`.

**GATE (per `rules/pipeline-loop.md`):** the spec is **schema-valid** and a
**verdict is recorded** (`overall_readiness.verdict`). If the gate fails, repeat
Stage G (bounded). Record the stage attempt (`stage: "guidance"`, `iteration`,
`artifact_path`, `gate_passed`, `gate_evidence`, `action`) in the run-log, then
proceed. Only `stage`, `iteration`, `gate_passed`, and `action` are schema-
required; `artifact_path` and `gate_evidence` are recorded **when applicable** (a
`final_audit` or a skipped Z may have no single artifact path or numeric
evidence), so a missing one is not a schema violation.

### Step 3 — Stage E (Engineer)

Invoke **vince-skill-engineer** on the handoff-spec. It writes
`<target>/.skill-engineer/build-report.json`.

**GATE:** `verification.ran == true` **AND** all required eval cases pass
(`verification.all_required_passed == true` and `tests.totals.failed == 0`)
**AND** every P0 action is `done` in `actions_resolved` (the P0 id list comes
from the spec's `prioritized_actions`, since the build-report carries no
`priority` field — see `rules/pipeline-loop.md` for the two-arg join).

**Loop-back routing (per `rules/pipeline-loop.md`):**
- Gate fails because **tests are bad / not green** → **repeat Stage E** (bounded
  by MAX_E).
- Report shows the **design was wrong** (intent mismatch, P0s unbuildable as
  specified, non-empty build-report `handoff.blocking`) → loop **back to Stage
  G** to re-plan, then re-run E. **This Stage-E→G loopback counts as a full loop**
  — it is capped by **MAX_FULL_LOOPS**, and `loops_taken` increments each time.
  Before looping back, check `loops_taken < MAX_FULL_LOOPS`; if the budget is
  exhausted, **stop** with `final_verdict: "stopped_unmet"` rather than
  re-planning again.

Record the attempt and proceed only on a passing gate.

### Step 4 — Stage Z (Zipper)

Invoke **vince-skill-zipper** on the built skill for a **lossless**
restructure.

**GATE:** lossless — `diff_lossless.py` exits 0 **OR** every `LOST` line is
explicitly classified (per the zipper's verification checklist) — and no content
is lost.

If lossless fails → **repeat Stage Z**, or **skip compression** and note it in
the run-log. **Never ship a lossy result.** Compression is the one optional
stage: a skipped, clearly-noted Z is acceptable; a lossy Z is not.

### Step 5 — Final Acceptance (the detection mechanism)

Load `rules/final-acceptance.md`. **Re-run vince-skill-guidance on the BUILT
skill** — guidance is also the auditor. Read the fresh readiness verdict.

**PASS** when the verdict clears the target bar: it is **not `draft`**, the
**required-at-altitude pillars** are satisfied, and the **intent matches the
original goal** from Step 1. → write `final_verdict: "done"`, finish.

**Otherwise**, loop back to the stage that **owns the gap**:
- testing / metrics / tdd gaps → **Stage E**
- design / trigger / intent gaps → **Stage G**
- bloat / token gaps → **Stage Z**

**BOUNDED:** at most **3 full loops**. If still failing after the budget,
**STOP** and report the blocking gaps honestly (`final_verdict:
"stopped_unmet"`, fill `blocking_gaps`). **Never fake a pass.**

## Loop discipline

Every loop must be:
1. **Justified** by a concrete failing gate (name the artifact field that
   failed),
2. **Bounded** by a max-iteration count to avoid infinite loops: per-stage
   repeats by MAX_G / MAX_E / MAX_Z, and **every return to an earlier stage** by
   the **MAX_FULL_LOOPS = 3** cap. A Stage-E→G design-wrong loopback counts as a
   full loop just like a Final-Acceptance-driven return; both increment
   `loops_taken`. **Hitting the cap forces `stop` / `stopped_unmet`** — never
   another re-plan.
3. **Recorded** in the run-log (which stage repeated, why, the gate result).

Encourage repetition until the gate passes **or** the budget is exhausted —
then stop and report. A failing artifact is never passed downstream.

## Modules

| File | When to load |
|------|--------------|
| `rules/pipeline-loop.md` | Steps 2–4 — exact per-stage GATE definitions (how to read each artifact's pass/fail), the gap→stage loop-back rules, and the max-iteration bounds. |
| `rules/final-acceptance.md` | Step 5 — the final detection: re-audit with guidance, the pass criteria, gap→stage routing, the stop condition, and how to write the run-log. |

## Assets

| File | Usage |
|------|-------|
| `assets/conductor-log.schema.json` | The JSON contract for the run trace (stages, gates, loops, final verdict, blocking gaps). The run-log you emit must conform. |
