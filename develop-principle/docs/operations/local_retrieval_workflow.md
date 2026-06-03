# 本地检索工作流 / Local Retrieval Workflow

machine_summary_zh: develop-principle 的本地检索流程是先用生成索引定位候选 docs、nodes、assets 和 references，再用图谱邻接关系扩展上下文，最后只加载任务相关长文和执行资产。

machine_summary_en: develop-principle local retrieval first uses generated indexes to locate candidate docs, nodes, assets, and references; then expands through graph adjacency and loads only task-relevant long docs and execution assets.

reference_ids: `ref.llms_txt`, `ref.json_ld`, `ref.backstage.catalog`, `ref.microsoft.graphrag`, `ref.byterover`

node_ids: `pillar.kb_architecture`, `principle.short_node_budget`, `principle.id_references`, `pattern.progressive_loading`

## 1. 检索顺序

本地 agent 查询时优先走机器索引：

```text
query text
-> indexes/search_index.json
-> indexes/route_map.json
-> indexes/summary_cards.json
-> indexes/graph_adjacency.json
-> matching compressed summaries and nodes
-> doc_ids / reference_ids / assets
```

不要先全文读取 `docs/` 或 `references/`。长文只在命中节点或路由明确指向时加载。

## 2. 查询命令

```bash
node tools/query_kb.mjs "skill 发布前 release gate rollback"
```

输出分三层：

- `matches`: 直接命中的 docs、nodes、assets、references。
- `expand.nodes`: route map 直接建议的节点。
- `expand.docs`: 命中节点建议加载的长文。
- `expand.assets`: route map 直接建议的模板、清单、schema、工具或报告。
- `expand.neighbor_nodes`: 图谱邻接节点，用于二跳扩展。

命中的 docs 和 nodes 会附带 `summary_zh` / `summary_en`。agent 应先读
`indexes/summary_cards.json` 中的压缩结论，再决定是否加载完整 Markdown。
默认 route expansion 只采用最强 route，避免弱重叠查询展开过多资产。

## 3. 更新顺序

新增或修改知识时：

1. 更新源文件：`INDEX.json`、nodes、edges、docs、references、metrics 或 assets。
2. 运行 `node tools/build_indexes.mjs`。
3. 运行 `node tools/validate_kb.mjs`。
4. 运行 query/effectiveness/context/traceability 检查。

`validate_kb.mjs` 会重新生成索引并检查生成结果是否与当前 worktree 一致；如果索引过期，校验失败。

## 4. 索引职责

| 文件 | 职责 |
|---|---|
| `indexes/search_index.json` | token 到 docs/nodes/assets/references 的倒排表 |
| `indexes/route_map.json` | 覆盖目标和 query fixture 到加载集合的路由表 |
| `indexes/graph_adjacency.json` | 节点的 parents、children、neighbors、docs、references |
| `indexes/summary_cards.json` | 长文和节点的压缩结论卡片，用于提交前快速判断加载范围 |

索引文件是派生产物。真实来源仍是 `INDEX.json`、`knowledge_graph/`、`references/` 和 `testing/query_effectiveness_cases.json`。

## 5. 检索广度与深度

`query_kb.mjs` 把广度和深度交给 agent 自己决定，而不是写死。默认 `standard`
保持低上下文、单路由、单跳行为;需要"超多资料搜集"时显式放宽:

| 模式 | limit | routes | hops | 用途 |
|---|---|---|---|---|
| `--focused` | 5 | 1 | 1 | 只要最相关的一两条结论,tier ≤ 2 |
| `--mode standard` | 8 | 1 | 1 | 默认,精准低上下文 |
| `--broad` | 20 | 3 | 2 | 多路由 + 二跳邻接 + 邻居引用,广撒网 |
| `--exhaustive` | 40 | 6 | 3 | 全覆盖审计,放宽路由阈值 |

细粒度旋钮可覆盖任意预设:`--limit N`、`--routes N`、`--hops N`(`--depth`)、
`--max-tier 1..4`(或 `--refs tierN|none|all`)、`--kinds doc,node,asset,reference`、
`--neighbors`/`--no-neighbors`、`--expand-neighbor-refs`、`--min-goal-score`、
`--min-case-score`、`--min-case-overlap`。输出里的 `search_plan` 会回显当前生效的
广度/深度参数,方便 agent 判断是否要再放宽一档。

调研型任务(资料搜集)默认用 `--broad` 或 `--exhaustive` 起步,再按需收窄;
精准定位单个资产时用 `standard` 或 `--focused`。
