---
name: neat
description: >-
  End-of-session knowledge cleanup — reconciles project docs (CLAUDE.md, README,
  docs/) and agent memory against the code so nothing rots. Trigger on
  dev-milestone cues: "sync up", "tidy up docs", "update memory", "/neat",
  "整理文档", "$neat", or stale-docs reports. NOT for non-dev "整理", tidying code, or
  pasted text.
---

# 洁癖 — Knowledge Base Neat-Freak

> **Cross-platform Agent Skill** — Claude Code · OpenAI Codex · OpenCode · OpenClaw 通用。
> 跨平台 SKILL.md，遵循开放 Agent Skill 规范。

你是一个**知识库编辑**，不是记录员。记录员只会往后追加，编辑会审查全局、合并重复、修正过期、删除废弃。你的工作是让整个项目的知识体系始终保持**干净、准确、对新人友好**的状态——像有洁癖一样。

## 核心模型（动手前先内化）

动手前要先内化下面三条心智模型——为什么同步重要 + 完整受众表见 [rules/why-and-knowledge-model.md](rules/why-and-knowledge-model.md)：

- **三类知识，三种受众**：① agent 记忆（自己跨会话复用）② 项目根 `CLAUDE.md`/`AGENTS.md`（下次会话的自己）③ 项目 `docs/`+`README.md`（**其他人**）。受众不同、职责不重叠，**不能只改 CLAUDE.md 就收工**。
- **不对称 → 毕业机制**：docs 靠就地编辑收敛，agent 记忆天生只追加；不靠「毕业（promote）」反向阀门把稳定知识往上泵进 docs/CLAUDE.md，memory 会一路膨胀到比 docs 还大。这是膨胀头号根因，机制详见 [rules/graduation-mechanism.md](rules/graduation-mechanism.md)。
- **CLAUDE.md 是规则手册，不是变更日志**：历史叙事（"X 时刻起 Y 上线"）属于 git log / changelog / docs，不属于 CLAUDE.md。该进 / 不该进的判据与例子见 [rules/claude-md-policy.md](rules/claude-md-policy.md)。

## When NOT to use / 不适用

这个 skill 是**会话结束时的知识库编辑器**，不是通用的"整理/tidy"命令。以下情况**不要触发**（它们会拉低触发精度，也容易和别的 skill 撞车）：

- **裸 "整理" / "tidy" 且没有任何开发或会话上下文** —— 整理桌面、把照片归档、整理一个清单、tidy my desk。这不是知识库同步。
- **"整理 / clean up 这段代码 / 这个函数"** —— 这是代码工具的活，路由到代码重构，不是 neat-freak。
- **重排 / 美化用户临时粘贴的文本**（reformat this pasted JSON / 整理这段缩进）—— 不是「对照代码核对文档」。
- **孤立地维护记忆、与 docs/代码无核对意图** —— 那是 `productivity:memory-management` / `consolidate-memory` 的职责。neat-freak 的不同点：它在会话结束时把**记忆与 docs+代码相互核对**，并强制执行尺寸/腐烂闸门。

判据一句话：**有没有"刚改完代码、现在要让文档和记忆跟上"的意图？没有 → 不是 neat-freak。**

## Modules（按需加载）

SKILL.md 是薄编排层；重内容拆进 `rules/`，遇到对应步骤再读：

| 模块 | 何时加载 |
|------|---------|
| [rules/why-and-knowledge-model.md](rules/why-and-knowledge-model.md) | 动手前 —— 为什么同步重要 + 三类知识三种受众的完整模型与受众表 |
| [rules/graduation-mechanism.md](rules/graduation-mechanism.md) | 判断一条记忆该不该毕业进 docs/CLAUDE.md，或诊断 memory 膨胀时 |
| [rules/claude-md-policy.md](rules/claude-md-policy.md) | 判断一条信息该进 CLAUDE.md/AGENTS.md 还是 docs/changelog/memory 时（✅/❌ 判据表） |
| [rules/preflight-sizing.md](rules/preflight-sizing.md) | 第零步 —— 尺寸体检详解：闸门人类可读表、倒挂体检、精简→补漏执行顺序 |
| [rules/sync-protocol.md](rules/sync-protocol.md) | 第一~五步 —— 盘点 / 变更矩阵 / 实际修改 / 自检清单 / 摘要的完整动作清单 |
| [rules/special-cases-and-lifecycle.md](rules/special-cases-and-lifecycle.md) | 遇到非标准场景（无 README、无新事实、记忆冲突、跨项目、补历史漏洞）或需要版本/发布闸门/回滚信息时 |
| [rules/kb-audit-usage.md](rules/kb-audit-usage.md) | 第零步 / 第四步 —— 怎么跑 `scripts/kb_audit.mjs`，闸门清单、退出码、JSON 形状、相对时间豁免规则 |
| [rules/leakage-and-size-policy.md](rules/leakage-and-size-policy.md) | 需要精确判断某个尺寸 / 倒挂 / 相对时间边界算不算违规时 |
| [rules/controls.md](rules/controls.md) | 第三步删除/改写之前 —— 破坏性操作护栏、dry-run、git 前置、HARD 阻断 |
| [references/sync-matrix.md](references/sync-matrix.md) | 第二步 —— 完整的"变更类型 → 要改哪些文件"映射表 |
| [references/agent-paths.md](references/agent-paths.md) | 第一步 —— 各平台记忆 / 配置路径速查 |

## 执行流程

每步只列名字 + 一句话，完整动作清单见对应模块。第零步详解在 [rules/preflight-sizing.md](rules/preflight-sizing.md)；第一~五步详解在 [rules/sync-protocol.md](rules/sync-protocol.md)。

- **第零步：尺寸体检（防膨胀）** —— 任何同步动作之前先跑确定性闸门 `node scripts/kb_audit.mjs <project-dir> --json`，别靠肉眼 `wc`/`grep`/`du`。HARD 违规（退出码非 0）阻断本次"同步完成"；超尺寸修复优先级高于补漏。
- **第一步：盘点现状** —— 强制机械式枚举，先 `ls` 再判断；列出记忆文件 + 每个项目的 docs，输出一张「评估过/要改/不用改」文件清单，漏一个不行。
- **第二步：识别变更** —— 用"变更影响矩阵"思考：新事实会波及哪些文档层级；重点查这次是不是**跨项目**（上下游两边 docs 都要对齐）。完整映射见 [references/sync-matrix.md](references/sync-matrix.md)。
- **第三步：实际修改** —— 真的用 Edit/Write/删除命令落地，描述不算完成；顺序 docs/ → CLAUDE.md/AGENTS.md → 记忆；编辑原则：减优于加、合并优于追加、删除优于保留、毕业优于内部挪腾。
- **第四步：自检清单** —— 改完先重跑 `node scripts/kb_audit.mjs <project-dir>`（须 exit 0）当回归，再逐项过尺寸/反膨胀 + 完整性/反漏改两组人判断项；打不了勾就回去补。
- **第五步：变更摘要** —— 所有文件改完之后（不是之前），给用户「记忆变更 / 文档变更（按项目分组）/ 未处理」三段式摘要，只列有实际变更的条目。

## 特殊情况 / Lifecycle

非标准场景（项目无 README、对话无新事实、记忆冲突、跨项目、补历史漏洞）的处理，以及 skill 自身的版本 / 发布闸门 / 回滚 / 易变面，见 [rules/special-cases-and-lifecycle.md](rules/special-cases-and-lifecycle.md)。

## 控制 / Controls（破坏性操作护栏）

这个 skill **会删除记忆文件、重写 CLAUDE.md / docs**——破坏性。最小护栏（完整版见 [rules/controls.md](rules/controls.md)）：

- **不分类不删除**：linter 无法归类的文件（既不是记忆、也不是 docs/CLAUDE.md/README）一律不动。删除只针对能明确归类为「已废弃记忆 / 已被取代的临时计划」的文件。
- **先预览再删**：删除/批量改写前，先列出"将删除/将改写"清单（dry-run / preview），让用户能看到再执行。
- **要求 git 工作树**：仓库应是 git 工作树，这样坏的破坏性运行可 `git restore` 回滚；否则记一条显式 waiver。
- **HARD 阻断 / SOFT 咨询**：`kb_audit` 退出非 0（HARD 违规）**阻断**"同步完成"；SOFT 违规只警告、记进「未处理」，不阻断。
- **全局配置极度克制**：`~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md` 只在用户明确表达跨项目意图时才动。

## 参考资料

- **[references/sync-matrix.md](references/sync-matrix.md)** — 完整的"变更类型 → 要改哪些文件"映射表
- **[references/agent-paths.md](references/agent-paths.md)** — Claude Code / Codex / OpenCode 各自的记忆与配置路径速查
