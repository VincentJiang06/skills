# 工业级 Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · [English](README.en.md) · **简体中文**

> 给 Claude Code / Codex / 其他 agent runtime 用的 agent skills：每个都自带确定性校验器 + 红绿 eval + 一个**专门想把它弄坏**的独立测试组。小而专、范围锋利、中英双语，几乎全部由仓库自带的流水线 + 循环造出。**每个 skill 的细节看它自己文件夹里的 README。**

## 一句话速览

这里仍只统计 **16 个正式 skill**。文末另有 `stupidskills` 附录，作为实验/旁路工具展示，**不计入 skill 个数记录**。

**成品**
- **[album-review](skills/album-review/)** —— 「主创署名 + 专辑名」→ 一篇 10,000–15,000 字、可溯源、覆盖每个音乐维度的中文乐评。
- **[hifi-review](skills/hifi-review/)** —— 客观 HiFi 器材评价：风格由频响-对-目标得出、素质由测量得出，每条结论追溯到证据。
- **[course-study](skills/course-study/)** —— 课程材料 → 全覆盖、费曼式、可应试的复习笔记。
- **[fact-check](skills/fact-check/)** —— 对事实性问题给出快速、有出处的 BLUF 回答（≤2 / ≤5 分钟）。
- **[humanizer-academic](skills/humanizer-academic/)** —— 重写 AI 生成的严肃文本（中 / 英 / 混合），两模式（学术 / 科普）；先判定、读着像人就不动，去 AI 痕迹同时保留体裁腔调。
- **[mp-cli-sup](skills/mp-cli-sup/)** —— 通过 `vince-mp` CLI 调试*实时*运行的微信小程序：一次持久会话、uid 稳定、免相机 scan。
- **[mp-groundline](skills/mp-groundline/)** —— 微信小程序 Skyline→WebView 迁移，一致性优先，配只读扫描器 + 迁移地图。

**编码纪律 —— 写代码时自动触发**
- **[test-driven-development](skills/test-driven-development/)** —— 对*非平凡*行为做 TDD：先写会失败的测试，把测试套件当成当前目标的*活规格*。
- **[neat](skills/neat/)** —— 会话收尾时把文档 + 跨会话记忆对着代码对账，让知识不腐烂。

**循环 & 对抗 —— 把中大型任务做成可自主跑的工程**
- **[loop-constructor](skills/loop-constructor/)** —— 为中大型任务设计工程化*循环*：分解成带 gate 的子循环树，落盘成可直接照跑的 `.loop/` runbook。
- **[attacker](skills/attacker/)** —— 用一个全新、独立的攻击者，透过**五个由设计哲学推导的镜头**（一致性 / 反作弊 / 证据 / 现实 / 根基）攻击*任意目标*（skill / 设计 / 论点 / 代码 / 知识库），只记已证实、可复现的破坏，永不修复。**全模型可用**、换厂商模型即换来更强独立性；与 loop-constructor 配对（攻击→修复→再攻击）。**v0.5.0 从哲学重写，约为旧版 1/4 重量。**
- **[reorganize-logic](skills/reorganize-logic/)** —— 以**代码为唯一事实源**重建设计契约层（架构 + 结构 + 接口），删除遗留走评审门。

**造 skill 的流水线 —— 造 skill 的 skill（v2）**

四阶段流水线，**门禁本身是可执行脚本**：每个阶段自校验用的脚本，就是 conductor 把关时重跑的同一个脚本——builder 与 gatekeeper 共用一把尺，抄错命令的空间为零。
- **[skill-conductor](skills/skill-conductor/)** —— 端到端驱动 guidance → engineer → zipper；门禁直接跑阶段脚本，最终验收 `min(复审, 独立测试组)` 防注水，sibling 名前缀容忍（repo 名与装机名通吃）。
- **[skill-guidance](skills/skill-guidance/)** —— 审计 skill/仓库、产出 handoff spec，并用 `validate_spec.mjs` 自 gate（7 支柱、评分↔状态、verdict vs cap、缺口→动作全查）；三种 disposition（交互规划 / 管道规划 / 审计），审计写 `post-build-audit.json` 不覆写构建 spec。
- **[skill-engineer](skills/skill-engineer/)** —— 从 spec 红-绿-重构构建并测试，用 `validate_report.mjs` 自 gate（P0/对抗清单 join、**harness 当场重跑**、红日志校验）；trigger_eval 3 次投票 + held-out 防过拟合；行为类 skill 的红阶段 = 无技能基线；发布前安全 lint。
- **[skill-zipper](skills/skill-zipper/)** —— 为 token 效率、可靠性、触发准确度无损重构；带可移植性清单（开放标准 6 字段核 vs Claude-Code-only 字段）与对齐 2026 的描述指南。

> 想让 Opus 持续把 principle KB 与这条流水线追到生态最新，见 [`skills/skill-guidance/skill-principle/UPDATE.md`](skills/skill-guidance/skill-principle/UPDATE.md)（含承重数字的 Fact Registry + 质量杆）。上一代 v1 冻结在 [`archive/`](archive/)。

**下一代（草案，不计入正式 16 个）**
- **[skill-creator-max](skills/skill-creator-max/)** —— 把上面五个职能收进**一个** skill：SKILL.md 本体是一个**薄指挥官**，自己不做任何职能，只**逐角色派出全新子代理、按类型化工件把关、逐门路由**。扎根 `skill-philosophy` 三层哲学 KB（每条规则引锚点；该 KB 为**仓库外本地**资产，不随仓库分发——role-pack 已把规则操作化并内联锚点，运行时不依赖它）；薄常驻体 + 五个按需 role-pack（只进被派子代理上下文）+ 五份六厂交集工件 schema + 只查结构的 L0 门 + 自含的 O5 独立电池（从 vince-attacker 五镜头蒸馏，高风险改派不同厂商攻击者）。用**编排解构**关掉旧四 skill 的坑（跨 skill 交接摩擦、同作者相关性、臃肿、绿而错、渐近电池误编、触发/移植）。**v0.1.0-draft**：一次 dogfood 真造小 skill 端到端过全部 L0 门、trigger holdout 0/12 误触；但每角色真独立性与跨厂商电池尚未演练 → 自评 `candidate` 而非 `industrial`，暂不部署、不取代已装的四 skill。

## 当前这版的重点

这不是一堆 prompt 模板，而是一套会自己长牙的技能系统：

- **构建链路已经 v2 化。** guidance / engineer / conductor / zipper 现在共用可执行 gate，spec、build report、trigger eval、held-out、red log 都能被重跑，不靠口头承诺。
- **循环工程分成 runtime-neutral 与 Codex-realized 两层。** `loop-constructor` 设计通用 loop；文末的 `stupidskills` 里另放一个 `loop-constructor-codex`，把角色隔离、状态落盘、并发 fan-out 映射到 `codex exec`，但不计入正式 16 个。
- **独立性成为一等公民。** `attacker`、`reorganize-logic`、`test-driven-development` 都围绕“不要让同一个心智模型同时写答案和判答案”重做过。
- **模型/effort 选择被显式化。** 文末 `stupidskills` 里的 `model-pyramid` 不做模型购物，也不把右配伪装成省钱；它只在 subagent fan-out 时把工作难度映射成一行可审计的 `rule=<id> tier=<tier> effort=<notch>`。
- **知识库随 skill 走。** `skill-principle` 和 `loop-principle` 都内置到对应 skill，不再要求用户知道旁路复制关系。

## 安装

推荐用 **[skills.sh](https://github.com/vercel-labs/skills)**（`skills` CLI），自动发现仓库里所有 skill 并装入 `~/.claude/skills/`（或项目内 `.agents/skills/`）：

```bash
npx skills add VincentJiang06/skills      # 交互式勾选要装的 skill
```

手动方式：`cp -R skills/<name> ~/.claude/skills/`。本仓库里的公开 skill 名不带 `vince-` 前缀；如果你在本机维护私有镜像，装到 `~/.claude/skills/vince-<name>` 或 `~/.agents/skills/vince-<name>` 也可以，但要同步改 `SKILL.md` 里的 `name` 与显式调用词。

**依赖与「装全」注意事项：**
- **运行时**：`node`（≥18）跑 `.mjs` 校验器、`python3` 跑 `.py` 脚本。**两者都只用标准库 —— 无需 `npm install` / `pip install`。**
- **两个 principle KB 现在随对应 skill 一起安装。** `loop-principle/` 内置在 [`skills/loop-constructor/loop-principle/`](skills/loop-constructor/loop-principle/)；`skill-principle/` 内置在 [`skills/skill-guidance/skill-principle/`](skills/skill-guidance/skill-principle/)。选择安装 `loop-constructor` 或 `skill-guidance` 时，知识库会作为该 skill 的子目录一起带上。
- **流水线全功能安装**：`skill-engineer` 与 `skill-conductor` 复用 `skill-guidance/skill-principle/`，所以跑完整 guidance → engineer → conductor 流水线时，请一并安装 `skill-guidance`。不用再把两个 KB 额外拷到 agent home 的同级目录。
- **`mp-cli-sup`** 还需要 [`tools/vince-mp-cli/`](tools/vince-mp-cli/)（Node CLI）。
- 想一次拿全（skills + 两个 KB + CLI），直接 `git clone` 整个仓库最省事。

装好后用自然语言提问，Claude Code 按描述自动触发；也可 `/<skill-name>` 显式调用：

```
> 查一下：埃菲尔铁塔夏天会变高吗？        # → fact-check
```

## 怎么用：几个例子

这些 skill 最常组合使用。下面是几条典型路径 + 一句话示范提示词。

**① 造一个新 skill（端到端）** —— 用 `skill-conductor` 把想法变成工业级 skill；它内部驱动 guidance（审计+定范围）→ engineer（红绿构建）→ zipper（压缩）→ 最终验收（接入 `attacker` 防注水）。
```
> 用 skill-conductor 把这个想法做成工业级 skill：一个把会议纪要转成行动项清单的 skill，要能溯源到原文。
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
- **让 conductor 驱动，别手搓流水线。** guidance 定范围、engineer 红绿构建、zipper 压缩、最终验收用 `min(复审, 独立测试组)` 把关 —— 这套比「我看着行」可靠得多。
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
skills/skill-guidance/skill-principle/       # 内置 skill principle KB，随 skill-guidance 一起安装（含 UPDATE.md 更新 runbook）
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
6. **自我构建、自我验证。** 仓库里几乎每个 skill 都由自带的流水线（`skill-conductor`）+ 循环（`loop-constructor`）造出，扎根两个自校验的知识库。这条流水线本身也一并带上了。

## 已知局限（坦诚）

工程化的诚实要求把没堵死的也写出来 —— 这正是「闭环会骗人」的延伸：

- **验证是渐近的，不是证明。** 独立对抗组每轮仍可能再揪出一个「绿但错」；我们在堵死所有「已证实」的漏洞后收手，而非宣称完美（如 humanizer v3.1 的留出集攻击「2 轮全 clean」= 预算内无可证破坏，≠ 证明无误）。
- **两个知识库体量较大，但会随对应 skill 一起安装**（见[安装](#安装)）。这是有意取舍：牺牲一点安装体积，换取用户一键安装后即可获得完整检索、模板、清单和自校验。
- **conductor 的「attacker 须在复审通过后才触发」是约定 + 不变量校验，尚未运行时硬联锁。** 由规则文本 + `min(复审, 测试组)` 不变量保证，尚未做成硬性机器门（后续项）。
- **guidance 的上下文充分性探测器是「种子」，不是「裁判」。** 触发提问的关键词探测两个方向都可能被骗；按设计由 agent 对「实质内容」的判断作最终裁判，但并非确定性堵死。
- **loop-constructor 的 D6 节奏（完成度优先 / 迭代优先）是「指南」，非 linter 强制。** 设计可声称一种节奏却配反的旋钮 —— linter 抓不到，由 fresh-reader 的 cadence 框 + maker/checker 把关。
- **流水线对「性能/质量类」升级，最终验收可由更强的留出集攻击代替完整 conductor 复审**（humanizer v3.1 即如此）—— 这是有意的工程取舍，已如实记录，非偷工。
- **trigger 精度依赖可用的真实运行时。** 当本机没有可认证 CLI 时，部分 trigger_eval 会用 live judge panel 代替，并在报告里标清楚；这算可用证据，不伪装成 canonical CLI 结果。

## stupidskills（不计入 16 个正式 skill）

这两张卡放在页面最底部，只作为轻量实验/旁路工具展示，**不计入本仓库的正式 skill 个数记录**。

- **[loop-constructor-codex](skills/loop-constructor-codex/)** —— `loop-constructor` 的 Codex CLI 变体：把同一套 loop 工程落到单 agent、多次 `codex exec`、磁盘状态和 fresh evaluator 上。
- **[model-pyramid](skills/model-pyramid/)** —— fan-out 前给每个 subagent 右配模型层级 + reasoning effort：peer 保持、search 降 effort、大规模廉价查找降一层模型，永远守住 medium floor。只负责 sizing，不负责 spawn。

## 更新日志（按日期）

这些是按 git history 合并后的日级摘要，只写对技能系统有结构影响的变化。

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
