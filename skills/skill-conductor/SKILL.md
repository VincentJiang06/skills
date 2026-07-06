---
name: skill-conductor
description: >
  ORCHESTRATES the whole skill pipeline end to end (guidance to engineer to
  zipper) with gated loops. Use to take a skill from idea to shipped, or improve
  one through all stages: "$skill-conductor". It RUNS THE FULL LOOP, unlike the
  single stages. Not for one stage only or blank scaffolding (skill-creator).
license: MIT
metadata:
  version: "2.0.0"
---

# skill-conductor

Run the three-stage skill pipeline **end to end** with bounded quality-gate
loops. If a gate fails, repeat or loop back to the owning stage; never pass a
failing artifact downstream.

This is a **thin orchestrator**: it invokes the sibling stage skills, runs
**their shipped gate validators**, and records what happened. No stage logic
is reimplemented here — the gate the conductor runs is the same script each
stage self-gates with, so builder and gatekeeper cannot drift apart. It runs
autonomously and writes the real deliverable:
`<target>/.skill-conductor/conductor-log.json`.

## The pipeline

```
idea / existing skill
  → Stage G  skill-guidance   → .skill-guidance/handoff-spec.json   gate: validate_spec.mjs
  → Stage E  skill-engineer   → .skill-engineer/build-report.json   gate: validate_report.mjs
                                                                    (re-runs the harness)
  → Stage Z  skill-zipper     → lossless restructure, in place      gate: lossless evidence
  → FINAL    guidance re-audit (audit disposition) → attacker battery
```

**Siblings** sit beside this skill and installed names may carry a prefix
(repo `skill-guidance` = installed `vince-skill-guidance`): resolve a sibling
as the directory named `<name>` or ending in `-<name>`. Read their SKILL.mds;
do not duplicate them. Backing KB: `skill-principle`, embedded in the guidance
sibling.

## Steps

### Step 1 — Scope

Identify the target and a one-sentence goal. For a blank idea, create a thin
stub SKILL.md so guidance has a target. Open
`<target>/.skill-conductor/conductor-log.json` immediately with `target`,
`goal`, empty `stages`, `loops_taken: 0`. The log plus the stage artifacts on
disk are the run's durable state — after any context compaction, re-read them
rather than trusting memory.

### Step 2 — Stage G (Guidance)

Invoke **skill-guidance** (plan-pipeline disposition: it logs assumptions
instead of blocking on questions). Gate per `rules/pipeline-loop.md`:
`validate_spec.mjs <target>` must exit 0. Record every attempt in `stages[]`;
repeat G only within MAX_G.

### Step 3 — Stage E (Engineer)

Invoke **skill-engineer** on the spec. Gate:
`validate_report.mjs <target>` must exit 0 — it checks schema, all-green
totals, every spec P0 done, `checklist_coverage` of every adversarial edge,
and for script skills an **executable harness it re-runs itself** plus a
genuine red log. Not-green failures repeat E; design-wrong failures loop back
to G (budget-checked). Routing table: `rules/pipeline-loop.md`.

### Step 4 — Stage Z (Zipper)

Invoke **skill-zipper** in pipeline mode (Stage Z: conservative lossless
writes, no confirmation wait). Gate on its reported lossless evidence
(`0 LOST / 0 REWRITTEN`, or every such line explicitly classified). Repeat Z
or skip compression — never ship a lossy restructure. A noted skip does not
block `done`.

### Step 5 — Final acceptance (the detection mechanism)

Load `rules/final-acceptance.md`. Re-audit the built skill with guidance's
**audit disposition** (writes `post-build-audit.json`; gate it with
`validate_spec --audit`); **only if the re-audit passes**, invoke the
**attacker** sibling as the independent adversarial battery — never burn the
battery on a build that fails basic audit. `effective_verdict =
min(re_audit_verdict, battery_verdict)` and may never exceed the battery.
Route gaps to the owning stage; after MAX_FULL_LOOPS stop honestly with
`stopped_unmet`.

## Loop discipline

Every loop names the failed artifact field, respects the bounds table
(`rules/pipeline-loop.md` — the single source for MAX_G / MAX_E / MAX_Z /
MAX_FULL_LOOPS), and appends a run-log entry. A failing artifact is never
passed downstream; a budget hit produces `stopped_unmet`, not a relaxed gate.

## Execution notes

- If a stage's reasoning seems shallow, raise the session's **effort** level
  rather than adding prompt scaffolding — for Opus 4.8, xhigh is the
  recommended floor for agentic work.
- All gates are exit-code scripts; run them and read the code — never
  re-derive a gate by eye from prose.

## Modules

| File | When to load |
|------|--------------|
| `rules/pipeline-loop.md` | Steps 2–4 — how each gate runs (sibling validator scripts), fail→stage routing, and the max-iteration bounds. |
| `rules/final-acceptance.md` | Step 5 — audit-disposition re-audit, the attacker battery, verdict folding, stop condition, run-log writing. |

## Assets

`assets/conductor-log.schema.json` — the run-trace contract (stages, gates,
loops, quality verdicts, blocking gaps). The log you emit must conform.
