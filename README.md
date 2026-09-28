# 工业级 Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · [English](README.en.md) · **简体中文**

> 给 Claude Code / Codex / 其他 agent runtime 用的 agent skills：每个都自带确定性校验器 + 红绿 eval + 一个**专门想把它弄坏**的独立测试组。小而专、范围锋利、中英双语，几乎全部由仓库自带的流水线 + 循环造出。**每个 skill 的细节看它自己文件夹里的 README。**

## 一句话速览

这里只统计 **17 个正式 skill**（2026-09-28 新增 `feynman-physics-distiller`；另有 2 个实验/旁路工具，共 19 个可安装 skill）。文末另有 `stupidskills` 附录，作为实验/旁路工具展示，**不计入 skill 个数记录**。

**成品**
- **[feynman-physics-distiller](skills/feynman-physics-distiller/)** —— 一对一中文物理辅导：从具体问题组织讲解，伴读费曼讲义，核对归因；来源地图只证明观点出处，引号必须核对本轮读到的原文。v3.1.0，candidate，无专用 API 密钥依赖。
- **[album-review](skills/album-review/)** —— 「主创署名 + 专辑名」→ 一篇 10,000–15,000 字、可溯源、覆盖每个音乐维度的中文乐评。**v0.2.0：发布门诚实化——长度门只证长度、检不出汉字重复 padding（judge-must-flag 负例登记制）+ 修补循环加上限与 escalate 出口（资料量与下限不相容属契约问题，不许靠加字过关）。**
- **[hifi-review](skills/hifi-review/)** —— 客观 HiFi 器材评价：风格由频响-对-目标得出、素质由测量得出，每条结论追溯到证据。
- **[course-study](skills/course-study/)** —— **v4.0.0 重建**：跟着老师的节奏一讲一讲伴读——顺讲义顺序、每 1–3 页一节、原话逐字引用、每个知识点三问（是什么 / 为什么 / 考试怎么考，A/B/C 证据分级）、完整推导与作业往年题演练进附录，并把新知识追加进课程文件夹的记忆库（只追加、带页码、可冷重启）；期末从记忆库统一总结。中文讲解、术语保英文。**v4.1.0**：数学公式严格约定（只用 `$…$` / 独立行 `$$`、公式内无中文与 Unicode 符号、标题不放公式、表格里不用 `|`）+ `evals/check_math.py` KaTeX 逐条解析。candidate 级：算例需自核。 **v4.2.0**：讲解面向「没听课的人」写透（五条判据、关键处真的代数走一遍）；文件头只讲这份文档的定位，证据清单移到文末；凡讲一道题先逐字抄原题；附录双向跳转链接；结构图先看渲染页再写；适量自画示意图（mermaid / ASCII）；默认平铺写进 `study/` 并服从课程本地 `SPEC.md` 的放置与命名。
- **[fact-check](skills/fact-check/)** —— 对事实性问题给出快速、有出处的 BLUF 回答（≤2 / ≤5 分钟）。
- **[humanizer-academic](skills/humanizer-academic/)** —— 重写 AI 生成的严肃文本（中 / 英 / 混合），两模式（学术 / 科普）；先判定、读着像人就不动，去 AI 痕迹同时保留体裁腔调。**v4.0.0 完成模式切分结构重建**（按模式/语言拆参考包、按需加载，常驻 −15%、常见路径约 −35%；质量守住而非跃升）。
- **[paper-writer](skills/paper-writer/)** —— 从需求（字数 / 引用风格 / 章节）和/或选题写出一篇**新的**、完整合规的论文；两条完整性铁律：绝不编造引用、绝不抄袭，查不到的来源标 `[SOURCE NEEDED]` 而非发明。
- **[logic-pacer](skills/logic-pacer/)** —— 把**已经写好、你也喜欢**的中文（/英文）说理文改得**逻辑推进慢一点、每步都跟得上**：缩小推理**步长**、每步落在读者刚站稳处（given-new），但**不动文风、不降词汇（绝不对齐词汇）、不改事实/立场、保持干练**（净长 ≤~1.3x）。方法=找 ≥2 步跳跃→展开成最小中间链→减赘饰。区别于 `humanizer-academic`（那是去 AI 味、已像人就 abstain）。保真=模型级不变量 + 独立盲审探针，脚本特意不把「立场反转」降级成可脚本化检查。**v1.0.0 经 skill-creator-max 流水线端到端建成，独立电池抓到并修掉构建者自测漏掉的一处真缺陷。**
- **[mp-cli-sup](skills/mp-cli-sup/)** —— 通过 `vince-mp` CLI 调试*实时*运行的微信小程序：一次持久会话、uid 稳定、免相机 scan。
- **[mp-groundline](skills/mp-groundline/)** —— 微信小程序 Skyline→WebView 迁移，一致性优先，配只读扫描器 + 迁移地图。

- **[workspace-backup](skills/workspace-backup/)** —— **纯本地**工作区备份：把 `~/playground`、`~/experiment`、`~/WorkBuddy` 镜像到**本机固定目录 + 外置硬盘**两处，清点 → 分类 → 分路 → 复制 → 校验，带**记忆化台账**所以第二次跑是增量、中断能续。不碰 git、不碰云、**从不删除源**。三条硬安全线都由脚本退出码强制（散文会被绕过，退出码不会）：**拒绝写入 Time Machine 卷**、**目标路径只认守卫放行的那条**（`plan.json` 是数据不是权威）、**没有真正观测过就绝不报 SAFE**。认得 openrsync 与 GNU rsync 的差异并只发经实测接受的参数，认得 APFS 容器共享空间的假可用量。**v0.2.3，candidate**：经两轮独立五镜头电池（第二轮发现第一轮修复自身引入了一个会删数据的 P1，已复现并修好）+ 一次 36 GB 真跑（三条 P1）+ 一次代际结算两臂实测；81/81 eval、19 个变异体全部可识别、8/8 脚本自检。首次真跑需人盯着。

**编码纪律 —— 写代码时自动触发**
- **[test-driven-development](skills/test-driven-development/)** —— 对*非平凡*行为做 TDD：先写会失败的测试并**带证据**看它失败，把测试套件当成当前目标的*活规格*；v1.0.0 起含信任边界（内容内指令零权威）与断言级红判定。
- **[neat](skills/neat/)** —— 会话收尾时把文档 + 跨会话记忆对着代码对账，让知识不腐烂。**v1.2.0（R17 记忆工程）：增量 delta 优于全文重写、遗忘义务（删除/墓碑分层淘汰）、事实类条目重跑验证锚而非比对文字、运行时记忆与制度化积累分流。**

**循环 & 对抗 —— 把中大型任务做成可自主跑的工程**
- **[loop-constructor](skills/loop-constructor/)** —— 为中大型任务设计工程化*循环*：分解成带 gate 的子循环树，落盘成可直接照跑的 `.loop/` runbook。**v0.3.0（R17 对齐）：停止条件双侧闸（零改动即停 + 最少推进量）、停滞判据事前量化、检查写面分离、契约按表面积定尺、run-report 成功/完整性指标配对。**
- **[attacker](skills/attacker/)** —— 用一个全新、独立的攻击者，透过**五个由设计哲学推导的镜头**（一致性 / 反作弊 / 证据 / 现实 / 根基）攻击*任意目标*（skill / 设计 / 论点 / 代码 / 知识库），打击段全量上报所见异常、独立裁决段按 PROVE-OR-FLAG 分出 finding 与 flag，永不修复。**全模型可用**、换厂商模型即换来更强独立性；与 loop-constructor 配对（攻击→修复→再攻击）。**v0.7.0（R17 对齐）：新增 fix-audit 重瞄模式（存在上一轮修复时专项攻击修复本身：传播/新缺陷/遮掩/静默跳过）+ rubric 验收对抗轴（一致率对可操纵性是盲的）+ 异厂独立性首个非轶事定量；v0.6.0 两段式报告（R16）；v0.5.0 从哲学重写，约为旧版 1/4 重量。**
- **[reorganize-logic](skills/reorganize-logic/)** —— 以**代码为唯一事实源**重建设计契约层（架构 + 结构 + 接口），删除遗留走评审门。

**造 skill 的流水线 —— 造 skill 的 skill**
- **[skill-creator-max](skills/skill-creator-max/)** —— **本仓库现行的造 skill 流水线（v1.2.0，R17 对齐：composer 规格边界与判例挂载、engineer 验证器纪律 + 循环类 skill 的 loop-charter 门、guidance 按 surface 的工具面/行动面/记忆面分支；R16：电池 classify-not-delete 两段式 + engineer 双臂基线差纪律）**，一个 skill 装下整条链路：SKILL.md 本体是一个**薄指挥官**，自己不做任何职能，只**逐角色派出全新子代理、按类型化工件把关、逐门路由**（薄常驻体 + 五个按需 role-pack + 六厂交集工件 schema + 只查结构的 L0 门 + 自含 O5 独立电池）。**完全独立运行**：`skill-philosophy` KB 只是仓库外的设计期出处，不随仓库分发、运行时不读取。已实测：端到端造出 `paper-writer`、并把 `humanizer-academic` 经流水线重建到 v4.0.0，真·逐角色新鲜上下文独立；独立电池抓到构建者自测全绿仍漏掉的真缺陷。取代已退役移除的旧四 skill 流水线（skill-conductor / skill-guidance / skill-engineer / skill-zipper；上一代冻结在 [`archive/`](archive/)）。诚实残留：跨厂商电池尚未跑。

## 当前这版的重点

这不是一堆 prompt 模板，而是一套会自己长牙的技能系统：

- **构建链路收进一个 skill。** `skill-creator-max` v1.0.0 取代旧四 skill 流水线：薄指挥官逐角色派全新子代理、只认类型化工件、确定性 L0 门 + 独立电池，spec、trigger holdout、红绿 harness 都能被重跑，不靠口头承诺。
- **循环工程分成 runtime-neutral 与 Codex-realized 两层。** `loop-constructor` 设计通用 loop；文末的 `stupidskills` 里另放一个 `loop-constructor-codex`，把角色隔离、状态落盘、并发 fan-out 映射到 `codex exec`，但不计入正式 17 个（v0.2.0 与主版同步 R17）。
- **独立性成为一等公民。** `attacker`、`reorganize-logic`、`test-driven-development` 都围绕“不要让同一个心智模型同时写答案和判答案”重做过。
- **模型/effort 选择被显式化。** 文末 `stupidskills` 里的 `model-pyramid` 不做模型购物，也不把右配伪装成省钱；它把定档收敛成**两条轴**——拿到上下文还是做错=能力缺口→换 model；跳过文件/没跑测试=彻底度缺口→换 effort——覆盖会话、每个子代理和要不要挂 advisor。
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

## stupidskills（不计入 17 个正式 skill）

这两张卡放在页面最底部，只作为轻量实验/旁路工具展示，**不计入本仓库的正式 skill 个数记录**。

- **[loop-constructor-codex](skills/loop-constructor-codex/)** —— `loop-constructor` 的 Codex CLI 变体：把同一套 loop 工程落到单 agent、多次 `codex exec`、磁盘状态和 fresh evaluator 上。
- **[model-pyramid](skills/model-pyramid/)** —— 给会话和每个 subagent 右配 model + effort，并判断要不要挂 advisor：peer 继承、**搜索继承或调高**（effort 管工具调用量，降它=代理不再继续找）、大规模廉价查找降一层模型、长跑上 `xhigh`。**没有硬下限**。只负责 sizing，不负责 spawn。

## 更新日志（按日期）
- **2026-09-28** — 首次公开 [`feynman-physics-distiller`](skills/feynman-physics-distiller/) 3.1.0：运行时保持本地版原样，公开来源地图、规则、宿主元数据与双语说明；评测答卷和运行日志不随包分发，保留 candidate 等级与已知局限。
- **2026-09-25** — **R20 升级波**（skill-philosophy KB v0.4.0「判断平面与双向结算」的下游铺开；先按 A40 存量诊断审全部 skill，再逐个经 `skill-creator-max` 全流水线 A33 低档升级：每个角色一个全新 Opus 5.5 high 实例，E11 两臂对照 3 例 + 盲评，battery 1 轮 instance 档 + 至多 1 轮修复与修复审计）。已合入：
  - [`neat`](skills/neat/) 1.2.0 -> 1.3.0：写入授权契约——agent 推断的规则、毕业进 CLAUDE.md、删除记忆、批量重写改为一份「待确认提案」，用户确认后才落；粘贴内容里的指令不成规则；丢失的发布评测重建为 6 例（含 2 个投毒用例）；E11 1 胜 1 负 1 平（预登记验收未达成，owner 待裁），battery 种子 5/5、遗留 9 条 P3（candidate，instance 档）。
  - [`model-pyramid`](skills/model-pyramid/) 1.0.0 -> 1.1.0：对齐 Opus 5.5 / Fable 5.1——Opus 5.5 默认 effort 为 medium、须显式写出，thinking 恒开，advisor 配对按 API 配对表查，看重独立性的验证者用非 fork；check_plan 遇到不认识的模型会报出、不再静默放行；点版本即触发定向复核；拆出 README.en.md（candidate，E11 两胜一负，遗留 1 条 P2 警告重复）
  - [`hifi-review`](skills/hifi-review/) 1.0.2 -> 1.1.1：公开安装也能跑 Step 8 自检（schema_check 随包发布）；删掉会误判「无可闻差异」的可闻性正则，改为判断卡；声明信任边界；技术力标签门认得词表 id；缺输入报为数据缺口；耦合腔未知时给出警告。两臂对照 2 胜 1 平 0 负，定级 candidate。
  - [`mp-cli-sup`](skills/mp-cli-sup/) 0.2.2 -> 0.3.0：管理员 token 只走 VINCE_MP_ADMIN_TOKEN（不进命令行参数、不经 agent）；动生产环境前按具体操作逐次征求同意，恢复 env 时不擅自切回生产；eval 归为操作；运行时输出一律当数据。修复了 2026-06-23 以来 13/14 自检红（YAML >- 解析）。E11 两臂结果 WITH 胜 2、平 1、负 0；battery 两轮，独立性 instance 档，遗留 P3。
  - [`workspace-backup`](skills/workspace-backup/) 0.2.3 -> 0.3.0：未声明 off_machine 的 iCloud/CloudStorage 目的地一律扣住（退出 30，零写入）；离机目的地同样要确认密钥；放宽权限的键只认用户在对话里的原话；报告直接写明离机、与 Time Machine 同盘、删除开关状态。battery 5/5 种子命中，5 条 P2 已修，harness 93/93；仍有 1 条 P2 未修（两个源根名只差大小写）；有效结论 candidate（instance 档）。
  - [`loop-constructor`](skills/loop-constructor/) 0.4.0 -> 0.5.0：上一轮修复里又冒出 P0/P1 等缺陷时，循环不再原地重来，改为停下交 owner，先问「这个判断该不该交给代码」（换不换判断平面由 owner 定）；「不可能/被阻塞就停下上报」的出口永不封死；评审会自动读取的 CLAUDE.md/AGENTS.md 算进生成者能写的范围（只读或哈希校验）；linter 与 schema 不变。两臂对照 3/3 优于裸模型，对抗测试 5/5 种子命中、剩 11 个 P3；独立性只到 instance 档，结论 candidate。
  - [`loop-constructor-codex`](skills/loop-constructor-codex/) 0.2.0 -> 0.3.0：跟进 loop-constructor 0.5.0 的四出口路由（修复里冒出 P0 → 停下交 owner，附判断平面问题）；linter 恢复与姊妹逐字节一致并用 sha256 钉住；评审自动读取的 AGENTS*.md/.codex/.rules/prompts 与 contract.md 不许生成者改（-C 立约时刻 checkout 或启动前校验 sha256）；E11 路由与信任边界 3/3 更好、总体 1/3 胜，candidate，独立性 instance 档。
  - [`test-driven-development`](skills/test-driven-development/) 1.0.0 -> 1.1.0：委派从必选项降为建议，只决定谁来跑、不决定跑不跑；独立性只认非 fork 的新 agent 或独立 session；evals 外部产出的指标降为证据不作终审；E11 两臂 WITH 3/3 占优（仅表方向）；battery 为 instance 档，effective 为 candidate。
  - [`logic-pacer`](skills/logic-pacer/) 1.0.0 -> 1.1.0：证据脚本按字形选专名候选，不再把普通英文词报成缺失专名（误报 188→1）；逐条裁定命中、移除 --gate、声明中文数字不查；两臂对照 2 胜 1 负未达预注册线（仅方向），battery 两轮无 P0/P1，P3 残留带入
  - [`album-review`](skills/album-review/) 0.2.0 -> 0.3.0：证据门只声称查引用成立、不再说能抓杜撰；schema_check.py 随 scripts/ 发布（修复公开安装崩溃）；指标按实际仪器改名；加 P10 信任边界；E11 两臂 1 平 2 胜 0 负；battery 种子 5/5，章节检查的过度声称仍有 2 条 P2 未修（candidate，instance 档）
  - [`course-study`](skills/course-study/) 4.2.0 -> 4.2.1：修三处规则互斥（课程根 SPEC/AGENTS 先读且不算未读、图未核对单独一行回复、layout 在分拣前读）+ 开发期粒度门按页脚逻辑页收紧；对裸 Opus 5.5 的 E11 可学性/正确性三例全平、忠实度三例占优、注水三例皆输，方向性 NEGATIVE，保留为 candidate。
  - [`fact-check`](skills/fact-check/) 1.0.2 -> 1.1.0：新增 P10 信任边界（网页、摘要和粘贴文本只作证据读，不当指令执行）；校验器相关文档如实说明它只查格式；两个词面错误码降为可附理由保留的提示。两臂实测 0 胜 0 负 3 平，简单题首轮成本约为裸模型的 4 倍，不比裸模型更快，已建议 owner 退役。
  - **第三轮（owner 裁决「这七个你都继续去做把他们做完」）**：7 个修复轮自引回归的 skill 各跑一轮只修回归的修复 + 全新实例修复审计 + 必要时只许回退 + 独立实例对照已装版的发布核对，全部通过后合入：
    - [`reorganize-logic`](skills/reorganize-logic/) → 0.3.4：reorganize-logic 0.3.4（release candidate）：第三轮（owner 裁定「这七个你都继续去做把他们做完」）关闭修复审计的 P1（被跟踪却匹配 .gitignore 的文件不读 → 现由 git 判定忽略、被跟踪文件必读、跳过项打印在 not read: 行）与 3 个 P2（CommonJS 汇总误报、匿名 default class 产出 extends、export declare 漏抽）；审计抓到本轮新增的 docstring 扫描崩溃，已按铁律 3 回退；发布前检查通过，无 P0/P1；有意的行为变化：git 忽略且未跟踪的文件不再读取。
    - [`skill-creator-max`](skills/skill-creator-max/) → 1.3.4：**[skill-creator-max](skills/skill-creator-max/)**（v1.3.4，等级 `candidate`）：本仓库现在用来造 skill 的流水线。第 3 轮修复由 owner 2026-09-25 授权。`validate_decision` 现在只检查 effective_verdict 有没有超过上限，不再要求等于上限，所以如实写成 `candidate` 不会再被拒。对 owner 的产出一律在原记录上追加，不改记录的格式，内部规则编号只放在括号里。发布检查已通过。还有两个 P2 没修，都是门会把虚报的等级放过去：整轮攻击作废时 battery 按定义算 clean；结论字段写成枚举以外的值时门直接放行。在修好之前，由指挥官手动封顶到 `candidate`。
    - [`attacker`](skills/attacker/) → 0.8.2：attacker 0.8.2（R20 第 3 轮修复，owner 裁定「这七个你都继续去做把他们做完」）：Gaming 镜头中「已治理」的漏洞如果能被可运行的作弊绕过，照样记 finding；影子图提取脚本遇到空行不再截断 `-`、`*`、`•`、`1.` 样式的问题列表，缩进续行也不再误报。和已安装的 0.7.0 相比只好不坏，真实语料新增误报为 0。等级为 candidate（instance 档）。已知残余 P2 未修，不是回退：空行后的 `2、`、`（2）`、`+` 等样式仍会被静默丢掉，0.7.0 同样如此。
    - [`mp-groundline`](skills/mp-groundline/) → 0.2.3：mp-groundline 0.2.3：第三轮修复（owner 授权）补齐发布——packOptions.ignore 里的已声明页面照常扫描，不再静默漏报 rewrite；默认布局提示只指向在 Skyline 上跑过的页面；另修 6 条 P3。独立修复审计无 P0/P1，发布检查通过；剩余 P3 都不比已装 0.1.1 差。
    - [`humanizer-academic`](skills/humanizer-academic/) → 4.1.1：humanizer-academic 4.1.1（发布候选，定级 candidate）：R20 增量对齐。检测判定只作提示，并移出默认路径；数字编造检查改为逐个精确比对；科普类比规则统一为一句，科普改写说明的全部示例都已合规。按 owner 裁决完成第 3 轮修复，发布检查通过，无 P0/P1。保真度 3/3 优于裸模型，人味未胜出（已记录，不阻断发布）。evals/ 的修复只在本地副本，部署需按 LOCAL-HANDOFF 携带。
    - [`paper-writer`](skills/paper-writer/) → 0.2.7：**paper-writer 0.2.7**(2026-09-25,分支 upgrade/paper-writer @ 4d433ea,状态 draft,已达发布条件):按指挥裁决 b 案(P13/S14),小写姓氏开头的条目和「年份后跟 , ; :」的叙述性年份不再判失败。它们改为 REVIEW 类:打出点明原因的行,不影响退出码,列入核查清单;独立核查者在台账里给出结论之前,台账门阻止交付。发布检查结论:每个阻断项都与已安装的 0.1.0 持平或更好,没有未关的 P0/P1,harness 42/42,脚本 484 → 482 行。独立核查者主干、核查者校准和 E11 提升判据仍未实测,所以状态仍是 draft。
  - **退役**：`fact-check` 两臂 0 胜 0 负 3 平、成本高于裸模型，自 Claude Code 安装根撤下（其他运行时仍装 1.1.0）；本机的 `find-skills`（第三方 vercel-labs 拷贝）退役。
- **2026-09-17** — [`course-study`](skills/course-study/) **v4.2.0**（经 `skill-creator-max` 全流水线，两门真实 CUHK 课程 CSCI3230 / CSCI3130 的目录副本做夹具）：讲透改为目标 + 五条判据（读者＝没听课的人，读完能复述并换数字重做例题）；文件头五行只讲定位，考试证据清单移到文末 `## 来源与证据`；例题、作业与往年题演练一律先给逐字题面块；「见附录 An」为命名锚点双向链接；新增 `rules/layout.md`（平铺 `study/`、≤48 字符命名、目录优先分拣、服从本地 SPEC/AGENTS 的放置规则）；结构图页先渲染再写「元素」；适量示意图；按 Part 交付与续写。证据：v4.1 对 v4.2 两臂盲评（Opus，每课两评委、X/Y 对调）——CSCI3230 v4.2 胜；CSCI3130 首轮在「学得会 / 正确性」两维输给 v4.1（根因：状态机图的双圈等图形记号没看渲染页），一轮 prose 修复后重跑两评委 8/8 反转；五镜头 battery 种子 5/5，两轮修复后复打 P1=0、遗留 P2×3。**评级 candidate**（独立性仅到不同模型、未做跨厂商终审；修复后未再整体复测）。
- **2026-09-14（晚）** — [`course-study`](skills/course-study/) **v4.1.0**：数学公式严格约定十一条写进 `rules/format.md`（Typora / GitHub / Obsidian 通用：只用 `$…$` 与独立行 `$$`，公式内禁中文与 Unicode 符号，标题与表格的限制，环境只在块内，KaTeX 内置宏），新增 `evals/check_math.py`（只查语法 + KaTeX 逐条解析，黄金样张 0 误报）；重生成 ESTR3108 L03 五个 Part 共 1053 个公式 0 解析错误。Typora 用户需勾选「内联公式」。
- **2026-09-14** — [`course-study`](skills/course-study/) **v4.0.0 重建**（经 `skill-creator-max` 全流水线，两门真实 CUHK 课程 CENG3420 / ESTR3108 做语料）：身份从「整门课批处理成复习笔记」改为「跟课伴读 + 课程记忆库」——四入口（跟课 / 追问 / 总结 / 重排）、每 1–3 页一节顺讲义走、原话 blockquote 逐字引用、三问 + A/B/C 考试证据分级、主体 + 附录、按 Part 切分、学科画像、排版约定、append-only 页码锚定记忆库与冷重启契约。证据：held-out 两臂盲评 WITH 11/2/5、冷重启四次核实 + 修正回写夹具两态通过、三轮 Opus battery（46+22+10 项）+ Codex 跨厂商终审（无 P1）；**评级 candidate**（学生视角 4/5，讲解层仍有行列混淆 / 来源越界类错误，README 注明算例需自核）。v3 的问卷 intake、页数分档、全课覆盖清单、`/pdf`-only 规则全部去除。
- **2026-07-31** — **R17 对齐波**（skill-philosophy KB v0.3.0「循环与图大修」的下游铺开；13 个未列名 skill 经独立审计判定无需更新，其中 4 个已是 R17 各册的现成范本）：[`loop-constructor`](skills/loop-constructor/) **v0.3.0** / [`loop-constructor-codex`](skills/loop-constructor-codex/) **v0.2.0**（双版 byte-identical 保持，69/69 与 71/71 全绿）——停止双侧闸、停滞判据事前量化、写面分离、契约定尺、遥测配对、harness 补偿件/结构件二分；[`attacker`](skills/attacker/) **v0.7.0** —— fix-audit 重瞄模式（KB 自身 battery 第二轮此透镜独立打出 4 P1 的实证）+ rubric 对抗轴 + 常驻体量同版内减重回 3000 token 线下；[`skill-creator-max`](skills/skill-creator-max/) **v1.2.0** —— C10/E12/S12/S13/A45 进 role-pack，五个 L0 门自检全绿；[`neat`](skills/neat/) **v1.2.0** —— M 系记忆生命周期四件；[`album-review`](skills/album-review/) **v0.2.0** —— 审计抓到发布门被汉字重复 padding 刷绿且退化输入被自家 eval 固化为正例，修复走 prose + 负例登记而非机械阈值（20/20 绿）；[`mp-cli-sup`](skills/mp-cli-sup/) **v0.2.2** —— 电池加固回路停止条件从单侧终态改为四支析取（converged/cap/no-progress/restart-escalate）；[`humanizer-academic`](skills/humanizer-academic/) 修一处 v4.0.0 改名遗留断链。全部修改逐条注明 KB 锚点。
- **2026-07-29** — [`model-pyramid`](skills/model-pyramid/) 从头重建为 **v1.0.0**（Claude 5 代际结算）。四条规则表换成**两条轴**：拿到上下文还是做错=能力缺口→换 model；跳过文件/没跑测试=彻底度缺口→换 effort；范围从「只管 fan-out」扩到会话 + 每个子代理 + 要不要挂 advisor。**推翻旧版两条方向错的规则**——`search → 降一档 effort` 反了（effort 管的是含工具调用在内的全部 token，降它买到的是「不再继续找」的代理），`HARD FLOOR 永不输出 low` 删除（`low` 是官方为子代理写明的合法档位）。`decide.mjs` → `check_plan.mjs`：不再替你决定，只校验确定性可判的部分（档位是否存在/静默回落、`max_tokens` 是否抬高、Opus 5 thinking×effort 返 400、advisor 配对合法性、缓存内 effort 变动）。evals 重建为 26 项三组（行为 / **脚本⇄文档一致性** / 文本护栏），逐条变异验证非空转。opus5·med 两臂实测（13 子代理迁移场景、5 个陷阱、判定不经 LLM 裁判）：**带 skill 9/9，裸模型 5/9**——裸模型判断力不差（拒绝 low、拒收弱 advisor 都对），错的四条全是产品事实：不知道 Agent tool 没有 effort 参数、以为弱 advisor 是「挂上但差」（实为静默不挂载）、断言默认 effort 是 medium（实为 `high`）、以及**把已废止的 medium 下限当常识搬了回来**。实测反过来抓到 skill 一处缺陷（13 个代理刷 13 条同样 warning）并已收敛成一条。

这些是按 git history 合并后的日级摘要，只写对技能系统有结构影响的变化。

- **2026-07-27** — 新增 [`workspace-backup`](skills/workspace-backup/) **v0.2.1**（正式 skill 计数 15 → **16**），经 `skill-creator-max` 全流水线端到端建成。**纯本地**备份（不碰 git/云），双目的地 + 记忆化增量台账。构建期实测出三条真实地形约束并写进 skill：本机 `/usr/bin/rsync` 是 **openrsync**（`-aHAX --info=progress2` 直接退 1，但 `-E` 可用且实测保住 xattr）、`/Volumes/backkkup` 上是**现役 Time Machine 备份**（硬拒写，`--force` 也不放行）、`backkkup` 与 `2TBofData` **共享同一 APFS 容器**故 `df` 的可用量是假的。两轮独立五镜头电池：首轮 67 findings/14 P1；**次轮发现首轮修复自身引入了一个会删数据的 P1**（临时文件清扫的正则匹配 `.env.production`，源文件一删或一改名，目标副本就被删）—— 由 conductor 亲自复现后修为「只报告不删除」，并加结构性护栏禁止删除调用回潮。终态 78/78 eval、19 变异体全识别、四道门 conductor 独立重跑全绿；真机冒烟含中文路径项目、记忆化二次跑 0 字节、删除安全在真实数据上通过。**诚实定级 candidate**：残余 P2/P3 未清完，首跑需人盯。
- **2026-07-26** — **R16 代际对齐**（Claude 5 家族冲击经 skill-philosophy KB v0.2.0 制度化后，下游首轮结算）：`attacker` → **v0.6.0**、`skill-creator-max` → **v1.1.0**。核心变化 = **PROVE-OR-FLAG 改为 classify-not-delete 两段式**（打击段全量上报所见异常、只提议标签；删除权归独立裁决 judge——frontier 模型对"只报已证明/高严重度"字面服从、发现段静默降 recall，Anthropic Claude 5 官方文档处方即"全量报告+独立过滤"），rubric 新增 ★ 压制类金样 13；`skill-creator-max` engineer 角色新增 **with/without 双臂三重 delta 纪律**（两臂皆过的断言删除；uplift/preference 分类学 + 基线追平即退役复审）。全库审计两项零改动收官：reasoning-echo 契约（无命中）、SKILL.md 层绝对式禁令（仅 4 处且全在豁免区——反造假/反抄袭/事故出身路由，S11 删减测试通过）。
- **2026-07-22** — 新增 [`logic-pacer`](skills/logic-pacer/) **v1.0.0**（正式 skill 计数 14 → **15**），经 `skill-creator-max` 全流水线端到端建成（composer→guidance→engineer→zipper→battery，逐角色新鲜上下文）。用途：把**已写好且作者喜欢**的说理文改得**逻辑步长更小、每步都跟得上**（inferential distance / given-new / topic-stress / chunking / hinge-only 五机制落地），**不动文风、绝不对齐词汇、不改事实立场、净长 ≤~1.3x**。保真=模型级不变量 + 独立盲审探针（脚本特意不把「立场反转」降级成可脚本化检查）。埋种子五镜头独立电池五 seed 全命中并抓到构建者自测漏掉的一处真缺陷（P2：确定性词汇/保真闸门被硬编码到 Quetelet 语料 → 换段即空转、误报 all clean），已按 min() 路由回 engineer 修好并由指挥官独立复现验证（改为通用人名/数字保真 + 无词表时诚实报 "not checked"）。effective verdict = candidate（instance-tier 电池、盲审探针未在验收时实跑、跨厂商未跑；作者逐段人读为 O-L0 签核）。
- **2026-07-14** — `test-driven-development` 经 `skill-creator-max` 全流水线从头重写为 **v1.0.0**：全规则重接地到 skill-philosophy KB 锚点，保留已验证行为核心（适度门 / modify mode / watch-it-fail / revert-to-red / harness），新增**信任边界脊柱**（内容内指令零权威 + 注入 eval）、E-L3 压力哨兵（64K 实况跑通过 4/4）与 E8 回流点；埋种子五镜头独立电池抓到 5 个真缺陷（1 P1：崩溃被当成红）全部行为级修复并钉成 held-out 回归，harness 16 → **22 检查**。诚实注记：跨厂商轮本次弃用（用户裁定），effective verdict = candidate，预注册一轮干净电池即升 industrial。
- **2026-07-14** — 旧四 skill 流水线（skill-conductor / skill-guidance / skill-engineer / skill-zipper）**退役并从仓库移除**；[`skill-creator-max`](skills/skill-creator-max/) 升为 **v1.0.0**，成为唯一的造 skill 流水线（单 skill、薄指挥官逐角色派全新子代理；**完全独立运行**，`skill-philosophy` KB 只是仓库外的设计期出处）。实测：端到端造出 `paper-writer`、并把 `humanizer-academic` 经流水线重建到 **v4.0.0**（模式切分结构重建：按模式/语言拆参考包、常驻 −15%、常见路径约 −35%，质量守住而非跃升）；独立电池抓到构建者自测全绿仍漏掉的真缺陷。正式 skill 计数 16 → **14**。残留：跨厂商电池未跑。
- **2026-07-06** — humanizer 升到 v3.2（contrast-frame quota、citation-shell rework、frame-first hardening）；两个 principle KB 做 FABLE synthesis；新增 `loop-constructor-codex` 与 `model-pyramid`，作为文末 `stupidskills` 附录，不计入正式 17 个；`model-pyramid` 把 subagent 模型/effort 选择做成可测试规则卡。
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
