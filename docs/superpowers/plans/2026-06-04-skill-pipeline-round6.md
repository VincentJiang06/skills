# Vince Skill Pipeline Round 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four-skill pipeline (`skill-guidance`, `skill-engineer`, `skill-conductor`, `skill-zipper`) harder to self-certify and lighter at the always-loaded entry layer.

**Architecture:** Add one deterministic Round 6 harness that checks the structural guarantees learned from the prior e2e rounds, then make small rule/schema/SKILL.md edits until the harness passes. Keep heavyweight explanation in on-demand rules; SKILL.md entries should point to rules rather than restating them.

**Tech Stack:** Markdown skills, JSON schemas, Node.js stdlib harness, existing `skill-zipper/scripts/measure_tokens.py`.

---

### Task 1: Round 6 Regression Harness

**Files:**
- Create: `skill-conductor/evals/round6_pipeline_checks.mjs`

- [ ] **Step 1: Write the failing checks**

The harness checks current Round 5 regressions:
- `build-report.schema.json` must require `tests.checklist_coverage`.
- `conductor-log.schema.json` must require `quality`.
- `pipeline-loop.md` must say the E gate passes when all five criteria hold.
- `conductor` SKILL.md Step 3 must mention executable harness and checklist coverage.
- `zipper` SKILL.md must define pipeline mode for `skill-conductor`.
- Frontmatter entry tokens must stay under explicit per-skill budgets.

- [ ] **Step 2: Run the harness and confirm RED**

Run: `node skill-conductor/evals/round6_pipeline_checks.mjs`

Expected: FAIL lines for the unfixed Round 6 assertions.

### Task 2: Schema And Gate Fixes

**Files:**
- Modify: `skill-engineer/assets/build-report.schema.json`
- Modify: `skill-conductor/assets/conductor-log.schema.json`
- Modify: `skill-conductor/rules/pipeline-loop.md`
- Modify: `skill-conductor/rules/final-acceptance.md`

- [ ] **Step 1: Make schemas enforce the fields the prose gates already require**

Require `tests.checklist_coverage` in build reports and `quality` in conductor logs.

- [ ] **Step 2: Align gate prose with the actual criteria**

Change stale "all three" wording to "all five"; keep detailed criteria in `pipeline-loop.md`, not duplicated in `SKILL.md`.

- [ ] **Step 3: Run Round 6 harness**

Run: `node skill-conductor/evals/round6_pipeline_checks.mjs`

Expected: schema/gate wording checks pass.

### Task 3: Pipeline-Aware Zipper Mode

**Files:**
- Modify: `chore-develop-skill-zipper/skill-zipper/SKILL.md`
- Optionally modify: `chore-develop-skill-zipper/skill-zipper/rules/write-procedure.md`

- [ ] **Step 1: Resolve conductor-vs-zipper approval conflict**

Add a short pipeline-mode rule: direct user invocations still require plan + explicit "go"; Stage Z invocations from `skill-conductor` may proceed under the original end-to-end approval, but must use conservative lossless writes and report token/lossless evidence.

- [ ] **Step 2: Run Round 6 harness**

Run: `node skill-conductor/evals/round6_pipeline_checks.mjs`

Expected: zipper pipeline-mode check passes.

### Task 4: Entry Token Reduction

**Files:**
- Modify: `skill-guidance/SKILL.md`
- Modify: `skill-engineer/SKILL.md`
- Modify: `skill-conductor/SKILL.md`
- Modify: `chore-develop-skill-zipper/skill-zipper/SKILL.md`

- [ ] **Step 1: Reduce frontmatter and repeated prose**

Shorten descriptions and remove duplicate details already present in rules. Preserve trigger specificity and negative triggers.

- [ ] **Step 2: Measure tokens**

Run: `for d in chore-develop-skill-zipper/skill-zipper skill-guidance skill-engineer skill-conductor; do python3 chore-develop-skill-zipper/skill-zipper/scripts/measure_tokens.py "$d" --json; done`

Expected: each always-loaded token count is under its Round 6 budget.

### Task 5: Verification And Review

**Files:**
- No production edits unless failures reveal a concrete gap.

- [ ] **Step 1: Run deterministic verification**

Run:
```bash
node skill-conductor/evals/round6_pipeline_checks.mjs
node -e "for (const f of ['skill-guidance/evals/evals.json','skill-engineer/evals/evals.json','chore-develop-skill-zipper/skill-zipper/evals/evals.json','skill-guidance/assets/handoff-spec.schema.json','skill-engineer/assets/build-report.schema.json','skill-conductor/assets/conductor-log.schema.json']) { JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('parse ok', f); }"
```

Expected: all checks pass.

- [ ] **Step 2: Compare against subagent audits**

Incorporate any high-signal findings from the five read-only subagents. Defer only items that require live Claude e2e and record that residual risk clearly.
