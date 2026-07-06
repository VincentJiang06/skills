# Skill 生命周期管理 / Skill Lifecycle Management

machine_summary_zh: 工业级 skill 需要从草稿、候选、发布、观测、回滚、弃用到演进形成闭环。核心机制是版本清单、发布门禁、注册表、运行轨迹、回滚预案、弃用元数据和证据门控更新。

machine_summary_en: Industrial skills need a lifecycle loop from draft, candidate, release, observation, rollback, deprecation, to evolution. Core mechanisms are version manifests, release gates, registries, runtime traces, rollback plans, deprecation metadata, and evidence-gated updates.

reference_ids: `ref.open_agent_skills.specification`, `ref.skills_re.registry`, `ref.skillsvote.lifecycle_governance`, `ref.skilldex.package_registry`, `ref.claude_code.skills_docs`, `ref.secure_agent_skills.lifecycle_threats`, `ref.opentelemetry.genai_agent_spans`, `ref.openai.agents_tracing`, `ref.langsmith.observability`, `ref.semver`, `ref.google_sre.canarying`, `ref.openfeature.feature_flags`, `ref.fable.skill_engineering_synthesis_2026_07`, `ref.agentskills.open_standard_2025_12`, `ref.snyk.toxicskills_2026_02`

node_ids: `pillar.lifecycle`, `concept.skill_release_manifest`, `procedure.release_gate`, `procedure.rollback_plan`, `procedure.deprecation_policy`, `procedure.evidence_gated_update`, `pattern.skill_registry`, `metric.rollback_readiness`, `metric.lifecycle_trace_coverage`, `pattern.runtime_adapter_variant`

## 1. 调研缺口

现有库已经覆盖设计、测试、TDD、指标和上下文架构。工业化生命周期还必须补齐：

| Gap | Why it matters | Artifact |
|---|---|---|
| Release gate | 防止未验证 skill 进入复用库 | `checklists/skill_release_gate.checklist.json` |
| Version manifest | 让行为变化、依赖、测试结果和兼容性可追溯 | `templates/skill_release_manifest.template.json` |
| Registry policy | 管理发现、分发、所有权、不可变版本和回滚入口 | `pattern.skill_registry` |
| Observability | 记录 agent/tool/model/skill 轨迹，支撑调试和指标 | `metric.lifecycle_trace_coverage` |
| Rollback plan | skill 更新失败时能恢复到已知好版本 | `procedure.rollback_plan` |
| Deprecation policy | 避免 silently breaking running agents | `templates/deprecation_notice.template.json` |
| Evidence-gated updates | 防止把噪音轨迹、失败经验或偶然成功写回 skill | `procedure.evidence_gated_update` |

## 2. 生命周期状态

推荐状态机：

```text
draft -> candidate -> released -> monitored -> deprecated -> sunset
                         |             |
                         v             v
                      rolled_back   patched
```

| State | Meaning | Exit gate |
|---|---|---|
| draft | 只有设计和少量样例 | 触发、边界、最小测试定义完成 |
| candidate | 可运行但未发布 | release gate 全部通过 |
| released | 可被 agent 或 registry 使用 | 观测指标稳定 |
| monitored | 已有运行轨迹和回归数据 | 继续、修复、回滚或弃用 |
| rolled_back | 当前版本撤回，恢复旧版本 | 事故记录和补丁计划完成 |
| deprecated | 不建议新用，但仍兼容旧消费者 | 替代 skill 和 sunset 日期明确 |
| sunset | 停止支持或删除 | 下游引用清理完成 |

## 3. 发布门禁

发布门禁不是只跑一次测试，而是确认 skill 包、测试资产、指标、风险、版本和回滚都准备好。

最低门禁：

1. 结构门禁：入口、支持文件、模板、脚本、引用路径有效。
2. 触发门禁：正例、反例、邻近例都通过。
3. 行为门禁：端到端任务、轨迹断言和输出契约通过。
4. 成本门禁：入口长度、加载上下文、token 和工具调用在预算内。
5. 安全门禁：权限、路径、网络、凭证、人工确认规则明确。
6. 版本门禁：语义版本、变更类型、兼容性、changelog 完整。
7. 回滚门禁：上一稳定版本、恢复步骤、状态影响和验证方法明确。

## 4. 版本语义

Skill 的 public API 不是函数签名，而是 agent 可依赖的行为契约：

- 触发范围。
- 输入假设。
- 输出格式。
- 工具和权限边界。
- 文件或状态副作用。
- 测试资产和验收标准。

推荐版本策略：

| Change | Version | Example |
|---|---|---|
| Fix | PATCH | 修正错误示例，不改变触发范围和输出契约 |
| Compatible capability | MINOR | 增加新模板、新可选路径、新测试覆盖 |
| Breaking behavior | MAJOR | 改变触发范围、输出结构、权限边界或默认执行路径 |
| Experimental | prerelease | `1.2.0-rc.1`、`0.4.0-alpha.2` |

每个发布版本必须不可变。任何修订都发布为新版本。

## 5. 注册表和分发

Skill registry 不只是下载入口，它是工业化控制面：

- Discovery: name、description、tags、owner、version、compatibility。
- Distribution: immutable artifact、checksum、source link、license。
- Trust: provenance、review status、test status、security notes。
- Coherence: skillset、shared assets、dependency graph。
- Recovery: previous stable version、rollback command、deprecation metadata。

注册表中的短 metadata 用于发现；完整 skill、参考文档和脚本按需加载。

## 6. 观测和运行证据

每次重要运行至少应记录：

```json
{
  "run_id": "run_...",
  "skill_id": "skill.example",
  "skill_version": "1.2.0",
  "agent_runtime": "runtime-name",
  "model_id": "model-name",
  "task_id": "task.example",
  "trace_id": "trace_...",
  "tool_calls": [],
  "loaded_doc_ids": [],
  "metrics": {
    "success": true,
    "latency_ms": 0,
    "input_tokens": 0,
    "output_tokens": 0,
    "policy_violations": 0
  }
}
```

观测数据要能回答：

1. skill 有没有被正确触发。
2. 失败发生在触发、规划、工具、环境、输出还是验收。
3. 新版本是否比旧版本更好，还是只增加了成本和波动。

## 7. 回滚

回滚计划必须在发布前写好。最低字段：

- known_good_version
- rollback_trigger
- rollback_steps
- validation_after_rollback
- data_or_file_side_effects
- owner
- incident_record_path

Skill 回滚不仅是恢复文件。还要恢复 registry 指针、agent 配置、缓存、共享模板、评估基线和文档索引。

## 8. 弃用

弃用不是删除。弃用应提供机器可读元数据：

```json
{
  "deprecated_at": "2026-05-27",
  "sunset_at": "2026-08-27",
  "replacement_id": "skill.new-example",
  "severity": "warning",
  "reason": "Output contract is superseded by v2 schema."
}
```

进入 `deprecated` 后，新任务不应默认选择该 skill；旧任务仍可在兼容窗口内运行，并输出迁移提示。

## 9. 证据门控更新

不要把每次成功轨迹都写回 skill。更新必须满足：

- 成功可以被验收测试或明确 rubric 验证。
- 改进能在回归集或 paired eval 中复现。
- 轨迹不是环境偶然、模型探索或人工补救导致的假成功。
- 新内容不会扩大触发范围、权限边界或上下文成本而未说明。
- 更新后生成新版本，并保留旧版本可回滚。

## 10. 推荐产物

生命周期完整的 skill 至少应拥有：

- `skill_design_record`
- `test_strategy_matrix`
- `metric_catalog`
- `skill_release_manifest`
- `release_gate_checklist`
- `rollback_plan`
- `deprecation_notice`
- `runtime_trace_schema`
- `registry_metadata`
- `incident_record`

## 11. 跨运行时变体 / Runtime-adapter variant

自 2025-12 Agent Skills 成为跨厂商开放标准（`ref.agentskills.open_standard_2025_12`）后，同一条技能常需跑在多个 agent 运行时（Claude Code、Codex CLI 等）。`pattern.runtime_adapter_variant`（来源 `ref.fable.skill_engineering_synthesis_2026_07`）给出移植纪律：契约、schema、校验器逐字节复用，把一切运行时词汇（角色如何落地、并行怎么实现、状态放哪、哪些 frontmatter 字段是厂商专有）隔离进一个 adapter 参考文件。变体因此便宜、产物跨运行时互认、整套测试电池原样迁移。已实证：loop-constructor→Codex 移植，linter 字节相同，外部评测 PASS。注意可移植性检查表要区分开放标准核心字段与厂商专有字段（如 Claude Code 的 `disable-model-invocation` 无 Codex 等价物）。

供应链安全是生命周期的一部分：`ref.snyk.toxicskills_2026_02` 给出\"只安装可信来源\"的基线数字（扫描 3,984 个技能，13.4% 含严重缺陷、36.82% 含任意缺陷）与一套 8 类漏洞分类，可用于注册表信任门与发布前安全门禁。

Since Agent Skills became a cross-vendor open standard, one skill often runs on several agent runtimes. Keep contracts, schemas, and validators byte-identical and quarantine all runtime vocabulary into one adapter file; a portability checklist must separate open-standard core fields from vendor-only ones. Supply-chain security is part of the lifecycle: ToxicSkills gives base-rate numbers and a taxonomy for registry-trust and pre-release security gates.
