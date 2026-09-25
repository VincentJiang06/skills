# Changelog — model-pyramid

## 1.1.0 — 2026-09-25 · 增量对齐 Opus 5.5 / Fable 5.1 / incremental alignment

v1.0.0 的事实层在 2026-09-22（Opus 5.5 成为默认 Opus，Claude Code 2.1.280）之后有几条是**方向反的**：
它说"不传 effort = `high`"，而 Opus 5.5 的默认是 `medium`；它的 `check_plan` 对不认识的模型 ID
（包括 `claude-opus-5-5` 本身）**静默放行**。本版只修事实层与检查器，两条轴的核心设计不动。

> Facts re-verified against `Philosophy/adaptations/claude5-family.md` (base 2026-09-24), the models
> overview, the Opus 5.5 / Fable 5.1 what's-new and prompting pages, the advisor-tool page (fetched
> 2026-09-25) and the Claude Code changelog through 2.1.281. Every change below names the principle it serves.

### 修正 / Fixed (each → principle)

- **每个模型的默认 effort 不同：Opus 5.5 = `medium`**，Fable 5.1 / Opus 5 / Sonnet 5 = `high`，Haiku 4.5 无；
  改为"显式写出 effort"。→ skill 自带 *Everything numeric here is dated* + KB ADC2b；A42 点版本定向结算。
- **thinking 恒开**：Opus 5.5 / Fable 5.1 / Fable 5（及 Mythos 5.x）上 `thinking:disabled` 或 `budget_tokens`
  在任何 effort 下都返 400（Opus 5 仍只在 `xhigh`/`max`）。→ ADC2b；P13（D 面只做可判定的骨架事实）。
- **`check_plan` 不再静默放行不认识的模型**：新增 `model-unknown` warning（每个不同模型一条、排在最前、
  不改退出码）；零命中文案改为"没有规则触发，不等于已验证"。→ A50（新 D 面检查只报不拦、准入三项）；
  skill 自带 "never blocks you"；P-collapse 教训（一条事实一条发现）。
- **会话实际 effort 按模型默认值推出**，替代写死的 `high`（修掉 Opus 5.5 会话上的 search-effort-cut 误报）。
  → A50 ii（误报优先，铁律 7）。
- **advisor 配对改用 API 配对表**（显式查表代替能力排名）；表外的组合（含一切 Opus 5.5 组合，U1）报
  `advisor-pairing-unverified`；错配的代码由 `advisor-weaker` 改名 `advisor-invalid-pairing`；删除过时的
  `advisor-fable-unavailable`（Claude Code 2.1.232 已重新提供 Fable 作 advisor）。→ P10（权威来自出处）。
- **agent 类型 frontmatter 可以带 `effort:`**（2.1.78 / 2.1.80 / 2.1.267）：只有裸 Agent tool 调用没有逐次
  effort；提示同时给出 Workflow `opts.effort` 与 frontmatter 两条路。→ P10。
- **看重独立性的验证者必须非 fork**（fork 自 2.1.232 默认开）：定档表同侪行 + 新报告 flag `non-fork`。
  → ADC5（fork ≠ fresh）；P12 裁决权分离。
- **长跑行**：Opus 5.5 `xhigh` 起步，缺口是能力时再换 Fable 5.1（原"Fable 5 优先"）。→ 两条轴；models overview。
- **task budget 只在 API（beta）**，Claude Code 里用 `/goal`、`maxTurns`（触顶标 partial）；Opus 5.5 的
  elapsed/budget 时长信号只是配速建议，硬停靠自己的 timeout；异步子代理省时间不省质量。→ ADC5 / ADC2b / ADC1b。
- **缓存陷阱**：改**顶层** effort 击穿缓存；per-message effort（beta）在 Opus 5.5 / Fable 5.1 / Opus 5 上保住缓存。
  → ADC2b。
- **复核触发**：由"家族换代"改为"**任何点版本或同名静默换权重** = 定向复核；换代 = 全量重扫"；
  `model_baseline` 改 A37 形式（模型 ID · effort · Claude Code 版本 · 读取日期）。→ A42、A37。
- `max_tokens`：检查器阈值仍 64k；文档同时写出 64k（迁移指南）与 128k（成本优化 / Opus 5.5 提示指南）。→ DS-1。
- "effort 不缩短正文"限定为 Opus 5 观察、5.5 未验证（U4）。Opus 5 的行为笔记标为"5.5 上的合理起点"（EX-6）。
- 输出里回显的 label 去掉 `|` 与换行，计划文本不能伪造结果行。→ P10 信任边界。

### 评测 / Evals (untracked `evals/`, snapshot in the R20 run dir)

- 新夹具 p13–p20（8 条，含叙事 3 的未知模型 / 规范化 / 别名组合夹具）；p6 期望随改名更新。
- 新检查 `P-inject`、`C6-defaults-and-thinking`（脚本 `MODELS` 表 ⇄ model-and-effort 起点表的默认值与 thinking 列）；
  C4 改指"无逐次 effort + frontmatter 可带"；L1 改查 A37 四要素（只查格式、不查年龄）。
- 误报账（铁律 7）：12 条旧夹具 + 16 个 selftest 方案 + 13-agent P-collapse 方案新旧对跑，唯一变化是
  p6 / s1 的 `advisor-weaker → advisor-invalid-pairing` 改名，零新增代码。
- 规模（含下方 battery 修复轮）：`check_plan.mjs` 197 → 255 行，`run_all.mjs` 209 → 238 行；用例**记录** 29 → 37
  （plan-fixtures 12 → 20 + trigger-cases 17，后者没有 runner、未实测，见 F15）；`run_all` **检查项** 26 → 36；
  `--selftest` 16 → 24。均在 +50% 红线内（295 / 313 / 43）。

### Battery 修复轮 / battery fix round (1 轮，instance 档；ADJUDICATION 14 条确认、0 P0/P1)

- **F06（P2）批量行与钳制自相矛盾**：批量行原写"降一层 + `low`–`medium`"，正好是钳制禁止的"两个旋钮同降"，
  selftest 还用 filter 把 `both-knobs-dropped` 藏了起来。改为"降一层 *或* 降一档 effort，二选一"，selftest 去掉 filter、
  同时覆盖两种合法写法。→ skill 自带钳制"每层只动一个旋钮"；P11 双向结算（文档与检查器说同一件事）。
- **F07（P2）+ flag 7 引文错配**："exploratory tasks … 该上 `xhigh`"与"structured-output 上 overthinking"只出现在
  effort 页的 **Opus 4.7** 表里。删掉错配引文；搜索推论保留（方向有出处：effort 低 ⇒ 工具调用少），补上 Opus 5.5 指南
  "`xhigh`/`max` 留给实测有收益的活"。→ P10（权威来自出处）。
- **F08** "effort 不是 thinking depth"与文档相反 → 改为"effort 是 thinking depth 的主旋钮，但不止于此"；能力轴补上
  "调高 effort 也试过"。→ P10；skill 自带两条轴。
- **F09 / F13 / F19（check_plan，先红后绿）**：恒开模型上 thinking 对象带 `budget_tokens` 报 `thinking-always-on`；
  advisor 配对按每个子代理自己的模型再查一遍（同一模型只报一条）；没有 effort 旋钮的模型不再额外报 `max_tokens`。
  → 文档已写明的事实由检查器承接（P11）；只是表格事实，不新增语义判断（P13）。误报账：37 个既有方案 + 31 个合法 ID
  + E11 case-3 方案，新旧对跑**零变化**。
- **F11** advisor 自己的读取可以缓存（`caching`，约 3 次调用回本）；**F12** Opus 主 + Opus advisor 是"第二意见"，
  **不是**独立校验（advisor 读完整转录）。→ P10；skill 自带"独立性验证者非 fork"。
- **F16** 用例数口径写清（记录 37 vs 检查项 36）；**F17** README / model-and-effort 标明 `evals/` 只在开发仓库、不随发布；
  **F18** 不传 effort：API = 模型默认，Claude Code 裸 Agent tool 调用 = 继承会话 effort。flag 5：Fable 5.1 从 `high`
  起就要大 `max_tokens`。
- **E11 case 2（判 lose）**：带技能的臂给 Opus 5.5 执行模型直接配了 `claude-fable-5-1` advisor——配对表里没有
  Opus 5.5 的行，API 对非法组合返 400。文字改为：没有行的执行模型**默认不挂 advisor**，试探请求成功后才加，
  不凭"至少同等强"写进生产配置。→ P10；orchestration.md 既有"invalid pair ⇒ 400"。
- **挂起（登记、不追）**：F10（缓存检查要区分 fork 与独立子代理，需新增输入字段、属检查重设计）· F14（文档配对表 ⇄
  脚本 ADVISORS 的绑定检查，属新增机械门，本档不做）· F15（trigger-cases 没有 runner，触发准确率未测——测量债）。

### 豁免登记 / Exemption register (not re-verified this wave; re-review at the next A42 event or 2 review periods)

EX-1 两条轴、搜索推论、钳制、报告格式（核心设计，未过期）· EX-2 Opus 4.x / Sonnet 4.6 / Sonnet 5 / Haiku 4.5 行 ·
EX-3 Codex 映射与通用运行时表 · EX-4 组织级 effort 钳制 · EX-5 opusplan / ultracode · EX-6 Opus 5 行为笔记 ·
EX-7 description 与 17 条触发用例未改 · EX-8 README 仍为单个双语文件（未拆 README.en.md）· EX-9 未被改动文字牵动的 C1–C5 正则。

### 驳回 / Rejected

- 未知模型报 error（会挡住合法的新点版本，违背"never blocks you"）· 日历过期门（日期不是事件）·
  Fable 5.1 并行调用退化与 Opus 5.5 自动续跑上限（审计 A1.10 子项，属 harness / loop 治理，不在本 skill 范围）·
  Opus 5.5 "已答视为定论" 提示行（A1.6 子项，不改变选型）· 检查 `thinking:"enabled"`（输入语义含糊，会误报）·
  `max_tokens` 阈值提到 128k（会给现有 64k 方案新增误报）· description 写进型号名（下一个点版本就腐烂）。

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
