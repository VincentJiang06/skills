# Changelog — model-pyramid

## 1.0.0 — 2026-07-29 · 从头重建 / ground-up rebuild

v0.1.0 是在 Opus 4.x 时代按"subagent fan-out 定档卡"写的。Claude 5 家族把 effort 从一个附属旋钮变成了
**与选模型并列的第一控制轴**，且 subagent 的 effort 调节比当时积极得多，旧版的规则表已经不只是过时——
其中两条是**方向错的**。本版按实时文档重新调研后整体重写。

> This is a rewrite, not an increment. Two of v0.1.0's four rules were not merely stale but
> pointed the wrong way under the Claude 5 effort ladder.

### 推翻的两条 / Reversed

- **`R2 search → 降一档 effort` → 反了。** effort 管的是**整个回复的所有 token，含工具调用**，
  官方把"repeated tool calling、detailed web search、knowledge-base search"列为**该上 `xhigh`** 的理由。
  给搜索代理降 effort，买到的是一个**不再继续找**的代理。新规则：搜索**继承或调高**。
- **`HARD FLOOR: 永不输出 low` → 删除。** `low` 是官方为子代理写明的合法档位
  （"simpler tasks that need the best speed and lowest costs, such as subagents"）。
  改为**没有硬下限**：要论证，不要禁用。`evals` 里的 `L2-no-medium-floor` 守着这条不被改回去。

### 新的核心 / New core

四条规则表换成**两条轴**：

- 拿到了上下文、试了、还是错 → **能力缺口 → 换 MODEL**
- 因为跳过文件 / 没跑测试 / 没复核而错 → **彻底度缺口 → 换 EFFORT**

范围同时从"只管 subagent fan-out"扩到**会话定档 + 子代理定档 + 要不要挂 advisor**
（trigger 集里 `f5` 因此从负例翻成正例 `t11`）。

### 新增的事实面 / New facts covered

- 五档梯子 `low/medium/high/xhigh/max`，`high` 是默认且**与不传参数完全等价**
- **每个模型各自的推荐起点不同**（Opus 5→`high`；Opus 4.8/4.7 编码与 agentic→`xhigh`），
  这是最常被跨代错误沿用的一条
- 支持矩阵：Opus 4.6 / Sonnet 4.6 **没有 `xhigh`**，设了是**静默回落**不是报错
- **Agent tool 有 `model` 但没有 effort 参数** —— 要按代理钉 effort 必须走 Workflow；
  下发一个不会生效的设置要如实报 `degraded:effort-not-expressible`
- advisor：必须**至少与主模型同强**，否则静默不挂；Haiku 能*叫* advisor 但不能*当* advisor；
  切 advisor **不**作废 prompt cache，而改 model / 改 effort **会**
- Opus 5：`thinking:disabled` + `xhigh`/`max` 返 **400**；`max_tokens` 同时卡思考与正文；
  **会不请自来地自检自己的工作** → 继承自旧代的"最后加一步验证"指令要删（会导致过度验证），
  但**独立性动机**的验证者（盲评、fresh-context 红队）留着——它们防的是相关性错误，不是偷懒

### 文件变动 / Files

- 重写 `SKILL.md`（版本 1.0.0，新增 `metadata.model_baseline` 时效戳）
- 新增 `references/model-and-effort.md`、`references/orchestration.md`、`references/runtime-knobs.md`
- 删除 `references/runtime-mapping.md`（并入 runtime-knobs）
- `scripts/decide.mjs` → **`scripts/check_plan.mjs`**：不再"替你决定"，改为**校验一份方案里
  确定性可判的部分**（档位是否存在、`max_tokens` 是否抬高、thinking×effort 冲突、advisor 配对、
  缓存内 effort 变动、双旋钮同降）。是否**明智**不在脚本判断范围内——那是判断面的活。
- 重建 `evals/`：`plan-fixtures.json`（12 条行为夹具）+ `run_all.mjs` 三组
  **P** 行为 / **C** 脚本⇄文档一致性 / **L** 文本护栏，共 25 项
- 删除 `evals/cases/decision-fixtures.json`、`evals/trigger-report.json`

### 关于 C 组 / Why the consistency group exists

这个技能里**每一个数字都会随代际腐烂**，而它最典型的坏法是**只改文档、没改脚本**（或反之）。
C 组把脚本里的支持矩阵、advisor 排名、`max_tokens` 起点与 `references/` 里的表**对拴**，
任一侧单独漂移就红。25 项全部做过变异验证（逐条改坏 → 确认对应项变红），不是空转护栏。

### 实测 / Tested (2026-07-29, opus 5 · medium, 两臂)

场景：13 个子代理的 legacy API 迁移（4 扫描 / 6 改写 / 3 盲审），埋了 5 个陷阱——用户主张
"扫描只是搜索、降到 low 省 token"、全程走 Agent tool、缓存全程开、想挂 Sonnet 5 当 Opus 5 的
advisor。两臂拿**同一个场景文件**，WITHOUT 臂显式禁止读取本 skill 目录。

**判定不经 LLM 裁判**：产出是一段方案 JSON，逐条陷阱按**决策本身**机检 + 跑 `check_plan.mjs`。

| | WITH skill | 裸模型 |
|---|---|---|
| 陷阱 | **9/9** | 5/9 |

裸模型答对的（记在账上，不算被压倒）：拒绝把扫描降到 low（理由不同但成立——漏报会穿过改写和
盲审直到线上）、拒收 Sonnet advisor 并升到 Opus 5、盲审不降档、刻意保持档位一致。
它还多给了两条本 skill 没有的**任务级**建议（改写前先定统一规约；改完跑一次策略不同的独立复扫）。

裸模型答错的四条，全是**产品事实**而非判断力：
1. 不知道 **Agent tool 没有 effort 参数** —— 它照样逐个代理下发 effort，那些设置根本不会生效；
2. 以为弱 advisor 是"挂上但质量差"，实际是**静默不挂载**（于是用户会遇到"什么都没发生"却无从排查）；
3. 断言"默认 effort 即 medium"—— **默认是 `high`**；
4. 搬出了"检索型最多降一档、**下限 medium**"——这正是本版**已废止**的 v0.1.0 规则。

第 4 条尤其值得记：旧规则会以"模型的常识"形态回流。`evals` 里的 `L2-no-medium-floor` 守文档侧，
`T7` 守产出侧。

**测试反过来改了 skill 一处**：`check_plan.mjs` 对 13 个 Agent-tool 代理刷了 **13 条一模一样**的
`effort-not-expressible`。一个事实刷十三行会训练使用者直接跳过输出——已收敛成**一条**
（`P-collapse` 回归夹具钉住）。这是本轮唯一改动。

### 时效 / Staleness

`metadata.model_baseline: claude-5 family · docs read 2026-07-29`。
家族一换代，先对实时文档复核再信本技能里的任何数字，并**重扫你自己的 eval**——
不要沿用上一代的 effort 设置。这正是 v0.1.0 栽的那个跟头。
