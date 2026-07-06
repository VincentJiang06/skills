# rules/claude-md-policy.md — CLAUDE.md / AGENTS.md 是规则手册，不是变更日志

读这份的时机：判断一条信息该进 CLAUDE.md / AGENTS.md 还是该进 docs / changelog / memory 时（第二、三步编辑过程中最常用）。

## CLAUDE.md / AGENTS.md 是规则手册，不是变更日志（重要）

最常见的 skill 翻车模式：每次开发完都在 CLAUDE.md 顶部加一段 blockquote 历史叙事——"2026-05-08 X 功能上线，详见 docs/Y.md"。一次很爽，半年后顶部就是 200 行 blockquote 把真正的规则推到看不见。**这种叙事不属于 CLAUDE.md**，它的归宿是 git log / `/changelog` 页 / `docs/CHANGES.md`。

判断一条信息该不该进 CLAUDE.md，问一句：**下次 AI 写代码时如果没看到这条，会不会犯错？**

| 例子 | 进 CLAUDE.md？ | 理由 |
|---|---|---|
| "Prisma 查询只写在 `modules/**/data/`" | ✅ | 违反就是边界破坏，AI 必须看到 |
| "rsync 单文件部署必须用完整 target 路径" | ✅ | 踩坑警示，会再次踩 |
| "禁止裸跑 systemctl stop aihot-worker" | ✅ | 红线，事故级 |
| "2026-05-08 timelineAt 上线，详见 docs/ARCHITECTURE.md §5.4" | ❌ | 详细机制在 docs；AI 改到这块自然会读 docs；「深入文档」指针表已做这件事 |
| "2026-04-30 起公网开放，匿名可访 /、/all" | ❌ | 既是历史也是事实，但事实归 docs/ARCHITECTURE.md §8 + 项目概览一句话足矣 |
| "5/8 修了 X bug 的复盘细节" | ❌ | 单次事故记忆，归 memory 或干脆删 |

✅ 该进 CLAUDE.md 的内容：硬边界规则、禁止事项、命令速查、权限模型、协作流程、深入文档指针表、踩坑警示。
❌ 不该进的：历史叙事（"X 时刻起 Y 上线"）、详细机制说明、单次事故复盘、bug fix 流水账、"详见 docs/Z.md" 的指针句子（这个角色已经被「深入文档」指针表占掉了）。
