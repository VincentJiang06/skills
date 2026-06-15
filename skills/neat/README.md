# neat

会话结束后对项目文档与跨会话 agent 记忆做洁癖级审查，并对照代码同步，让知识不腐烂。跨平台（Claude Code / Codex / OpenCode / OpenClaw）。
End-of-session, OCD-grade knowledge-base cleanup: reconciles project docs (CLAUDE.md/AGENTS.md, README, docs/) and cross-session agent memory against the code so nothing rots. Cross-platform.

- **触发 Triggers** — “sync up” · “tidy up docs” · “update memory” · “同步一下 / 整理一下 / 收尾 / 这个阶段做完了” · `/sync` · `/neat`
- **用法 Use** — 在一段开发收尾时调用；它会先跑确定性闸门 `node scripts/kb_audit.mjs <project-dir>`（MEMORY.md 字节/行硬闸、相对时间泄漏、memory↔docs 体量倒挂、断链），HARD 违规阻断“同步完成”，再做盘点 → 变更矩阵 → 实际修改 → 自检 → 摘要。
- **不适用 Not for** — 裸 “整理 / tidy” 且无开发上下文（整理桌面、归档照片）；“整理这段代码 / 函数”（→ 代码工具）；孤立的记忆维护、与 docs/代码无核对意图（→ memory-management / consolidate-memory）。

> 本地安装名为 `vince-neat`（GitHub 上是 `neat`）。Installs locally as `vince-neat`.

完整说明 / Full spec: [SKILL.md](SKILL.md)
