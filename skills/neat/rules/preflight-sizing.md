# rules/preflight-sizing.md — 第零步 尺寸体检（防膨胀）详解

读这份的时机：第零步，任何同步动作之前。这是这个 skill 的最高优先级——超尺寸的修复优先于补本次会话漏掉的同步。`scripts/kb_audit.mjs` 的运行细节见 [rules/kb-audit-usage.md](kb-audit-usage.md)。

## 第零步：尺寸体检（防膨胀）—— 跑 linter，别靠肉眼

任何同步动作之前，**先跑确定性闸门**，而不是手动 `wc -l` / `grep` / `du`：

```bash
node scripts/kb_audit.mjs <project-dir> --json
```

它会输出 `{ violations:[{gate,severity,file,detail}], hardFail, skipped, summary }` 并在**任何 HARD 违规时退出码非 0**。HARD 闸门（MEMORY.md ≤25000 字节 且 ≤200 行、索引断链）阻断本次"同步完成"——它们没过，补再多增量同步都是徒劳（超尺寸部分静默丢失）。SOFT 闸门（单条记忆 >100 行、CLAUDE.md 过大、相对时间遗留、memory>docs 倒挂）只警告、不阻断，但要记进摘要的「未处理」。闸门清单、退出码、相对时间豁免规则见 [rules/kb-audit-usage.md](kb-audit-usage.md)。

**linter 是辅助不是替代**：它机检可量化的不变量；受众错配、跨项目漏改这类人判断项仍由你在第一~四步把关。

下面这张表是各闸门的人类可读版（linter 已机检前几行）：

| 文件 | 上限 | 超过怎么办 |
|---|---|---|
| `CLAUDE.md` / `AGENTS.md` | ~300 行 / ~15KB（软，看 adherence） | 先精简：扫顶部 blockquote / 历史叙事段 → 删 / 迁 docs；项目概览只留 1-3 行 + 速查表，不做"提醒下次会话"用。（CLAUDE.md 是全量加载，不会被截断，但越长 adherence 越差） |
| 记忆索引 `MEMORY.md` | **≤200 行 且 ≤25KB（硬）** | Claude Code 只加载 `MEMORY.md` 的前 200 行或前 25KB（先到先算），**超出部分在会话开始时静默不加载——等于没记**。务必压在 ~150 行 / ~18KB 留缓冲。压法不是硬删，是下面的「毕业」机制：详细机制提升进 docs、索引只留一行指针 |
| 单条 memory 文件 | ~100 行（软） | 通常在塞多件事 / 写成事故复盘 → 拆 / 删；**若是稳定机制说明，提升进 docs 再把记忆缩成 reference 指针** |
| `docs/<single>.md` | ~1500 行（软） | 切分成多文件，加目录索引 |

**额外做一次「体量倒挂」体检**：`du -sh <memory 目录>` 对比 `du -sh docs/`。**健康态是 docs 厚、memory 薄**——docs 是沉淀的权威层，memory 是流动的「最近教训 + 指针」层。若 memory 反而比 docs 大，几乎一定是「本该毕业进 docs 的稳定知识还赖在松散记忆文件里」，按「毕业」机制往上泵，别只在 memory 内部挪。

**超尺寸是这个 skill 的最高优先级，大于"补本次会话漏掉的同步"。** 原因：`MEMORY.md` 超 25KB 的部分根本不进上下文（静默丢失），超尺寸的 CLAUDE.md 让真正的规则被叙事段挤出 adherence——两种情况下，同步再补都徒劳。

**执行顺序**：先精简（破除膨胀）→ 再做本次会话增量同步（补漏）。两件事不能合并——精简时心态是"什么不该在这"，补漏时心态是"什么该补到这"，混着做会两头不到位。
