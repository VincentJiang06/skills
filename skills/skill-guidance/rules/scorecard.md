# Scorecard: the 7-pillar readiness rubric

Score the target against develop-principle's 7 pillars. For each pillar: pull the
canonical criteria from the KB (don't reason from memory), judge the target,
score it, cite evidence, list gaps.

Score per pillar: **2 = present**, **1 = partial**, **0 = absent**, or **N/A**
(legitimately out of scope — see altitude). In the JSON an N/A pillar is
`status: "na"`, `score: null`. The deterministic `scripts/score_skill.mjs` never
emits N/A — when you judge N/A, override the seed and justify it in `evidence`.
N/A pillars are dropped from the denominator, so a small lite skill is not
punished for lacking lifecycle ops.

```
readiness = sum(scores of non-N/A pillars) / (2 * count of non-N/A pillars)
verdict:  >= 0.85 industrial  |  0.55–0.84 candidate  |  < 0.55 draft
```
A pillar that is **required at the chosen altitude** (see the required-pillars
table in `rules/altitude.md`) but scores 0 caps the verdict at `draft` regardless
of the ratio — record it as a P0 gap. A required pillar scoring **1 (partial)**
does **not** cap — it produces a P1 action.

## The pillars

For each, the KB query gives the authoritative checklist; judge against it.

| Pillar | KB query (`query_kb.mjs "<q>" --broad`) | Present (2) means | Common gaps |
|---|---|---|---|
| `design` | `skill 设计 触发 执行协议 边界` | Testable trigger with positive/negative/**adjacent** examples; protocol is a runbook (preflight→steps→verify→report); controls externalized, not prose. | Trigger only abstract; no adjacent/negative cases; control flow lives in the prompt (`anti_pattern.prompted_architecture`). |
| `research` | `资料搜集 证据 来源 可溯源 广度 深度` | Fact-dependent claims have an evidence base: source roster, breadth/depth search plan, claim→evidence map. | No source traceability; facts asserted without citation. **N/A** if the skill makes no external factual claims (pure mechanical transform). |
| `testing` | `skill 测试 轨迹 回归 金字塔` | Layered tests; trajectory (tool-call/state) checks, not just final text; a regression suite for failures + adjacent false-triggers. | Only happy-path; output-text-only checks; no regression assets. |
| `tdd` | `TDD eval case 红绿重构 契约 变异` | Failing eval cases written before behavior; contract/metamorphic/mutation techniques where the oracle is fuzzy. | Tests added after the fact (or never); no contract on I/O and tool args. |
| `metrics` | `量化 指标 成功率 触发准确率 成本 pass` | Defined success rate, activation precision, cost-per-success, and (where stochastic) pass^k. | No measurable success definition; cost/activation never tracked. **N/A** rarely — most skills can define success. |
| `low_context_kb` | `低上下文 渐进披露 短入口 模块 加载` | Short SKILL.md (<500 lines), progressive disclosure into `rules/`/`references/`, on-demand loading with clear pointers (a combined Modules/Scripts table counts). | Everything stuffed in SKILL.md; no module split; always-loaded bloat. |
| `lifecycle` | `生命周期 发布门 版本 回滚 弃用 观测` | Versioning, a release gate, rollback path, deprecation/migration plan, observability hooks. | No version/changelog; no rollback; ship-and-forget. **N/A / lite** for throwaway or personal one-off skills. |

For the **`metrics`** pillar, triggering accuracy is measured empirically by
`skill-engineer`'s `scripts/trigger_eval.mjs` (labeled prompts → precision/recall).
Credit `metrics` for triggering only when the target ships (or the spec requires the
engineer to build) a labeled `cases.json` + a `--judge cli` run — not a bare asserted number.

## How to judge

1. Run `query_kb "<q>" --json` for the pillar — the human-readable output prints
   only IDs and scores; **`--json` includes each match's `summary_zh/_en`**. Then
   open the top-ranked `[doc]` match and skim it: that doc is the canonical bar.
2. Compare the target's SKILL.md + dirs (use the `scripts/score_skill.mjs`
   `pillar_hints` as a starting seed, then verify by reading). The hints are
   file-presence heuristics — trust them loosely. For `tdd` especially, an
   `evals/` dir does NOT prove tests-first: require a `.skill-engineer/red/red.log`
   with **≥1 real `FAIL ` line** (assertion-level red against an importable stub).
   A module-not-found / bare `EXIT:1` / prose red log scores `tdd: partial` at
   most — it proves the file was absent, not that assertions came first.
   A `low_context_kb` `partial` seed may also be vacuous (thin because *empty*,
   not because well-factored) — confirm the thinness is architectural.
3. Write `status`, `score`, one line of `evidence` (quote/point at the target),
   and concrete `gaps` (each gap should become a prioritized action in Step 6).

Be specific: "no adjacent false-trigger examples in the description" beats "design
could be better." Every gap must be actionable by `skill-engineer`.
