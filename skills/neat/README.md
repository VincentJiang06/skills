# neat

> 会话/里程碑收尾时，对知识库做洁癖级清理 —— 让任何知识都不腐烂。

[English](README.en.md) · **简体中文**

**做什么** —— 在会话或里程碑收尾时，对知识库做洁癖级清理：把项目文档（CLAUDE.md/AGENTS.md、README、docs/）和跨会话的 agent 记忆，对着代码逐一对账，让任何知识都不腐烂。跨平台（Claude Code / Codex / OpenCode / OpenClaw）。

**好在哪** ——
- 一个确定性的防膨胀 / 防腐烂 linter（`kb_audit.mjs`）把「同步完成」卡在机器可校验的**硬证据**上 —— MEMORY.md 字节/行数上限、相对时间泄漏、记忆-对-文档体量倒挂、索引死链。
- 一个「记忆 → 文档」毕业阀门，把稳定知识反向泵进 docs，防索引膨胀。
- 瘦编排型 SKILL.md：常驻占比低，其余按需加载。

**什么时候用** —— 「sync up」·「整理文档 / 更新记忆 / 收尾 / 这个阶段做完了」·「新人能直接上手」；也可用 `/sync`、`/neat` 显式调用。
**不适用** —— 裸「整理 / tidy」且无开发或会话上下文（整理桌面、归档照片）；「整理这段代码 / 函数」（→ 代码工具）；孤立的记忆维护、与 docs/代码无核对意图（→ memory-management / consolidate-memory）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/neat ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
