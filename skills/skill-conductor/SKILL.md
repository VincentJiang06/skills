---
name: skill-conductor
description: >
  Drive a Claude Code skill through the full skill pipeline. Use when the
  user wants to build/test/compress a skill end to end, run guidance -> engineer
  -> zipper, or improve an idea/existing skill through all stages. Do NOT use for
  one stage only (call that stage), planning
  only (skill-guidance), compression only (skill-zipper), or blank
  scaffolding without a pipeline (skill-creator).
---

# skill-conductor

Run the three-stage skill pipeline **end to end** with bounded quality-gate
loops. If a gate fails, repeat or loop back to the owning stage; never pass a
failing artifact downstream.

This is a **thin orchestrator**: call the sibling stage skills, read their
artifacts, and execute gate checks. Do not reimplement guidance/engineer/zipper
logic here. It runs autonomously and writes the real deliverable:
`<target>/.skill-conductor/conductor-log.json`.

## The pipeline

```
idea / existing skill
  → Stage G  skill-guidance   → <target>/.skill-guidance/handoff-spec.json
  → Stage E  skill-engineer   → <target>/.skill-engineer/build-report.json
  → Stage Z  skill-zipper     → lossless restructure (in place)
  → FINAL    re-run skill-guidance on the BUILT skill  (guidance is the auditor)
```

Sibling skills (read them; do **not** duplicate them):
- `../skill-guidance/SKILL.md`
- `../skill-engineer/SKILL.md`
- `../skill-zipper/SKILL.md`

Backing KB: `../../develop-principle` (the `develop-principle/` library at the repo root).

## Steps

### Step 1 — Scope

Identify the target and one-sentence goal. For a blank idea, create a thin stub
`SKILL.md` so guidance has a target; for an existing skill/repo, use its path.
Open `<target>/.skill-conductor/conductor-log.json` immediately with `target`,
`goal`, empty `stages`, and `loops_taken: 0`.

### Step 2 — Stage G (Guidance)

Invoke **skill-guidance**. Gate with `rules/pipeline-loop.md`: the
handoff spec must parse, carry downstream fields, and record a readiness verdict.
Record every attempt in `stages[]`; repeat G only within the stated bound.

### Step 3 — Stage E (Engineer)

Invoke **skill-engineer** on the spec. Gate with `rules/pipeline-loop.md`:
verification ran, all required cases pass, every spec P0 is done, deterministic
skills expose an executable `harness_path` that you re-run, the red log contains
real `FAIL ` lines, and every spec adversarial edge has a passed
`tests.checklist_coverage` entry. Test failures repeat E; design-wrong failures
loop back to G and increment `loops_taken`.

### Step 4 — Stage Z (Zipper)

Invoke **skill-zipper** in Stage Z pipeline mode. Gate on its reported
lossless evidence (`0 LOST / 0 REWRITTEN`, or every such line explicitly
classified). Repeat Z or skip compression, but never ship a lossy restructure.

### Step 5 — Final Acceptance (the detection mechanism)

Load `rules/final-acceptance.md`. Re-run guidance on the built skill (the
re-audit GATE, criteria 1–3); **only if it passes**, invoke the **vince-attacker**
skill as the independent adversarial battery (criterion 4) — never burn the
attacker on a build that fails the re-audit. Record both verdicts. The effective
verdict is `min(re_audit_verdict, battery_verdict)` and may never exceed the
battery. Route gaps to G/E/Z by owner; after `MAX_FULL_LOOPS`, stop with honest
`stopped_unmet`.

## Loop discipline

Every loop must name the failed artifact field, respect MAX_G / MAX_E / MAX_Z /
MAX_FULL_LOOPS, and append a run-log entry. A failing artifact is never passed
downstream; a budget hit produces `stopped_unmet`, not a relaxed gate.

## Modules

| File | When to load |
|------|--------------|
| `rules/pipeline-loop.md` | Steps 2–4 — exact per-stage GATE definitions (how to read each artifact's pass/fail), the gap→stage loop-back rules, and the max-iteration bounds. |
| `rules/final-acceptance.md` | Step 5 — the final detection: re-audit with guidance, the pass criteria, gap→stage routing, the stop condition, and how to write the run-log. |

## Assets

| File | Usage |
|------|-------|
| `assets/conductor-log.schema.json` | The JSON contract for the run trace (stages, gates, loops, final verdict, blocking gaps). The run-log you emit must conform. |
