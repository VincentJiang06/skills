---
name: skill-guidance
description: >
  AUDITS a skill/repo and SPECS the build, emitting skill-engineer's handoff
  spec (stage 1). Use when asked if a skill is good/industrial-grade,
  needs scoring/scope/missing-pieces, or pointed at a SKILL.md before build:
  "$skill-guidance". It PLANS only; not build (engineer), compress (zipper), or
  full loop (conductor).
---

# skill-guidance

Apply industrial skill-design principles to a **target skill** and emit a
**machine-handoff spec** that the next stage (`skill-engineer`) builds
from. This skill **plans and evaluates — it does not build**.

The deliverable is a structured spec file. But a spec is only as good as its
context, so this skill is **not** silently autonomous: it runs a
**context-sufficiency gate** (Step 6, `rules/elicitation.md`) and **asks** when
the input leaves a decision-critical gap — *minimize but never suppress*. Never
bury a guess in `blocking_unknowns` (this skill's #1 failure): ask a present
human, or in a pipeline run log an explicit assumption — never block.

## Backing knowledge base

Ground every judgment in the local **develop-principle** KB (default
`../../develop-principle`, at the repo root) — not memory:

```bash
node <kb>/tools/query_kb.mjs "<topic>" --broad         # principles, templates, checklists
node <kb>/tools/fetch_skill_reference.mjs --list        # public skills to compare against
node <kb>/tools/fetch_skill_reference.mjs <repo.id> <skill-path> --out /tmp/sg-ref
```

The scorecard scores the target against the **7 pillars**: `design`, `research`
(资料搜集), `testing`, `tdd`, `metrics`, `low_context_kb`, `lifecycle`.

## Steps

### Step 1 — Resolve and read the target

Accept a **SKILL.md path** or a **repo path** (both supported; a "blank idea"
arrives as a thin/stub SKILL.md — that is normal input, not an error). If a repo,
find its `SKILL.md` (and note sibling `rules/ scripts/ references/ assets/
evals/`).

**Multiple `SKILL.md`s**: pick the one whose parent dir best matches the
repo/worktree name; treat fixture dirs (`dogfood-*`, `fixtures/`, `test-*`,
`examples/`) as input data, not targets; if still ambiguous, evaluate the
highest-content one and note the rest in `blocking_unknowns`. Record your choice.

Run the deterministic signal pass:

```bash
node scripts/score_skill.mjs <skill-dir | SKILL.md path>
```

Capture its JSON: `maturity_hint`, `dirs`, `signals`, `pillar_hints`. These are
**evidence seeds**, not verdicts — you refine them.

**If `score_skill.mjs` exits non-zero (no `SKILL.md`), stop**: refuse ("no
SKILL.md found at `<path>`"), write no spec, suggest `skill-creator`. Don't proceed.

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

Load `rules/comparables.md`. Pick 1–2 comparable real skills, fetch them, and
extract transferable structure (triggers, modules, tests) — the "资料搜集" step.
Light at lite altitude, fuller at full. Learn patterns; never copy.

### Step 5 — Decide altitude

Load `rules/altitude.md`. Choose `lite` vs `full` from stakes × maturity ×
surface area. Industrial ≠ always-heavy — it means *right rigor for the stakes*;
don't force a small utility through full research + metrics + lifecycle ceremony.

### Step 6 — Context-sufficiency gate (elicit before emit)

Load `rules/elicitation.md`. Run `node scripts/detect_context_gaps.mjs <target>`;
for each missing slot write **one** targeted, domain-specific question to
`<target>/.skill-guidance/clarifying-questions.json` (ask a present human via
`AskUserQuestion`; in a pipeline run, log an explicit assumption per gap). If the
detector says `sufficient:true`, do **not** manufacture questions. Never dump gaps
into `blocking_unknowns`. This gate makes the spec concrete enough to build/test.

### Step 7 — Emit the machine-handoff spec

Load `rules/spec-format.md` and the contract `assets/handoff-spec.schema.json`.
Write the filled spec to `<skill-dir>/.skill-guidance/handoff-spec.json` (create
the dir; it sits beside the target, not inside this skill). It captures intent,
the scorecard, gaps, a recommended design across all 8 design units, the altitude
call, prioritized actions, and `handoff.next_skill = "skill-engineer"`.
The spec is the real output; optionally print a 3-line summary (verdict+ratio,
top 1–2 `P0` actions, `blocking_unknowns` count).

## Modules

| File | When to load |
|------|--------------|
| `rules/intent-and-maturity.md` | Step 2 — how to read intent and classify stub/draft/mature, and how maturity maps to altitude. |
| `rules/elicitation.md` | Step 6 — the context-sufficiency gate: detect gaps, phrase one targeted question per missing slot, ask (standalone) vs log-assumption (pipeline), never dump into `blocking_unknowns`. |
| `rules/scorecard.md` | Step 3 — the 7-pillar rubric, the KB query per pillar, and present/partial/absent definitions. |
| `rules/comparables.md` | Step 4 — how to pick, fetch, and mine comparable skills from the registry; when to skip at lite altitude. |
| `rules/altitude.md` | Step 5 — the lite-vs-full decision and what each altitude includes/skips. |
| `rules/spec-format.md` | Step 6 — field-by-field meaning of the handoff spec and how to fill it. |

## Scripts

| File | Usage |
|------|-------|
| `scripts/score_skill.mjs` | `node scripts/score_skill.mjs <skill-dir \| SKILL.md>` — deterministic structural signals (frontmatter, dirs, size, per-pillar hints, maturity). Seeds the scorecard. |
| `scripts/detect_context_gaps.mjs` | `node scripts/detect_context_gaps.mjs <target \| --idea "...">` — flags decision-critical slots the input leaves open (the elicitation trigger seed). `--selftest` proves it discriminates. |

## Assets

| File | Usage |
|------|-------|
| `assets/handoff-spec.schema.json` | The JSON contract for the spec `skill-engineer` consumes. The spec you emit must conform. |
| `assets/handoff-spec.example.json` | A filled example to copy the shape from. |
