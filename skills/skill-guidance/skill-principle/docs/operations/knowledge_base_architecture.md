# 知识库架构 / Knowledge Base Architecture

machine_summary_zh: skill-principle 使用短入口、短图谱节点、ID 引用、长文外链和结构化引用库，目标是在多轮 agent 工业化开发中节省上下文并保持可追溯性。

machine_summary_en: skill-principle uses short entrypoints, compact graph nodes, ID references, linked long docs, and structured references to save context and preserve traceability during multi-turn agent development.

reference_ids: `ref.llms_txt`, `ref.diataxis`, `ref.dita.topic`, `ref.backstage.catalog`, `ref.json_ld`, `ref.microsoft.graphrag`, `ref.agent_kb`, `ref.byterover`, `ref.docs_as_code`, `ref.fable.skill_engineering_synthesis_2026_07`

node_ids: `pillar.kb_architecture`, `principle.short_node_budget`, `principle.id_references`, `pattern.progressive_loading`, `principle.scripts_execute_dont_load`

## 1. 设计目标

这个目录不是普通 background。它是给 agent 反复使用的开发原则知识基础设施。

目标：

- 低上下文消耗。
- 快速定位相关知识。
- 保留来源和证据链。
- 支持多轮迭代和回归。
- 让人类监管者也能抽查。

## 2. 加载顺序

推荐 agent 加载顺序：

```text
1. AGENT_INDEX.md
2. INDEX.json
3. indexes/search_index.json / indexes/route_map.json / indexes/graph_adjacency.json
4. knowledge_graph/nodes/*.json 中相关节点
5. 节点 doc_ids 指向的 Markdown
6. 节点 reference_ids 指向的引用条目
7. templates/checklists/metrics 中的执行资产
```

不要默认读取全部 docs 和 references。

## 3. 短节点规则

每个 node 只放：

- id
- type
- tier
- title_zh / title_en
- summary_zh / summary_en
- tags
- parent_ids / child_ids
- doc_ids
- reference_ids

不放：

- 长解释
- 长引用
- 完整流程
- 大型 checklist
- 搜索结果原文

## 4. ID 引用规则

所有关系都用 id：

- `parent_ids`
- `child_ids`
- `doc_ids`
- `reference_ids`
- `edge.source_id`
- `edge.target_id`

这样可以避免节点之间复制文本，也方便后续换存储后端。

## 5. 文档类型

| 类型 | 位置 | 作用 |
|---|---|---|
| Entry | `AGENT_INDEX.md` | 极短入口 |
| File index | `INDEX.json` | 文件和覆盖度索引 |
| Node | `knowledge_graph/nodes/` | 短知识卡 |
| Edge | `knowledge_graph/edges/` | 节点关系 |
| Generated index | `indexes/` | 搜索倒排、路由表、图谱邻接表 |
| Long doc | `docs/` | 中长解释 |
| Reference | `references/` | 来源数据库 |
| Template | `templates/` | 可复用执行资产 |
| Checklist | `checklists/` | 评审和发布门禁 |
| Metric | `metrics/` | 指标定义 |

Research doc 使用 `templates/research_doc.template.md`。它不是普通笔记，而是从来源证据到 findings、inferences、decisions、asset updates 和 validation plan 的桥接文档。

## 6. 双语策略

JSON 机器条目保持双语字段：

- `title_zh`
- `title_en`
- `summary_zh`
- `summary_en`
- `tags` 用英文机器标签

Markdown 中文为主，关键术语保留英文原词。

## 7. 演进规则

新增知识时：

1. 先判断是否需要 node。
2. node 保持短。
3. 长解释放 docs。
4. 来源放 references。
5. 执行动作放 templates/checklists/testing/metrics。
6. 更新 `INDEX.json` 覆盖度。
7. 运行 `node tools/build_indexes.mjs` 重新生成检索索引。

如果一个节点开始变长，说明它应该拆成一个短节点和一个 Markdown 文档。

## 8. 脚本执行不加载 / Scripts execute, they don't load

`principle.scripts_execute_dont_load`（来源 `ref.fable.skill_engineering_synthesis_2026_07`）是上下文记账里的一条硬规则：捆绑脚本近似零成本，它们被执行而非被读入窗口。因此把一切确定性行为（校验、测量、渲染、门）从散文挪进 `tools/` / `scripts/`，散文只留给真正需要判断处。一段描述确定性流程的长散文，就是一个还没写成脚本的脚本——每次加载都花上下文，还会与实现漂移。本 KB 自身即遵循此规则：索引与质量报告由 `tools/*.mjs` 生成，绝不手写。

In context accounting, bundled scripts are near-free — executed, not loaded — so every deterministic behavior belongs in a script, and prose is spent only where judgment is required. A long prose passage describing a deterministic procedure is just a script not yet written; it costs context on every load and drifts from the implementation besides.
