---
name: skill-guidance
description: >
  AUDITS a skill/repo and SPECS the build, emitting skill-engineer's handoff
  spec (stage 1). Use when asked if a skill is good/industrial-grade,
  needs scoring/scope/missing-pieces, or pointed at a SKILL.md before build:
  "$skill-guidance". It PLANS only; not build (engineer), compress (zipper), or
  full loop (conductor).
license: MIT
metadata:
  version: "2.0.1"
---

# skill-guidance

Apply industrial skill-design principles to a **target skill** and emit a
**machine-handoff spec** that `skill-engineer` builds from. This skill plans
and evaluates — it never builds.

Eliciting is part of the job: the engineer inherits every gap you leave.
*Minimize but never suppress* questions — a silent guess ships a wrong design,
and a gap dumped into `blocking_unknowns` stalls the engineer instead of
informing it.

## Step 0 — Disposition (how you were invoked)

| Invocation | Disposition | What changes |
|---|---|---|
| A human asked directly | **plan-interactive** | Step 6 may ask via `AskUserQuestion`. |
| Conductor pipeline, pre-build | **plan-pipeline** | Never block: Step 6 logs one explicit assumption per gap. |
| Final acceptance / "audit the built skill" | **audit** | Skip Step 6 (gaps → scorecard + actions, not questions). Write to `post-build-audit.json` so the original spec survives. |

Unsure between the plan modes → prefer asking.

## Backing knowledge base

Ground every pillar judgment in the embedded **skill-principle** KB
(`skill-principle/` here), not memory — the criteria live and evolve there.
Load `rules/kb-grounding.md` for query commands and the 7 pillars (`design`,
`research`, `testing`, `tdd`, `metrics`, `low_context_kb`, `lifecycle`).

## Steps

### Step 1 — Resolve and read the target

Accept a **SKILL.md path** or **repo path**. A thin stub (a "blank idea" as a
SKILL.md) is normal input. If a repo: find its SKILL.md; among multiple
candidates pick the one whose parent dir best matches the repo name, treat
fixture dirs (`dogfood-*`, `fixtures/`, `test-*`, `examples/`) as input data,
record the choice.

Seed the scorecard with the deterministic signal pass (evidence, not verdicts):

```bash
node scripts/score_skill.mjs <skill-dir | SKILL.md>
```

**No SKILL.md at all → stop**: refuse with the path, write no spec, suggest
`skill-creator`. (A stub passes this bar; a missing file does not.)

### Step 2 — Detect intent and maturity

Load `rules/intent-and-maturity.md`. State what the skill is *for*, in/out of
scope, primary user, observed triggers; settle `stub | draft | mature`.

### Step 3 — Score the 7-pillar scorecard

Load `rules/scorecard.md`. Per pillar: pull the KB criteria, judge
`present | partial | absent` (2/1/0) or N/A, cite evidence, list gaps concrete
enough to build from.

### Step 4 — Decide altitude

Load `rules/altitude.md`. `lite` vs `full` from stakes × maturity × surface.
Industrial = right rigor for the stakes; a wrong call here cascades — and it
sizes the next step.

### Step 5 — Comparable research (资料搜集)

Load `rules/comparables.md`. Mine 1–2 comparable real skills for transferable
*structure*, never content. Light or skipped at lite altitude.

### Step 6 — Context-sufficiency gate (plan dispositions only)

Load `rules/elicitation.md`. Run
`node scripts/detect_context_gaps.mjs <target | --idea "...">`; write **one**
targeted, domain-specific question per missing slot to
`<target>/.skill-guidance/clarifying-questions.json`; ask (interactive) or log
assumptions (pipeline). The detector is a seed, not the verdict — but
`sufficient:true` means don't manufacture questions.

### Step 7 — Emit and validate the spec

Load `rules/spec-format.md` (contract: `assets/handoff-spec.schema.json`).
Write to `<target>/.skill-guidance/handoff-spec.json` (audit:
`post-build-audit.json`), then gate your own output — exit 0 required:

```bash
node scripts/validate_spec.mjs <target-dir>    # --audit in audit runs
```

It enforces schema + consistency (7 pillars, score↔status, verdict vs ratio +
required-pillar cap, checklist format, gap→action mapping), so a spec that
would fail the conductor's G gate never leaves this stage.

## Sibling naming

Installed copies may carry a name prefix (repo `skill-engineer` = installed
`vince-skill-engineer`). Resolve a sibling as: the directory beside this skill
named `<name>` or ending in `-<name>`.

## Modules

| File | When to load |
|------|--------------|
| `rules/kb-grounding.md` | Before Step 1 — KB queries + pillar coverage. |
| `rules/intent-and-maturity.md` | Step 2. |
| `rules/scorecard.md` | Step 3 — rubric + judging rules. |
| `rules/altitude.md` | Step 4 — incl. the required-pillars table. |
| `rules/comparables.md` | Step 5. |
| `rules/elicitation.md` | Step 6 — gaps, questions, per-disposition handling. |
| `rules/spec-format.md` | Step 7 — every spec field + quality bar. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/score_skill.mjs` | structural signals seed: `node scripts/score_skill.mjs <dir\|SKILL.md>` |
| `scripts/detect_context_gaps.mjs` | decision-critical slot detector; `--selftest` |
| `scripts/validate_spec.mjs` | executable spec gate (schema + consistency); `--audit`, `--selftest`. The conductor reuses it as Stage G's gate. |

## Assets

`assets/handoff-spec.schema.json` — the spec contract ·
`assets/handoff-spec.example.json` — a filled, validate_spec-green example.
