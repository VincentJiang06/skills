# Skill TDD 规划 / TDD for Skill Development

machine_summary_zh: Skill TDD 是 eval-driven development 的特化：先把目标行为写成失败任务、验收标准、评分器和轨迹断言，再实现最小 skill，最后重构结构和测试。

machine_summary_en: Skill TDD is a specialization of eval-driven development: write failing tasks, acceptance criteria, graders, and trajectory assertions first; then implement the minimal skill and refactor structure and tests.

reference_ids: `ref.kent_beck.tdd_by_example`, `ref.openai.evals`, `ref.anthropic.agent_evals`, `ref.metamorphic_testing`, `ref.mutation_testing`, `ref.quickcheck`

node_ids: `pillar.tdd`, `procedure.red_green_refactor_for_skill`, `technique.contract_test`, `technique.mutation_test`, `technique.metamorphic_test`

## 1. Skill TDD 的目标

传统 TDD 保护代码行为。Skill TDD 保护 agent 行为。

Skill 的行为有非确定性，所以 TDD 不应只写“输入等于输出”的断言。它应组合：

- deterministic tests: schema、脚本、文件、状态。
- trajectory assertions: 工具调用、步骤、参数。
- rubric graders: 开放式质量判断。
- paired eval: 对照 skill 是否带来收益。
- repeated trials: 多次运行衡量稳定性。

## 2. Red-Green-Refactor

### Red

先写会失败的测试资产：

- 目标任务。
- 初始环境和 fixtures。
- 明确验收标准。
- 最少一个确定性检查。
- 预期轨迹或关键轨迹约束。
- 成本和长度预算。

### Green

只实现让测试通过的最小 skill：

- 最小触发描述。
- 最短可执行协议。
- 必要模板或脚本。
- 必要参考文件。
- 必要控制边界。

不要在 green 阶段追求完整百科式文档。

### Refactor

通过后再重构：

- 把长内容移到 references 或 docs。
- 把重复步骤抽成模板。
- 把模糊规则转成 checklist 或 schema。
- 把失败样例加入回归。
- 更新 metric catalog。

## 3. 测试计划顺序

推荐顺序：

1. 写 `skill_design_record`。
2. 写 3 个 eval case：正例、反例、边界例。
3. 写输出契约和轨迹断言。
4. 跑 without-skill baseline。
5. 实现最小 skill。
6. 跑 with-skill candidate。
7. 比较边际收益和成本。
8. 对失败点补回归样例。
9. 做 mutation 或 metamorphic 扩展。

## 4. 契约测试

Contract tests 适合保护：

- 输入 schema。
- 输出 JSON 或 Markdown 结构。
- 文件写入路径。
- 工具调用参数。
- 错误处理格式。
- 禁止行为。

契约测试应尽量确定性，不依赖 LLM judge。

## 5. 属性测试

Property-based testing 用于验证不变量：

- 输入表达变化，输出结构不变。
- 增加无关文件，不改变核心判断。
- 约束更严格时，行为更保守。
- 权限不足时，不绕过边界。
- 工具失败时，进入降级路径。

随机或生成式样例必须保存 seed 和最小失败反例。

## 6. 蜕变测试

当没有唯一答案时，写 metamorphic relation：

```text
MR-1: 同义任务描述 -> 应触发同一 skill。
MR-2: 加入无关上下文 -> 不应改变关键结论。
MR-3: 移除必要输入 -> 应要求补充信息或进入安全失败。
MR-4: 工具返回错误 -> 应报告失败并停止危险动作。
```

## 7. 变异测试

Mutation testing 用于衡量测试套件是否真的约束 skill。

可注入的 skill mutant：

- 删除“不适用场景”。
- 弱化权限边界。
- 删除验收步骤。
- 改错工具调用顺序。
- 污染示例输出格式。
- 删除失败处理。

如果 mutant 仍通过测试，说明测试套件太弱。

## 8. TDD 完成定义

一个 skill 的 TDD 规划完成需要：

- baseline 结果。
- candidate 结果。
- 至少 3 类 eval case。
- 至少 1 个确定性 verifier。
- 至少 1 个 trajectory assertion。
- 至少 1 个反例或邻近误触发样例。
- 失败样例回填回归套件。

