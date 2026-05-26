# Skill 测试流程 / Skill Testing Process

machine_summary_zh: Skill 测试应使用分层结构：结构检查、契约测试、组件测试、轨迹评估、真实任务评估、配对评估和持续回归。不要只看单次最终输出。

machine_summary_en: Skill testing should be layered: structural checks, contract tests, component tests, trajectory evals, real-task evals, paired evals, and continuous regression. Do not rely on one final-output sample.

reference_ids: `ref.openai.eval_best_practices`, `ref.anthropic.agent_evals`, `ref.promptfoo.test_agent_skills`, `ref.google.adk.evaluate_agents`, `ref.martinfowler.test_pyramid`, `ref.stable_toolbench`

node_ids: `pillar.testing`, `procedure.test_pyramid`, `procedure.trajectory_eval`, `procedure.paired_skill_eval`, `procedure.regression_suite`

## 1. 测试目标

Skill 测试不是验证“文本看起来好”。它要验证：

- agent 是否在正确任务中触发 skill。
- agent 是否按 skill 协议执行。
- 工具、脚本、模板、参考文档是否被正确使用。
- 输出、文件、状态是否满足验收。
- skill 是否比无 skill 或旧版本更好。
- 成本、长度、稳定性和风险是否可接受。

## 2. 测试金字塔

推荐分层：

| 层级 | 名称 | 目标 | 成本 | 示例 |
|---|---|---|---|---|
| L0 | 静态结构检查 | schema、字段、路径、引用、长度 | 低 | JSON schema、link check、node budget |
| L1 | 契约测试 | 输入输出、工具参数、文件边界 | 低/中 | output schema、allowed path、error contract |
| L2 | 组件测试 | 单步路由、模板填充、脚本行为 | 中 | trigger examples、script fixture |
| L3 | 轨迹评估 | 工具调用序列、参数、状态变化 | 中/高 | expected trajectory vs actual |
| L4 | 真实任务评估 | 端到端任务完成 | 高 | fixed repo/task/user simulation |
| L5 | 配对评估 | 隔离 skill 边际收益 | 高 | with-skill vs without-skill |

原则：低层测试多且快速，高层测试少但代表真实价值。

## 3. 数据集设计

每个 skill 至少应有四类样例：

- Happy path: 典型任务。
- Boundary path: 输入不完整、上下文不完整、格式压力。
- Negative path: 不应该触发 skill 的任务。
- Adversarial path: 误导、冲突指令、工具失败、权限边界。

数据集字段建议见 `templates/eval_case.template.json`。

## 4. 轨迹评估

Trajectory evaluation 应记录：

- user task
- skill activation decision
- files/docs loaded
- tool calls and arguments
- intermediate state changes
- failure handling
- final output
- verifier result

轨迹断言可以有不同强度：

- strict: 步骤和工具调用必须完全匹配。
- unordered: 工具集合正确，顺序不强制。
- subset: 必须包含关键调用，但允许额外探索。
- rubric: 开放式任务用评分器判断质量。

## 5. 配对评估

为了判断 skill 是否真的有用，必须做 paired eval：

```text
same model + same task + same permissions + same environment
candidate A: without skill 或 old skill
candidate B: with skill 或 new skill
compare: success, quality, trajectory, cost, latency, risk
```

不要把模型升级、环境变化和 skill 改动混在同一次评估里。

## 6. 稳定环境

真实 API、网页、仓库状态会变化。测试环境应尽量稳定：

- 固定仓库 commit。
- 使用 fixtures 和 mock server。
- 缓存外部 API 返回。
- 记录模型、工具版本、权限、环境变量。
- 对随机测试保存 seed。

如果测试依赖真实外部系统，结果必须标注 `environment_stability: unstable`。

## 7. 回归流程

每次 skill 修改后至少运行：

1. L0 静态检查。
2. L1 契约测试。
3. 关键 L2 组件测试。
4. 最近失败样例。
5. 小型 paired eval。

发布前再运行完整 L3/L4/L5。

## 8. 测试完成定义

测试完成不是“没有报错”。最低标准：

- 覆盖正例、反例、边界例和邻近误触发例。
- 至少一个自动验收信号不是 LLM 主观评分。
- 有 with/without 或 old/new 对照。
- 有成本和稳定性记录。
- 失败样例进入回归套件。

