# 量化 Skill 指标 / Quantitative Skill Metrics

machine_summary_zh: Skill 指标应覆盖效果、触发、稳定性、过程、成本、长度、可控性和安全。核心实践是配对评估、重复 trial、轨迹记录和成本归一化。

machine_summary_en: Skill metrics should cover effectiveness, activation, stability, progress, cost, length, controllability, and safety. Core practices are paired eval, repeated trials, trajectory logging, and normalized cost.

reference_ids: `ref.swe_skills_bench`, `ref.tau_bench`, `ref.agentboard`, `ref.helm`, `ref.metr.long_tasks`, `ref.agent_token_consumption`, `ref.promptfoo.test_agent_skills`

node_ids: `pillar.metrics`, `metric.task_success_rate`, `metric.activation_precision`, `metric.pass_k`, `metric.cost_per_success`, `metric.progress_rate`, `metric.marginal_lift`

## 1. 指标分组

工业级 skill 至少要分组衡量：

| 组 | 目的 | 典型指标 |
|---|---|---|
| Effectiveness | 是否完成任务 | task_success_rate、quality_score、acceptance_pass |
| Activation | 是否正确触发 | activation_precision、false_positive_rate、false_negative_rate |
| Reliability | 是否稳定 | pass^k、variance、retry_success |
| Progress | 失败前推进多少 | progress_rate、stage_completion |
| Cost | 是否值得 | cost_per_success、tokens_per_success、latency |
| Length | 是否超出上下文 | skill_entry_tokens、loaded_context_tokens |
| Control | 是否守边界 | policy_violation_rate、tool_overreach_rate |
| Safety | 是否可发布 | unsafe_action_rate、human_gate_rate |

## 2. 配对指标

Skill 的核心指标不是绝对分数，而是边际收益：

```text
marginal_lift = score(with_skill) - score(without_skill)
cost_delta = cost(with_skill) - cost(without_skill)
net_value = marginal_lift / cost_delta
```

如果 skill 提升成功率但成本暴涨，不能自动判定为好。必须看任务价值和成本预算。

## 3. 触发指标

触发指标来自 routing 数据集：

```text
activation_precision = true_positive / (true_positive + false_positive)
activation_recall = true_positive / (true_positive + false_negative)
false_positive_rate = false_positive / non_target_cases
false_negative_rate = false_negative / target_cases
```

目标不是所有任务都触发，而是在正确边界内触发。

## 4. pass^k

同一任务重复运行 k 次：

- pass@1: 单次运行成功率。
- pass^k_all: k 次都成功的比例，衡量稳定可依赖性。
- pass^k_any: k 次中至少一次成功，衡量可重试潜力。
- variance: 成本、轨迹和输出质量波动。

工业场景更关注 pass^k_all，而不是“多试几次总能成”。

## 5. 过程指标

只看最终成败会隐藏问题。过程指标包括：

- progress_rate: 完成阶段数 / 总阶段数。
- tool_call_correctness: 工具和参数是否正确。
- recovery_rate: 工具失败后是否正确降级。
- diagnostic_quality: 失败报告是否能帮助修复。
- regression_escape_rate: 曾经失败的样例是否再次逃逸。

## 6. 成本和长度

Skill 必须量化上下文成本：

```text
skill_entry_tokens
loaded_reference_tokens
tool_output_tokens
total_context_tokens
tokens_per_success
cost_per_success
latency_per_success
```

入口文件越长，不代表 skill 越强。长期维护中应优先优化 `tokens_per_success` 和 `loaded_context_tokens`。

## 7. 可控性指标

控制指标用于判断是否可交给生产 agent：

- policy_violation_rate
- forbidden_tool_call_rate
- unauthorized_path_access_rate
- missing_human_gate_rate
- unsafe_action_attempt_rate
- output_schema_violation_rate

这些指标应尽量用确定性检查，不要全部交给 LLM judge。

## 8. 仪表盘最小集

每个 skill 版本至少记录：

```json
{
  "skill_version": "0.1.0",
  "task_success_rate": 0.0,
  "marginal_lift": 0.0,
  "activation_precision": 0.0,
  "pass_k_all": 0.0,
  "cost_per_success": null,
  "loaded_context_tokens_p50": null,
  "policy_violation_rate": 0.0,
  "regression_pass_rate": 0.0
}
```

## 9. 解释原则

指标必须和任务集一起解释。没有任务集定义的成功率没有意义；没有成本记录的提升不完整；没有 repeated trials 的单次结果不稳定。

