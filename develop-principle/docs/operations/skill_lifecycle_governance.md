# Skill 生命周期治理 / Skill Lifecycle Governance

machine_summary_zh: 工业级 skill 需要生命周期治理：草稿、候选、发布、监控、回归、弃用和回滚。每个阶段都应有门禁、证据和可追溯记录。

machine_summary_en: Industrial skills need lifecycle governance: draft, candidate, release, monitoring, regression, deprecation, and rollback. Each stage needs gates, evidence, and traceability.

reference_ids: `ref.openai.practical_agents`, `ref.owasp.agentic_skills_top10`, `ref.slsa`, `ref.openai.eval_best_practices`, `ref.agent_kb`, `ref.nist.ai_rmf`

node_ids: `pillar.lifecycle`, `procedure.release_gate`, `procedure.production_feedback_loop`, `procedure.skill_deprecation`

## 1. 状态模型

推荐状态：

```text
draft -> eval_candidate -> release_candidate -> released -> monitored -> deprecated -> archived
```

紧急路径：

```text
released -> disabled -> rollback -> fixed_candidate
```

## 2. Draft

Draft 阶段只要求目标清晰：

- 有 skill design record。
- 有目标任务和非目标任务。
- 有最小 eval case。
- 有初始风险判断。

Draft 不应自动触发高风险动作。

## 3. Eval Candidate

进入 eval candidate 前必须有：

- 正例、反例、边界例。
- 至少一个确定性 verifier。
- 至少一个 trajectory assertion。
- baseline 结果。
- 预算假设。

此阶段关注“是否有用”。

## 4. Release Candidate

进入 release candidate 前必须有：

- with/without 或 old/new paired eval。
- regression suite。
- metric plan。
- release gate checklist。
- rollback/disable 策略。

此阶段关注“是否稳定可控”。

## 5. Released

Released skill 应记录：

- version
- release date
- primary metrics
- known limits
- supported environments
- owner
- rollback target

发布后不代表完成。它只是进入生产反馈回路。

## 6. Production Feedback Loop

生产中发现的问题必须转成资产：

| 生产信号 | 转化为 |
|---|---|
| 误触发 | negative eval case |
| 漏触发 | positive routing case |
| 输出格式坏 | contract test |
| 工具调用错 | trajectory assertion |
| 成本过高 | budget threshold |
| 人工纠正 | regression case or guideline |
| 安全边界失败 | release gate update |

## 7. Deprecation

满足以下任一条件应考虑弃用：

- 与新平台机制冲突。
- 依赖过时工具或路径。
- 成本长期高于收益。
- 被更小、更稳定的 skill 替代。
- 触发混淆无法通过描述修复。

弃用时必须说明替代 skill、迁移路径和自动触发关闭方式。

## 8. Rollback

Rollback 条件：

- policy violation。
- high-risk false activation。
- cost explosion。
- release regression。
- dependency compromise。

Rollback 记录应包含触发原因、影响范围、恢复版本、补充测试和后续修复 owner。
