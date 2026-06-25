# 工业级 Skill 设计 / Industrial Skill Design

machine_summary_zh: 工业级 skill 应被设计成可复用能力包，而不是提示词片段。它必须定义触发、边界、执行协议、支撑材料、证据基础、控制机制、测试资产、量化指标和生命周期。

machine_summary_en: An industrial skill should be a reusable capability package, not a prompt fragment. It must define triggers, boundaries, execution protocol, supporting materials, evidence base, controls, test assets, metrics, and lifecycle.

reference_ids: `ref.anthropic.equipping_agents_skills`, `ref.microsoft.agent_skills`, `ref.anthropic.building_effective_agents`, `ref.anthropic.writing_tools_for_agents`, `ref.anthropic.skill_authoring_best_practices`, `ref.openai.codex_best_practices`, `ref.toolformer`

node_ids: `pillar.design`, `concept.skill`, `concept.trigger`, `concept.execution_protocol`, `principle.progressive_disclosure`, `principle.executable_acceptance`, `principle.claim_evidence_traceability`, `anti_pattern.prompted_architecture`

## 1. 根定义

Skill 是面向 agent 的可复用能力包。它不是单纯的提示词，也不是单个工具封装。一个工业级 skill 至少要回答八个问题：

1. 什么时候使用，什么时候不用。
2. agent 应该按什么协议执行。
3. 哪些资料、模板、脚本、工具接口可以支持执行。
4. 这条 skill 的结论建立在哪些外部证据上，如何保证资料搜集的广度、深度和可溯源。
5. 哪些行为必须被权限、脚本、hook、测试或人工确认约束。
6. 如何验证 skill 是否真的带来收益。
7. 如何衡量成本、长度、稳定性和可控性。
8. 如何版本化、回归、下线和修复。

这一定义兼容不同 agent 平台。平台字段会变化，但这些工程责任不会消失。

## 2. 设计单元

工业级 skill 应拆成以下设计单元：

| 单元 | 作用 | 常见产物 |
|---|---|---|
| Trigger | 决定何时激活 skill | 适用场景、禁用场景、邻近误触发样例 |
| Protocol | 指导执行过程 | 预检、步骤、失败路径、验收和报告 |
| Resources | 提供按需上下文 | references、examples、templates、assets |
| Evidence base | 为依赖事实判断的 skill 建立可溯源证据 | source roster、可靠性画像、广度/深度搜索计划、claim→evidence 映射、调研文档 |
| Deterministic helpers | 降低模型即兴发挥 | scripts、validators、formatters、fixtures |
| Controls | 约束风险 | allowed tools、human gate、sandbox、policy |
| Tests | 验证行为 | eval cases、trajectory assertions、regression suite |
| Metrics | 衡量收益 | success rate、activation precision、cost per success |
| Lifecycle | 支持演进 | version、changelog、release gates、deprecation |

## 3. 触发设计

触发条件是 skill 成败的第一道关口。描述过宽会误触发，描述过窄会漏触发。

一个可测试的 trigger 应包含：

- 正例：明确应该触发的任务。
- 反例：明确不应该触发的任务。
- 邻近例：语义接近但不应触发，或需要转交其他 skill。
- 手动触发规则：当自动触发不可靠时，如何显式调用。
- 风险等级：危险工作流是否必须人工确认。

触发设计应绑定 `metric.activation_precision`、`metric.false_positive_rate` 和 `metric.false_negative_rate`。

## 4. 执行协议

执行协议应该像小型 runbook，而不是散文。推荐结构：

```text
1. Scope check: 判断任务是否属于 skill 范围。
2. Preflight: 检查文件、环境、权限、输入、依赖。
3. Plan: 列出将执行的步骤和验收条件。
4. Execute: 调用工具、脚本、模板或参考文件。
5. Verify: 运行测试、校验输出、检查轨迹或状态。
6. Report: 给出结果、证据、失败点和后续动作。
```

关键行为不要只靠“请务必”这类文字约束。能用脚本校验就用脚本；能用 schema 校验就用 schema；能用测试验收就用测试。

## 5. 渐进披露

入口文件和图谱节点应保持短。长文档、模板、样例、脚本说明都通过 id 或路径按需加载。

推荐分层：

- Discovery: 只读名称、短描述、标签、触发摘要。
- Activation: 读取入口协议和当前任务相关的短节点。
- Execution: 读取必要的模板、参考文件、脚本说明。
- Verification: 读取测试资产、metric catalog、历史失败案例。

这可以降低上下文成本，也可以减少多轮开发时的语义漂移。

## 6. 控制边界

工业级 skill 必须把关键控制外置：

- 权限边界：哪些工具、路径、网络、凭证可用。
- 风险边界：哪些动作需要人工确认。
- 输出边界：JSON schema、文件路径、格式要求。
- 成本边界：token、工具调用、时间、预算。
- 回滚边界：失败后如何恢复或停止。

反模式是 `anti_pattern.prompted_architecture`：把控制流、安全和验收都写进长提示词，期待模型每次都记住。

## 7. 设计验收

一个 skill 进入实现前，至少要有：

- `skill_design_record`：目标、边界、触发、协议、风险。
- `eval_case`：最小正例、最小反例、边界例。
- `metric_plan`：至少包含成功率、触发准确率、成本和稳定性。
- `research_doc`（对依赖外部资料或事实判断的 skill）：source roster、广度/深度搜索计划、claim→evidence 映射；纯机械型 skill 可标注 N/A 并写明原因。
- `release_checklist`：结构、测试、安全、文档、版本。

没有测试资产的 skill 只能算草稿，不能算工业级能力。依赖外部事实却没有证据基础的 skill 同样只能算草稿。

## 8. 2026 平台更新

当前一线平台给出的共同信号更明确：skill 是上下文管理和可复用流程的基础设施，不是“更长提示词”。Claude Code 的 skill 以 `SKILL.md` 为入口，只有在显式调用或任务匹配时加载；OpenAI Codex 的最佳实践则把可复用项目指导放进短而实用的 `AGENTS.md`，并要求任务 prompt 写清 Goal、Context、Constraints 和 Done when。

因此工业级 skill 的设计原则应更保守：重复出现的流程、清单、校验或脚本才值得沉淀成 skill；入口只放触发和最小协议；完成条件必须能被检查；长期背景放在 agent home 里的 KB 或 `AGENTS.md`，不要塞进每个 skill 的正文。
