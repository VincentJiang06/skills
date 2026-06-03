---
name: vince-skill-guidance
description: >
  Evaluate a Claude Code skill against industrial design principles and emit a
  machine-handoff spec for the build stage. Use this whenever the user points at
  a skill or repo and asks "is this skill good / industrial-grade?", "evaluate
  or audit this skill's design", "what's missing in this skill", "score this
  SKILL.md", "plan/scope this skill before building", or hands you a SKILL.md or
  repo path and wants a readiness assessment plus a design plan — even if they
  don't say the word "evaluate". Stage 1 of the pipeline
  (vince-skill-guidance -> vince-skill-engineer -> vince-skill-zipper): it
  plans and evaluates and produces a spec; it does NOT build or compress.
  Do NOT use for: scaffolding a skill's files from a blank prompt (use
  skill-creator); actually implementing, wiring, or testing the skill (use
  vince-skill-engineer); or shortening an existing skill for token efficiency
  (use vince-skill-zipper).
---

# vince-skill-guidance

Apply industrial skill-design principles to a **target skill** and emit a
**machine-handoff spec** that the next stage (`vince-skill-engineer`) builds
from. This skill **plans and evaluates — it does not build**.

It runs **autonomously**: there is no human-in-the-loop confirmation step. The
deliverable is a structured spec file, not a conversation. Be decisive; record
uncertainty in the spec's `blocking_unknowns` rather than stopping to ask.

## Backing knowledge base

Every judgment here is grounded in the local **develop-principle** KB — the
principle substrate this skill stands on. Locate it as the `develop-principle/`
sibling library in the workspace (default `../develop-principle` relative to
this skill). Use it instead of reasoning from memory:

```bash
node <kb>/tools/query_kb.mjs "<topic>" --broad        # principles, templates, checklists, metrics
node <kb>/tools/fetch_skill_reference.mjs --list       # popular public skills to compare against
node <kb>/tools/fetch_skill_reference.mjs <repo.id> <skill-path> --out /tmp/sg-ref
```

The readiness scorecard scores the target against develop-principle's **7
pillars**: `design`, `research` (资料搜集), `testing`, `tdd`, `metrics`,
`low_context_kb`, `lifecycle`.

## Steps

### Step 1 — Resolve and read the target

Accept a **SKILL.md path** or a **repo path** (both supported; a "blank idea"
arrives as a thin/stub SKILL.md — that is normal input, not an error). If a repo,
find its `SKILL.md` (and note sibling `rules/ scripts/ references/ assets/
evals/`). Run the deterministic signal pass:

```bash
node scripts/score_skill.mjs <skill-dir | SKILL.md path>
```

Capture its JSON: `maturity_hint`, `dirs`, `signals`, `pillar_hints`. These are
**evidence seeds**, not verdicts — you refine them.

### Step 2 — Detect intent and maturity

Load `rules/intent-and-maturity.md`. From the frontmatter + body, state what the
skill is *for*, its in/out-of-scope, primary user, and observed triggers. Settle
**maturity** (`stub | draft | mature`) — it drives altitude in Step 5.

### Step 3 — Score the 7-pillar readiness scorecard

Load `rules/scorecard.md`. For each pillar, pull the canonical criteria from the
KB (`query_kb`), judge `present | partial | absent` (0/1/2), cite evidence from
the target, and list concrete gaps. Sum to an overall readiness (x/14) and a
verdict (`draft | candidate | industrial`).

### Step 4 — Light comparable-design research

Load `rules/comparables.md`. Pick 1–2 comparable real skills from the registry,
fetch them, and extract transferable structure (how *they* handle triggers,
modules, tests). This is the "资料搜集" step — keep it **light** at lite
altitude, fuller at full. Learn patterns; never copy.

### Step 5 — Decide altitude

Load `rules/altitude.md`. Choose `lite` vs `full` from stakes × maturity ×
surface area. Industrial ≠ always-heavy; it means *right rigor for the stakes*.
A 30-line utility skill should not be forced through full research + metrics +
lifecycle ceremony.

### Step 6 — Emit the machine-handoff spec

Load `rules/spec-format.md` and the contract `assets/handoff-spec.schema.json`.
Write the filled spec to `<skill-dir>/.skill-guidance/handoff-spec.json` (create
the dir; it sits beside the target, not inside this skill). It captures intent,
the scorecard, gaps, a recommended design across all 8 design units, the altitude
call, prioritized actions, and `handoff.next_skill = "vince-skill-engineer"`.
The spec file is the real output. For a human-facing invocation, also print a
**3-line** summary to stdout: (1) `verdict + ratio`, (2) the top 1–2 `P0`
actions, (3) the count of `blocking_unknowns`. In a fully autonomous pipeline run
(the default), this print is optional — the spec stands alone.

## Modules

| File | When to load |
|------|--------------|
| `rules/intent-and-maturity.md` | Step 2 — how to read intent and classify stub/draft/mature, and how maturity maps to altitude. |
| `rules/scorecard.md` | Step 3 — the 7-pillar rubric, the KB query per pillar, and present/partial/absent definitions. |
| `rules/comparables.md` | Step 4 — how to pick, fetch, and mine comparable skills from the registry; when to skip at lite altitude. |
| `rules/altitude.md` | Step 5 — the lite-vs-full decision and what each altitude includes/skips. |
| `rules/spec-format.md` | Step 6 — field-by-field meaning of the handoff spec and how to fill it. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/score_skill.mjs` | `node scripts/score_skill.mjs <skill-dir \| SKILL.md>` — deterministic structural signals (frontmatter, dirs, size, per-pillar hints, maturity). Seeds the scorecard. |

## Assets

| File | Usage |
|------|-------|
| `assets/handoff-spec.schema.json` | The JSON contract for the spec `vince-skill-engineer` consumes. The spec you emit must conform. |
| `assets/handoff-spec.example.json` | A filled example to copy the shape from. |
