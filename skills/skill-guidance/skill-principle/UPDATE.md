# KB 更新运行手册 / KB Update Runbook

machine_summary_zh: 常驻更新手册：按阶段（基线门禁→研究扫描→分诊→折入 KB→传播到四个 pipeline skill→记录）刷新 skill-principle；含承重数字的 Fact Registry 与业主质量杆（无 URL+日期不入库、schema 合法≠内容为真、收紧凭证据、放松需事故级证据）。

machine_summary_en: Standing refresh runbook: phase-gated KB updates (baseline gates, research sweep, triage, fold-in, propagation to the four pipeline skills, recording), with a Fact Registry of load-bearing numbers and the owner's quality bar (no URL+date no entry; schema-valid is not true; tighten with evidence, relax only on incident-grade evidence).

reference_ids: `ref.agentskills.open_standard`, `ref.anthropic.skill_authoring_best_practices`, `ref.claude_code.skills_docs`, `ref.anthropic.equipping_agents_skills`

node_ids: `procedure.evidence_gated_update`, `pillar.lifecycle`

Audience: **the agent** (daily driver: Claude Opus 4.8 in Claude Code) asked to
"update the principles" / "按 UPDATE.md 更新 principle" / "run a KB refresh
pass". This file is the whole procedure — follow it phase by phase. It was
authored 2026-07-02 (Fable 5) and encodes the quality bar the owner expects;
change the bar only with the owner.

The KB this governs: `skill-principle/` (embedded in the `skill-guidance`
skill). The pipeline it grounds: the four sibling skills `skill-guidance`,
`skill-engineer`, `skill-zipper`, `skill-conductor` (installed names may carry
a prefix, e.g. `vince-skill-guidance`). A sister KB `loop-principle` (embedded
in `loop-constructor`) has its own thin UPDATE.md that reuses this procedure.

---

## When to run a pass

- The owner asks for one.
- A new Claude model / Claude Code release lands (model behavior and skill
  mechanics are the two fastest-rotting fact classes here).
- A pipeline defect is traced to stale knowledge.
- Otherwise: monthly is plenty. Do NOT run one "to feel current" — a pass with
  no confirmed findings should end as an explicit no-op (Phase 5 still records
  it).

## Phase 0 — Baseline (before touching anything)

```bash
cd <skill-guidance>/skill-principle && node tools/run_all_checks.mjs   # must be GREEN
cd <repo>/skills
node skill-guidance/evals/run_all.mjs
node skill-engineer/evals/run_all.mjs
node skill-zipper/evals/run_all.mjs
node skill-conductor/evals/round6_pipeline_checks.mjs
git status --short && git log --oneline -1                             # snapshot the base
```

All green before you start, or you cannot attribute a later red to your edits.
(`run_all_checks.mjs` must be run from the KB directory — it resolves tools
relative to CWD.)

## Phase 1 — Research sweep

Spawn parallel research subagents (opus, effort **xhigh**, web access), one per
source family, each returning findings as: **topic — what changed — implication
for KB/pipeline — (date, URL, confidence: confirmed/likely/rumor)**. Restrict
"new" to the window since the last pass (`reports/update-log.md`).

| Family | Primary sources |
|---|---|
| Spec & format | agentskills.io/specification (the open standard); code.claude.com/docs/en/skills (Claude Code superset: frontmatter fields, listing budget, compaction lifecycle) |
| Official authoring & evals | platform.claude.com …/agent-skills/best-practices; anthropics/skills repo; skill-creator plugin (claude-plugins-official) — its benchmark/blind-A/B/description-tuning loop |
| Claude Code & SDK | code.claude.com changelog; claude-agent-sdk-python + -typescript CHANGELOGs (skills options, deprecations) |
| Model behavior | anthropic.com/news + platform migration guides + system cards (instruction-following, effort semantics, compaction, known quirks) |
| Community practice | obra/superpowers RELEASE-NOTES; vercel-labs/skills; Simon Willison; HN/engineering blogs with concrete do/do-nots |
| Eval methodology | arxiv (LLM-judge hardening, skill benchmarks); MLflow-style trace-based judging posts |
| Security | Snyk & marketplace-security write-ups (declare-vs-behavior, injection patterns) |

Method rules: primary sources first; every finding needs a date + URL;
"announced" ≠ "shipped"; if a sub-question is unanswerable, say so instead of
padding.

## Phase 2 — Triage each finding

| Class | Test | Action |
|---|---|---|
| **Load-bearing number changed** (a limit, a budget, a threshold) | It appears in the Fact Registry below | Update EVERY listed location + the enforcing script/test in one change |
| **New/changed practice** (authoring, eval, security) | Would change what the pipeline recommends or gates | KB: add/update a reference (with tier) + node/edge; pipeline: fold into the owning rules file, rule-then-rationale style |
| **New tool/runtime/API** | Affects compatibility or the comparables registry | reference entry; `references/skill_repos.registry.json` if it's a learnable repo |
| **Contradicts the KB** | A KB claim is now wrong | Fix the claim; if it changes a design decision, add `decisions/` record |
| **Fashion** | No mechanism, no evidence, or pure vibes | Drop it (note in the pass log why, one line) |

## Fact Registry — the numbers that rot, and every place each lives

When one of these changes upstream, update **all** its locations in the same
commit; a grep for the old value must come back empty afterwards.

| Fact (as of 2026-07-02) | Locations |
|---|---|
| description limits: portable **1,024** chars; CC listing **1,536** (desc+when_to_use); our target **≤320** | `skill-zipper/rules/description-quality.md`; `skill-zipper/rules/portability-checklist.md`; `skill-zipper/scripts/measure_tokens.py` (`DESC_HARD_LIMIT`, `DESC_TARGET`); `skill-engineer/rules/build-design-units.md` |
| skill-listing shared budget ≈ **1%** of context window | `skill-zipper/rules/description-quality.md`; `skill-zipper/rules/portability-checklist.md` |
| compaction re-attach: first **5k** tokens/skill, **25k** combined | `skill-zipper/rules/progressive-disclosure-model.md` |
| SKILL.md bands: healthy <**1,500** tok, BAD >**3,000**; body <**500** lines | `skill-zipper/scripts/measure_tokens.py`; `skill-zipper/rules/diagnosis-rubric.md`; `skill-engineer/rules/build-design-units.md`; per-skill budgets in `skill-conductor/evals/round6_pipeline_checks.mjs` |
| name rules: ≤**64** chars, dir==name, no "anthropic"/"claude"/XML | `skill-zipper/rules/portability-checklist.md`; `skill-zipper/rules/description-quality.md`; `skill-engineer/rules/build-design-units.md` |
| trigger tuning loop: ~**20** queries, **60/40** train/holdout, **3** runs, ≤**5** iterations | `skill-engineer/rules/trigger-eval.md`; `skill-zipper/rules/description-quality.md` |
| judge style bias **73–97%**; CoT safest; swap risky on adversarial | `skill-engineer/rules/run-evals.md`; `skill-conductor/rules/final-acceptance.md` |
| security stats (Snyk ToxicSkills **36.8%/13.4%**) | `skill-engineer/rules/verification-harness.md` |
| required-pillars-by-altitude table | `skill-guidance/rules/altitude.md` **and** `skill-guidance/scripts/validate_spec.mjs` (`REQUIRED_AT`) — guidance's run_all asserts they agree |
| reasoning-brevity-caps harm (~3%, Apr 2026 postmortem) | `skill-zipper/rules/diagnosis-rubric.md`; `skill-zipper/rules/hardening-patterns.md` (H11 context) |

## Phase 3 — Fold into the KB

- References: `references/*.references.json` with a `tier` (1 method-core …
  4 watchlist). Nodes/edges: `knowledge_graph/` per `schemas/node.schema.json`
  — keep nodes short, link via ids. Long-form: `docs/<pillar>/`.
- **Never hand-edit generated files** (`indexes/*`, `reports/kb_quality_report.json`);
  regenerate:

```bash
cd skill-principle
node tools/build_indexes.mjs && node tools/generate_quality_report.mjs
node tools/run_all_checks.mjs        # must return to GREEN
```

## Phase 4 — Propagate to the four skills

- Edit skill text with the **zipper discipline** (lossless: content moves or
  is classified, never silently vanishes) and the **rule-then-rationale**
  style (H11): state the rule, then the failure it prevents.
- New numbers → Fact Registry locations, all of them.
- Then the full gate set again (the Phase 0 command block) **plus**
  `python3 skill-zipper/scripts/measure_tokens.py skills/<each>` — no BAD
  flags; budget changes in round6 are deliberate, never a side effect.
- If a description changed: prove it with
  `skill-engineer/scripts/trigger_eval.mjs --judge cli --runs 3` on a labeled
  set with holdout cases — select by the **holdout** score, and don't ship a
  description churn without a holdout win.

## Phase 5 — Record

- Append to `reports/update-log.md`: date, window covered, findings folded /
  dropped (one line each with URL), gates re-run, files touched.
- A changed bar/decision → `decisions/` record (what changed, why, evidence).
- Bump the touched skills' `CHANGELOG.md` + frontmatter `metadata.version`
  (docs-only = patch; gate/contract change = minor; artifact-shape break =
  major — then also re-check `assets/*.schema.json` consumers).
- Suggest one line for the assistant's memory if the owner's workflow changes.

## Quality bar (the owner's standing guidance — do not dilute)

1. **No URL + date, no entry.** A claim that can't be traced does not enter
   the KB, however plausible.
2. **Primary over secondary**: docs/changelogs/repos over blog posts; blog
   posts land at tier 2–3 with the primary chased down when load-bearing.
3. **Schema-valid ≠ true.** Machine-validate shape AND check substance — this
   pipeline once received a schema-perfect research report whose content was
   the string "test". Content gates (minLength, expected structure, spot
   verification) are part of validation.
4. **Verify numbers on edit day.** Any Fact Registry number you touch, you
   re-confirm at its primary source that day — not from memory, not from a
   two-month-old note.
5. **Small diffs, one concern per change**, gates green between changes.
6. **Tighten gates with evidence; relax them only with April-postmortem-class
   evidence** (a measured regression attributable to the gate).
7. **Don't churn shipped descriptions** without a holdout-verified triggering
   win — description edits are cheap to make and expensive to get wrong.
8. New prose is **vendor-neutral** ("the agent", not a model name) unless the
   fact is genuinely runtime-specific — the format is an open standard now.
9. When the models improve, **delete scaffolding that babysits** (progress
   nudges, verbosity pleas, redundant re-explanations) and **keep gates that
   bite** (exit-code checks, coverage joins, adversarial batteries). Never
   confuse the two: the first compensates for model weakness, the second for
   model overconfidence — only the first rots as models improve.

## Failure modes to avoid (observed, not hypothetical)

- Updating a limit in one file and missing its twin (why the Fact Registry
  exists — grep for the old value before finishing).
- "Improving" an example without re-running its validator (the shipped
  handoff-spec example violated the cap rule for weeks while the rule lived
  only in prose).
- Letting a subagent's polished summary stand in for verification (re-run the
  gates yourself; trust exit codes, not prose).
- Recording "green" from a stale run after further edits — the LAST action
  before Phase 5 is the full gate block.
