# 工业级 Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · [English](README.en.md) · **简体中文**

> 给 Claude Code / Codex / 其他 agent runtime 用的 agent skills：每个都自带确定性校验器 + 红绿 eval + 一个**专门想把它弄坏**的独立测试组。小而专、范围锋利、中英双语，几乎全部由仓库自带的流水线 + 循环造出。**每个 skill 的细节看它自己文件夹里的 README。**

## 一句话速览

这里只统计 **15 个正式 skill**（2026-07-22 起：新增 `logic-pacer`；2026-07-14 起：旧四 skill 流水线退役移除，`skill-creator-max` 与 `paper-writer` 计入）。文末另有 `stupidskills` 附录，作为实验/旁路工具展示，**不计入 skill 个数记录**。

**成品**
- **[album-review](skills/album-review/)** —— 「主创署名 + 专辑名」→ 一篇 10,000–15,000 字、可溯源、覆盖每个音乐维度的中文乐评。
- **[hifi-review](skills/hifi-review/)** —— 客观 HiFi 器材评价：风格由频响-对-目标得出、素质由测量得出，每条结论追溯到证据。
- **[course-study](skills/course-study/)** —— 课程材料 → 全覆盖、费曼式、可应试的复习笔记。
- **[fact-check](skills/fact-check/)** —— 对事实性问题给出快速、有出处的 BLUF 回答（≤2 / ≤5 分钟）。
- **[humanizer-academic](skills/humanizer-academic/)** —— 重写 AI 生成的严肃文本（中 / 英 / 混合），两模式（学术 / 科普）；先判定、读着像人就不动，去 AI 痕迹同时保留体裁腔调。**v4.0.0 完成模式切分结构重建**（按模式/语言拆参考包、按需加载，常驻 −15%、常见路径约 −35%；质量守住而非跃升）。
- **[paper-writer](skills/paper-writer/)** —— 从需求（字数 / 引用风格 / 章节）和/或选题写出一篇**新的**、完整合规的论文；两条完整性铁律：绝不编造引用、绝不抄袭，查不到的来源标 `[SOURCE NEEDED]` 而非发明。
- **[logic-pacer](skills/logic-pacer/)** —— 把**已经写好、你也喜欢**的中文（/英文）说理文改得**逻辑推进慢一点、每步都跟得上**：缩小推理**步长**、每步落在读者刚站稳处（given-new），但**不动文风、不降词汇（绝不对齐词汇）、不改事实/立场、保持干练**（净长 ≤~1.3x）。方法=找 ≥2 步跳跃→展开成最小中间链→减赘饰。区别于 `humanizer-academic`（那是去 AI 味、已像人就 abstain）。保真=模型级不变量 + 独立盲审探针，脚本特意不把「立场反转」降级成可脚本化检查。**v1.0.0 经 skill-creator-max 流水线端到端建成，独立电池抓到并修掉构建者自测漏掉的一处真缺陷。**
- **[mp-cli-sup](skills/mp-cli-sup/)** —— 通过 `vince-mp` CLI 调试*实时*运行的微信小程序：一次持久会话、uid 稳定、免相机 scan。
- **[mp-groundline](skills/mp-groundline/)** —— 微信小程序 Skyline→WebView 迁移，一致性优先，配只读扫描器 + 迁移地图。

**编码纪律 —— 写代码时自动触发**
- **[test-driven-development](skills/test-driven-development/)** —— 对*非平凡*行为做 TDD：先写会失败的测试并**带证据**看它失败，把测试套件当成当前目标的*活规格*；v1.0.0 起含信任边界（内容内指令零权威）与断言级红判定。
- **[neat](skills/neat/)** —— 会话收尾时把文档 + 跨会话记忆对着代码对账，让知识不腐烂。

**循环 & 对抗 —— 把中大型任务做成可自主跑的工程**
- **[loop-constructor](skills/loop-constructor/)** —— 为中大型任务设计工程化*循环*：分解成带 gate 的子循环树，落盘成可直接照跑的 `.loop/` runbook。
- **[attacker](skills/attacker/)** —— 用一个全新、独立的攻击者，透过**五个由设计哲学推导的镜头**（一致性 / 反作弊 / 证据 / 现实 / 根基）攻击*任意目标*（skill / 设计 / 论点 / 代码 / 知识库），只记已证实、可复现的破坏，永不修复。**全模型可用**、换厂商模型即换来更强独立性；与 loop-constructor 配对（攻击→修复→再攻击）。**v0.5.0 从哲学重写，约为旧版 1/4 重量。**
- **[reorganize-logic](skills/reorganize-logic/)** —— 以**代码为唯一事实源**重建设计契约层（架构 + 结构 + 接口），删除遗留走评审门。

**造 skill 的流水线 —— 造 skill 的 skill**
- **[skill-creator-max](skills/skill-creator-max/)** —— **本仓库现行的造 skill 流水线（v1.0.0）**，一个 skill 装下整条链路：SKILL.md 本体是一个**薄指挥官**，自己不做任何职能，只**逐角色派出全新子代理、按类型化工件把关、逐门路由**（薄常驻体 + 五个按需 role-pack + 六厂交集工件 schema + 只查结构的 L0 门 + 自含 O5 独立电池）。**完全独立运行**：`skill-philosophy` KB 只是仓库外的设计期出处，不随仓库分发、运行时不读取。已实测：端到端造出 `paper-writer`、并把 `humanizer-academic` 经流水线重建到 v4.0.0，真·逐角色新鲜上下文独立；独立电池抓到构建者自测全绿仍漏掉的真缺陷。取代已退役移除的旧四 skill 流水线（skill-conductor / skill-guidance / skill-engineer / skill-zipper；上一代冻结在 [`archive/`](archive/)）。诚实残留：跨厂商电池尚未跑。

## 当前这版的重点

这不是一堆 prompt 模板，而是一套会自己长牙的技能系统：

- **构建链路收进一个 skill。** `skill-creator-max` v1.0.0 取代旧四 skill 流水线：薄指挥官逐角色派全新子代理、只认类型化工件、确定性 L0 门 + 独立电池，spec、trigger holdout、红绿 harness 都能被重跑，不靠口头承诺。
- **循环工程分成 runtime-neutral 与 Codex-realized 两层。** `loop-constructor` 设计通用 loop；文末的 `stupidskills` 里另放一个 `loop-constructor-codex`，把角色隔离、状态落盘、并发 fan-out 映射到 `codex exec`，但不计入正式 14 个。
- **独立性成为一等公民。** `attacker`、`reorganize-logic`、`test-driven-development` 都围绕“不要让同一个心智模型同时写答案和判答案”重做过。
- **模型/effort 选择被显式化。** 文末 `stupidskills` 里的 `model-pyramid` 不做模型购物，也不把右配伪装成省钱；它只在 subagent fan-out 时把工作难度映射成一行可审计的 `rule=<id> tier=<tier> effort=<notch>`。
- **知识库随 skill 走 —— 或干脆不需要。** `loop-principle` 内置在 `loop-constructor` 里随装随走；新流水线 `skill-creator-max` 则**运行时不依赖任何 KB**（`skill-philosophy` 是仓库外的设计期出处）。

## 安装

推荐用 **[skills.sh](https://github.com/vercel-labs/skills)**（`skills` CLI），自动发现仓库里所有 skill 并装入 `~/.claude/skills/`（或项目内 `.agents/skills/`）：

```bash
npx skills add VincentJiang06/skills      # 交互式勾选要装的 skill
```

手动方式：`cp -R skills/<name> ~/.claude/skills/`。本仓库里的公开 skill 名不带 `vince-` 前缀；如果你在本机维护私有镜像，装到 `~/.claude/skills/vince-<name>` 或 `~/.agents/skills/vince-<name>` 也可以，但要同步改 `SKILL.md` 里的 `name` 与显式调用词。

**依赖与「装全」注意事项：**
- **运行时**：`node`（≥18）跑 `.mjs` 校验器、`python3` 跑 `.py` 脚本。**两者都只用标准库 —— 无需 `npm install` / `pip install`。**
- **`loop-principle` KB 随 skill 一起安装**：内置在 [`skills/loop-constructor/loop-principle/`](skills/loop-constructor/loop-principle/)，选择安装 `loop-constructor` 时作为子目录一起带上。
- **造 skill 流水线零外部依赖**：`skill-creator-max` 自含 role-pack / schema / 门脚本，**运行时不需要任何 KB 在场**（`skill-philosophy` KB 是仓库外的设计期出处，不随仓库分发）。
- **`mp-cli-sup`** 还需要 [`tools/vince-mp-cli/`](tools/vince-mp-cli/)（Node CLI）。
- 想一次拿全（skills + KB + CLI），直接 `git clone` 整个仓库最省事。

装好后用自然语言提问，Claude Code 按描述自动触发；也可 `/<skill-name>` 显式调用：

```
> 查一下：埃菲尔铁塔夏天会变高吗？        # → fact-check
```

## 怎么用：几个例子

这些 skill 最常组合使用。下面是几条典型路径 + 一句话示范提示词。

**① 造一个新 skill（端到端）** —— 用 `skill-creator-max` 把想法变成工业级 skill；薄指挥官逐角色派全新子代理跑 composer（决策规格）→ guidance（结构契约）→ engineer（红绿构建）→ zipper（压缩）→ O5 独立电池验收。
```
> 用 skill-creator-max 把这个想法做成工业级 skill：一个把会议纪要转成行动项清单的 skill，要能溯源到原文。
```

**② 为中大型任务设计循环** —— 用 `loop-constructor` 先把任务分解成带 gate 的子循环，落盘 `.loop/` runbook，再照着跑。
```
> /loop-constructor 给「把这个 500 文件的库从 Flow 迁到 TypeScript」设计一个分段 loop，重点是每步可回滚、可验证。
```

**③ 改进一个已有 skill 的性能（loop + attacker）** —— 设计一个 perf-uplift loop（baseline → 诊断 → 改进 → 留出集攻击 → 上线），conductor 驱动构建，`attacker` 在留出集上验证「真的变好、没过拟合、没回归」。（本仓库的 humanizer v3.1 就是这么升级的：整篇完成度 4.0→4.83，留出集攻击两轮全 clean。）
```
> /loop-constructor 设计一个 loop 来提升 <skill> 的性能，并接入 attacker 做留出集对抗验证；然后执行到收敛。
```

**④ 对抗性验证 / 红队** —— 用 `attacker` 攻击任意产品的可观测行为，或红队一个方案。
```
> 用 attacker 攻击 <skill/feature> 的可观测行为，scope = 输入解析 + 边界，记录已证实可复现的破坏。
```

**⑤ 会话收尾 / 让知识不腐烂** —— `neat` 把文档 + 记忆对着代码对账；`reorganize-logic` 在文档烂到不值得增量同步时推倒重建。

## 实践建议（开发 skill 时的小 tips）

踩出来的经验，做新 skill 时照着省事：

- **先想清楚「什么 check 能证明它做好了」，再设计。** 循环工程 ≈ 验证工程 —— 没有可运行的 check 就不是循环。让 `loop-constructor` 的 linter 帮你拒掉空壳设计。
- **让 `skill-creator-max` 的指挥官驱动，别手搓流水线。** composer 定规格、guidance 定契约、engineer 红绿构建、zipper 压缩、独立电池验收 —— 每个角色一个全新子代理、只认类型化工件，这套比「我看着行」可靠得多。
- **把 `attacker` 当成「闭环会骗人」的执行臂。** skill 自己的测试默认「绿而错」；务必让一个对构建规则一无所知的新 agent 在**留出集**（不是训练语料）上攻击，证明它泛化、没过拟合。
- **改进前先冻结标尺。** 想提升某个指标，先把 eval（语料 + 评分标尺）做硬、做到能区分好坏，再动 skill —— 别一边改标尺一边改被测物。先建 baseline 再改。
- **当心「饱和的指标」。** 如果 baseline 一上来就接近满分，多半是用例太容易 / 评分太松 —— 加更难的用例（长文、边界、混合语言）+ 更严的判官，露出真正的提升空间。
- **指标被结构性卡住时，重定向到你真正在乎的东西 —— 但要透明，别松门。** 把 gate 对准真实目标（如「整篇完成度」而非被短样本拖累的均值），写清楚理由；绝不为了「过」而偷偷放宽。
- **加功能要 FP-safe。** 让某步更激进（比如更主动地「加东西」）时，把它**门控在已有的保守闸后面**（如 humanizer 的「先判定、像人就不动」），改动只在确实该动时才生效 —— 再用留出集攻击证明样本外不误伤。
- **诚实地停。** 验证是渐近的，不是证明。堵死所有「已证实」的漏洞后收手，宁可如实标 `candidate` / `stopped_unmet`，也别谎称 `industrial`。
- **描述写「何时用 + 何时不用」，不写工作流；并守住 1024 字上限。** 触发准确度靠 discriminate（vs 邻近 skill / 反例），不靠堆词。

## 目录结构

```
skills/                                      # 开箱即用的 skill（各一个文件夹，含各自 README —— 细节看那里）
skills/skill-creator-max/                    # 现行造 skill 流水线（薄指挥官 + role-pack + schema + 门脚本，自含）
skills/loop-constructor/loop-principle/      # 内置 loop engineering KB，随 loop-constructor 一起安装
tools/vince-mp-cli/                          # mp-cli-sup 驱动的 Node CLI
tools/deploy_pipeline_skills.mjs             # 把 pipeline / 全量 skill 部署到本地安装（vince- 前缀，逐字节校验）
.loop/                                       # loop-constructor 产出的可照跑 runbook（各任务一份 + 攻击/电池记录）
eval_exchange/                               # 本地 builder / evaluator 交接协议与样例 session
archive/                                     # 冻结的旧版本（如 pipeline v1）；不可安装、不维护
```

## 设计哲学（凭什么不一样）

几条原则，都是把这些 skill 一个个造出来、再用循环反复打磨之后踩实的。

1. **要证据，不要感觉。** 验证不了的 skill 就是信不过的 skill。每个都带确定性校验器 + eval，测试先行。循环工程 ≈ 验证工程：**先定「什么 check 证明它做好了」，再倒推设计**。流水线更进一步——**门禁是可执行脚本，不是散文**：阶段自检与 conductor 把关跑同一个脚本，规则改一处、两处同步，杜绝「文档说一套、执行另一套」（v1 里 shipped 的示例 spec 违反自家规则数周无人察觉，正是散文门禁的下场）。
2. **闭环会骗人。** skill 自己的测试会在它仍错着时亮绿灯 —— 默认「绿而错」。所以每个都要面对一个对构建规则一无所知的**独立新 agent 测试组**（`attacker`），在留出集上攻击。它在*每一个* skill 里都揪出过自测漏掉的真 bug。成败由独立判官定，而非「数我删了几个套路」。
3. **准确 ≫ 速度。** 粗暴分桶把每个边缘情况贴错标签。用**丰富的逐项描述符 + 运行时判断**分类，而非硬枚举。唯一刻意例外是 `fact-check`（速度优先）—— 但它也绝不「自信地答错」。
4. **范围锋利，绝不蔓延。** 「功能越多越好」是陷阱。每个 skill 只把**一件事做好**：瘦 `SKILL.md`、渐进披露、低常驻开销。
5. **每个结论都有凭证。** 来源可追溯是机器校验的；材料不足就**诚实降级**而非杜撰；构建过程**绝不假装通过**。
6. **自我构建、自我验证。** 仓库里几乎每个 skill 都由自带的流水线（现为 `skill-creator-max`，早期版本用已退役的四 skill 流水线）+ 循环（`loop-constructor`）造出。这条流水线本身也一并带上了。

## 已知局限（坦诚）

工程化的诚实要求把没堵死的也写出来 —— 这正是「闭环会骗人」的延伸：

- **验证是渐近的，不是证明。** 独立对抗组每轮仍可能再揪出一个「绿但错」；我们在堵死所有「已证实」的漏洞后收手，而非宣称完美（如 humanizer v3.1 的留出集攻击「2 轮全 clean」= 预算内无可证破坏，≠ 证明无误）。
- **两个知识库体量较大，但会随对应 skill 一起安装**（见[安装](#安装)）。这是有意取舍：牺牲一点安装体积，换取用户一键安装后即可获得完整检索、模板、清单和自校验。
- **`skill-creator-max` 的跨厂商（模型级）电池尚未跑过。** 迄今所有电池轮都是同族模型的实例级独立 —— 这是流水线剩下的唯一独立性缺口，自评 strong-candidate / 1.0 时已如实注记。
- **loop-constructor 的 D6 节奏（完成度优先 / 迭代优先）是「指南」，非 linter 强制。** 设计可声称一种节奏却配反的旋钮 —— linter 抓不到，由 fresh-reader 的 cadence 框 + maker/checker 把关。
- **流水线对「性能/质量类」升级，最终验收可由更强的留出集攻击代替完整 conductor 复审**（humanizer v3.1 即如此）—— 这是有意的工程取舍，已如实记录，非偷工。
- **trigger 精度依赖可用的真实运行时。** 当本机没有可认证 CLI 时，部分 trigger_eval 会用 live judge panel 代替，并在报告里标清楚；这算可用证据，不伪装成 canonical CLI 结果。

## stupidskills（不计入 14 个正式 skill）

这两张卡放在页面最底部，只作为轻量实验/旁路工具展示，**不计入本仓库的正式 skill 个数记录**。

- **[loop-constructor-codex](skills/loop-constructor-codex/)** —— `loop-constructor` 的 Codex CLI 变体：把同一套 loop 工程落到单 agent、多次 `codex exec`、磁盘状态和 fresh evaluator 上。
- **[model-pyramid](skills/model-pyramid/)** —— fan-out 前给每个 subagent 右配模型层级 + reasoning effort：peer 保持、search 降 effort、大规模廉价查找降一层模型，永远守住 medium floor。只负责 sizing，不负责 spawn。

## 更新日志（按日期）

这些是按 git history 合并后的日级摘要，只写对技能系统有结构影响的变化。

- **2026-07-22** — 新增 [`logic-pacer`](skills/logic-pacer/) **v1.0.0**（正式 skill 计数 14 → **15**），经 `skill-creator-max` 全流水线端到端建成（composer→guidance→engineer→zipper→battery，逐角色新鲜上下文）。用途：把**已写好且作者喜欢**的说理文改得**逻辑步长更小、每步都跟得上**（inferential distance / given-new / topic-stress / chunking / hinge-only 五机制落地），**不动文风、绝不对齐词汇、不改事实立场、净长 ≤~1.3x**。保真=模型级不变量 + 独立盲审探针（脚本特意不把「立场反转」降级成可脚本化检查）。埋种子五镜头独立电池五 seed 全命中并抓到构建者自测漏掉的一处真缺陷（P2：确定性词汇/保真闸门被硬编码到 Quetelet 语料 → 换段即空转、误报 all clean），已按 min() 路由回 engineer 修好并由指挥官独立复现验证（改为通用人名/数字保真 + 无词表时诚实报 "not checked"）。effective verdict = candidate（instance-tier 电池、盲审探针未在验收时实跑、跨厂商未跑；作者逐段人读为 O-L0 签核）。
- **2026-07-14** — `test-driven-development` 经 `skill-creator-max` 全流水线从头重写为 **v1.0.0**：全规则重接地到 skill-philosophy KB 锚点，保留已验证行为核心（适度门 / modify mode / watch-it-fail / revert-to-red / harness），新增**信任边界脊柱**（内容内指令零权威 + 注入 eval）、E-L3 压力哨兵（64K 实况跑通过 4/4）与 E8 回流点；埋种子五镜头独立电池抓到 5 个真缺陷（1 P1：崩溃被当成红）全部行为级修复并钉成 held-out 回归，harness 16 → **22 检查**。诚实注记：跨厂商轮本次弃用（用户裁定），effective verdict = candidate，预注册一轮干净电池即升 industrial。
- **2026-07-14** — 旧四 skill 流水线（skill-conductor / skill-guidance / skill-engineer / skill-zipper）**退役并从仓库移除**；[`skill-creator-max`](skills/skill-creator-max/) 升为 **v1.0.0**，成为唯一的造 skill 流水线（单 skill、薄指挥官逐角色派全新子代理；**完全独立运行**，`skill-philosophy` KB 只是仓库外的设计期出处）。实测：端到端造出 `paper-writer`、并把 `humanizer-academic` 经流水线重建到 **v4.0.0**（模式切分结构重建：按模式/语言拆参考包、常驻 −15%、常见路径约 −35%，质量守住而非跃升）；独立电池抓到构建者自测全绿仍漏掉的真缺陷。正式 skill 计数 16 → **14**。残留：跨厂商电池未跑。
- **2026-07-06** — humanizer 升到 v3.2（contrast-frame quota、citation-shell rework、frame-first hardening）；两个 principle KB 做 FABLE synthesis；新增 `loop-constructor-codex` 与 `model-pyramid`，作为文末 `stupidskills` 附录，不计入正式 16 个；`model-pyramid` 把 subagent 模型/effort 选择做成可测试规则卡。
- **2026-07-14** — 新建 `skill-philosophy` 三层哲学 KB（principle→guideline→rule，五本 C/S/E/Z/O 系；**仓库外本地**资产，不随仓库分发）+ 下一代 [`skill-creator-max`](skills/skill-creator-max/) **v0.1.0-draft**：把 composer/guidance/engineer/zipper/conductor 五职能收进**一个薄指挥官 skill**（逐角色派全新子代理、只认类型化工件、逐门把关），扎根该 KB。dogfood 真造小 skill 过全部 L0 门（判别性自测全绿）、trigger holdout 0/12 误触；诚实注记：一 agent 分饰全角色、跨厂商电池未跑 → 自评 candidate，暂不部署、不取代已装四 skill。
- **2026-07-14** — `attacker` 从头重写为 **v0.5.0**：以新建的 skill-design 哲学知识库为根，把机制压到极简（fork 新脑子 → 一个镜头 → 只留能证明的），换成**五镜头固定轮转** + SEED 反假阴性门 + 确定性影子地图提取；**全模型可用**成为设计约束零，换厂商模型即换更强独立性；删掉 `rules/` / `agents/` / 多个 `.mjs` 装置，总重量约为旧版 1/4。诚实注记：塑造它的每一轮都是同族 `instance` 级攻击，跨厂商验收测试尚未跑。
- **2026-07-02** — skill-building pipeline 升到 v2：G/E gate 可执行化、audit disposition、held-out trigger eval、portable zipper；v1 pipeline 冻结进 `archive/`；新增本地 `eval_exchange` 协议；`attacker` / `loop-constructor` / `reorganize-logic` / `test-driven-development` 做 independence-family 更新。
- **2026-06-25** — `skill-principle` 和 `loop-principle` 内嵌到对应 skill，安装时随 skill 一起走。
- **2026-06-24** — 为 ClawHub/SkillHub 发布同步 `.clawhubignore` 与版本信息。
- **2026-06-23** — 全仓做 zipper pass：压缩 always-loaded SKILL.md、把细节搬到 `rules/` / `references/`；humanizer v3.1 性能提升完成；attacker 进入 0.3.x；loop-constructor 加 D6 cadence；README 重写成现在的使用者入口。
- **2026-06-22** — `mp-cli-sup` 经过 8 轮 adversarial hardening，收敛到 0.2.0；新增 `attacker` 并开始把“独立攻击组”变成标准验收环节。
- **2026-06-21** — `loop-constructor` 重构为 SELECT→FILL→VERIFY；`test-driven-development` 加 anti-gaming gates；humanizer 拆成 academic / popsci 两模式并引入 abstain-first。
- **2026-06-20** — README 默认中文，所有主要 skill 补齐中英双语 README；公开仓库去掉 `vince-` 前缀。
- **2026-06-18** — 新增 staged `loop-constructor`、`reorganize-logic`；`vince-mp` CLI 加 camera-less scan；README 增加一行速览。
- **2026-06-15** — 新增 `loop-principle` KB + `loop-constructor`；新增 `neat` 文档/记忆同步 skill。
- **2026-06-11** — `test-driven-development` 重做触发边界、modify mode 和 subagent delegation；KB source density 提升。
- **2026-06-05** — 仓库重组为公开 release 形态；接入 `skills.sh` 安装路径；新增 `mp-groundline`；`vince-mp` 进入 persistent-session + doctor/scan/logs 工作流。

## 致谢

方法论借鉴了更广的 Agent Skills 生态 —— Anthropic 的 [skills](https://github.com/anthropics/skills)（规范 + `skill-creator`）与 obra 的 [superpowers](https://github.com/obra/superpowers)；安装基于 vercel-labs 的 [skills.sh](https://github.com/vercel-labs/skills)。

`neat` skill 由 [@KKKKhazix](https://github.com/KKKKhazix)（卡兹克）的 [neat-freak（洁癖）](https://github.com/KKKKhazix/khazix-skills#-neat-freak%E6%B4%81%E7%99%96) 修改而来（MIT 许可）。

## 许可证

[MIT](LICENSE) © 2026 Vince Jiang。可自由使用、修改、再分发。
