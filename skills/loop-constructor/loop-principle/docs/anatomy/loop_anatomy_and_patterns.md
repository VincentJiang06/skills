# Loop Anatomy & Patterns / 循环解剖与模式

machine_summary_zh: 标准循环 Intent→Plan→Context→Act→Observe→Adjust→Stop 对应 Anthropic 四阶段 Explore→Plan→Implement→Commit；分离规划与执行以防解决错误问题。五种模式：retry、plan-execute-verify、explore-narrow（调试）、review（maker/checker）、human-in-the-loop，各有适用与失败模式。

machine_summary_en: The canonical Intent→Plan→Context→Act→Observe→Adjust→Stop maps to Anthropic's four phases Explore→Plan→Implement→Commit; separate planning from execution to avoid solving the wrong problem. Five patterns: retry, plan-execute-verify, explore-narrow (debug), review (maker/checker), human-in-the-loop, each with fit and failure modes.

reference_ids: `ref.anthropic.claude_code_best_practices`, `ref.osmani.loop_engineering`, `ref.agentic_reasoning_survey`, `ref.demmel.feedback_loop_engineering`, `ref.fowler.humans_and_agents`, `ref.fable.loop_engineering_synthesis_2026_07`

node_ids: `procedure.canonical_loop`, `procedure.explore_plan_implement_commit`, `principle.separate_planning_from_execution`, `pattern.retry_loop`, `pattern.plan_execute_verify`, `pattern.explore_narrow_debug`, `pattern.review_loop`, `pattern.human_in_the_loop`, `technique.loop_until_dry`, `technique.pipeline_no_barrier`

## 1. The canonical anatomy

| 7-step | Anthropic 4-phase ✓✓ | Requires |
|---|---|---|
| Intent | *(precondition)* | a machine-verifiable Definition of Done |
| Plan + Context | **Explore** (plan mode, read-only) | reads files, answers questions, no changes |
| | **Plan** | a detailed implementation plan before any edit |
| Act | **Implement** | code while *verifying against the plan* |
| Observe + Adjust | *(inner verify loop)* | a fast pass/fail check the agent runs itself |
| Stop/Escalate | **Commit** | a deterministic stop gate |

Anthropic's rationale: *"Letting Claude jump straight to coding can produce code that solves the wrong problem. Use plan mode to separate exploration from execution."* Plan mode "adds overhead" — skip it for trivial fixes. **Separating planning from execution is the structural defense against the diligent-but-wrong-goal failure** (`anti_pattern.diligent_wrong_goal`).

## 2. The five patterns

| Pattern | When | How | Failure mode |
|---|---|---|---|
| **Retry** (`pattern.retry_loop`) | small, crisp, clear signal | try → verify → minimal fix → re-verify | head-banging; cap iterations, change strategy on repeat |
| **Plan-Execute-Verify** (`pattern.plan_execute_verify`) | medium complexity | plan → small steps → verify each → summarize | wrong initial plan; allow plan revision |
| **Explore-Narrow** (`pattern.explore_narrow_debug`) | unknown root cause | investigate (logs, diffs, console, repro) → localize → minimal fix → regression test | burns time without good logs — loop has no eyes |
| **Review / maker-checker** (`pattern.review_loop`) | PR quality / correctness | implementer diff → separate reviewer (fresh context) → fix → re-review | reviewer over-reports; can miss real issues — keep humans on critical code |
| **Human-in-the-loop** (`pattern.human_in_the_loop`) | high risk | agent proposes options → human chooses → implement → verify → human approves | premature delegation; rubber-stamping |

## 3. Maker/checker is the spine

Both primary sources converge: Osmani calls maker/checker separation *"the most useful structural thing in a loop, by far"* because *"the model that wrote the code is way too nice grading its own homework"* and *"done is a claim and not a proof."* ✓✓ Anthropic gives the mechanism (fresh-context reviewer, diff + criteria only) — see `doc.governance.stop_conditions_and_multi_agent`.

## 4. Two shape/convergence techniques ◐

Model-synthesized, owner-authorized (`ref.fable.loop_engineering_synthesis_2026_07`, tier-2):

- **Loop-until-dry convergence** (`technique.loop_until_dry`) — for unknown-size discovery work (bug hunts, audits, edge-case enumeration) the stop condition is *K consecutive fruitless rounds*, not a fixed count (counts miss the tail). Two load-bearing details: dedup new findings against everything **seen** — including judge-rejected items, or rejected findings resurface each round and the loop never converges — and treat strict N-consecutive-clean gates as asymptotic, budgeting by marginal yield per round. *打空即停：连续 K 轮零新发现才停；与"已见全集"去重，N 连清是渐近的。*
- **Pipeline over barrier** (`technique.pipeline_no_barrier`) — in multi-stage fan-out, default to per-item pipelines with **no** barrier between stages (item A in stage 3 while B is in stage 1); wall-clock cost is the slowest single-item chain, not the sum of slowest-per-stage. Insert a barrier only when stage N genuinely needs cross-item context (full-set dedup, merge, zero-total early-exit). "Conceptually separate stages" never justifies synchronizing them. *默认流水线：只有跨条目上下文才设屏障，屏障延迟真实且逐阶段累加。*

See also: `doc.feedback.feedback_verification_observability` (the check that makes the inner verify loop work), `doc.lineage.theoretical_lineage` (ReAct as the Act→Observe→Adjust root).
