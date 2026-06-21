# 工业级 Agent Skills

![工业级 Agent Skills](assets/cover.png)

> 给 Claude Code 用的 agent skills：自带合约、校验器与 eval 套件 —— 上线前先被一个独立评审「往死里挑」，而不是自测绿了就算。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · [English](README.en.md) · **简体中文**

大多数 agent skill 只是「一段 prompt + 一份侥幸」。这些 skill 是当软件来造的：每个都有一个确定性校验器、
一套红绿 eval 循环，以及一个**专门想把它弄坏**的独立新 agent 测试组。小而专、范围锋利、中英双语（其中数个
中文优先）。拿去改，改成你自己的。

## 一句话速览

每个 skill 一句话 —— 详细写法（含每个 skill 的「好在哪」）见下方[逐个说明](#逐个说明)。

**成品**
- **[album-review](skills/album-review/)** —— 由「主创署名 + 专辑名」产出一篇 10,000–15,000 字、可溯源、覆盖每个音乐维度的中文乐评。
- **[hifi-review](skills/hifi-review/)** —— 客观 HiFi 器材评价：换能器风格由频响-对-目标得出、源头器材素质由测量得出，每条结论都追溯到证据。
- **[course-study](skills/course-study/)** —— 把一门课的材料变成全覆盖、费曼式、可应试的复习笔记。
- **[fact-check](skills/fact-check/)** —— 对事实性问题给出快速、有出处的 BLUF 回答，限时 ≤2 分钟（简单）/ ≤5 分钟（复杂）。
- **[humanizer-academic](skills/humanizer-academic/)** —— 重写 AI 生成的严肃文本（中 / 英 / 混合），两种模式（学术论文 / 严肃科普）；先判定、读着像人就不动（治误伤），去 AI 痕迹同时保留各自体裁腔调。
- **[low-visibility-fix](skills/low-visibility-fix/)** —— 审计现场移动 UI（低光、眩光、戴手套），交回可直接落地的修复方案文档；绝不改目标本身（prove-or-flag：能证明才报，解析不了就标记交人判，绝不杜撰默认值）。
- **[mp-cli-sup](skills/mp-cli-sup/)** —— 通过 `vince-mp` CLI 调试*实时*运行的微信小程序 —— 一次持久会话、元素 uid 稳定、免相机 scan。
- **[mp-groundline](skills/mp-groundline/)** —— 把微信小程序从 Skyline 渲染器迁到 WebView，一致性优先，配只读扫描器 + 迁移地图（保留 workaround，绝不回退）。

**编码纪律 —— 写代码时自动触发**
- **[test-driven-development](skills/test-driven-development/)** —— 对*非平凡*行为做 TDD：先写会失败的测试，把测试套件当成当前目标的*活规格*。
- **[neat](skills/neat/)** —— 会话收尾时把文档 + 跨会话 agent 记忆对着代码对账，让知识不腐烂。
- **[loop-constructor](skills/loop-constructor/)** —— 为中大型 agent 任务设计工程化*循环* —— 分解成带 gate 的子循环树 —— 并写出可直接照跑的 `.loop/` runbook。
- **[reorganize-logic](skills/reorganize-logic/)** —— 以**代码为唯一事实源**，从零重建项目的设计契约层（架构图 + 结构图 + 接口定义），删除遗留走评审门。

**造 skill 的流水线 —— 造 skill 的 skill**
- **[skill-conductor](skills/skill-conductor/)** —— 带防注水最终验收地驱动 guidance → engineer → zipper 全程。
- **[skill-guidance](skills/skill-guidance/)** —— 审计 skill/仓库（打分、定范围、找缺口）并产出 schema 校验的 handoff spec。
- **[skill-engineer](skills/skill-engineer/)** —— 从该 spec 构建并测试 skill，红-绿-重构，配独立测试组。
- **[skill-zipper](skills/skill-zipper/)** —— 为 token 效率、可靠性与触发准确度无损重构现有 skill。

## 快速开始

```bash
npx skills add VincentJiang06/skills        # 选择要安装的 skill
```

直接从本仓库拉取（基于 [skills.sh](https://github.com/vercel-labs/skills)），自动发现所有 skill 并装入 `.claude/skills/` 或 `.agents/skills/`。手动方式：`cp -R skills/<name> ~/.claude/skills/`（项目内则拷到 `<你的仓库>/.claude/skills/`）。

之后直接用自然语言提问，Claude Code 会按描述自动触发；也可用 `/<skill-name>` 显式调用：

```
> 查一下：埃菲尔铁塔夏天会变高吗？               # → fact-check
```

## 凭什么不一样

五条原则，都是把每个 skill 造出来时踩出来的。

### 1. 要证据，不要感觉
验证不了的 skill 就是信不过的 skill。每个都带一个**确定性校验器**（`check_review.py`、`check_answer.mjs`、
`fact_lint.mjs`……）和一套 eval，测试先行。与 8 个顶级公开 skill 仓库对标后，这套在「机器可读的合约 +
确定性证明」上领先。

### 2. 闭环会骗人
skill 自己的测试会在它仍然错着的时候亮绿灯 —— *默认就是「绿而错」*。所以每个 skill 都要面对一个
**对构建规则一无所知的、独立的新 agent 测试组**。它在*每一个* skill 里都抓出了自测漏掉的真 bug
（humanizer 5 个、company-background 两轮、fact-check 四轮）。humanizer 更进一步：成败由一个盲审判定，
而不是「数我删了几个套路」。

### 3. 准确 ≫ 速度
粗暴的分桶和固定枚举会把每个边缘情况都贴错标签 ——*「分三派还不如不分」*。skill 用**丰富的逐项描述符 +
运行时判断**来分类，而不是一套硬分类法。唯一刻意的例外是 `fact-check`（设计上速度优先）——
即便如此，它也绝不「自信地答错」。

### 4. 范围锋利，绝不蔓延
「功能越多越好」是个陷阱；多出来的机械结构是摩擦，不是价值。每个 skill 只把**一件事做好**。
course-study 刻意砍掉了刷题、间隔重复和 Anki 导出，只做一个干净的复习工具。瘦的 `SKILL.md`、
渐进式披露、低常驻开销。

### 5. 每个结论都有凭证
模型会靠编造来填空。这里，来源可追溯是**机器校验**的（backing JSON 把每条 `claim` 映射到它的
`evidence`），「评测共识」绝不被包装成「测量背书」，材料不足的输入**诚实降级**（资料不足）而非杜撰，
构建过程也**绝不假装通过** —— 宁可停在诚实的「candidate」，也不谎称「industrial」。

## 全部由流水线造出，而非手写

大多数 skill 集都是一份份手写的。**这里每个 skill 都由一条四阶段流水线产出 —— 而且仓库把这条流水线本身也一并带上。**
这是我最自豪的部分。

![造 skill 的流水线：想法 → ① guidance → ② engineer → ③ zipper，由 ④ conductor 的复审循环包住，产出一个已认证、可发布的 skill](assets/pipeline.png)

每个箭头都是一份**机器可读的合约** —— 上一阶段的强类型产物，正是下一阶段的输入。这买来了手写 `SKILL.md` 给不了的四样东西：

- **每一阶段都有证明** —— 确定性 eval、无损 diff + token 增量，以及一个真正*运行*该 skill、与基线对比的 `trigger_eval`，而非「我看着还行」。
- **无法给自己注水** —— conductor 以 `min(复审, 独立测试组)` 验收，把出问题的那一阶段打回，过不了线就**诚实停下**（`stopped_unmet`），绝不假装通过。
- **领先于同类** —— 与 8 个顶级公开 skill 仓库对标，这套在「机器可读合约 + 确定性证明」上领先；没有谁产出可被程序消费的 handoff spec。
- **自我构建、自我验证** —— 仓库里每个 skill 都由这条流水线、在一个自校验的知识库 [`develop-principle/`](develop-principle/) 上造出。

用 **[skill-conductor](skills/skill-conductor/)** 跑完整条循环，或自己驱动任一阶段。

## 逐个说明

每个 skill：**做什么** + **好在哪**。

### 成品 skill

- **[album-review](skills/album-review/)** —— 由「主创署名 + 专辑名」产出一篇 10,000–15,000 字的中文乐评，覆盖每个音乐维度。**好在哪：** 确定性字数 + 曲风自适应校验；每条事实都追溯到来源；古典区分作品与演绎并要求参考录音比较；冷门专辑诚实降级，绝不杜撰。
- **[hifi-review](skills/hifi-review/)** —— 客观的 HiFi 器材评价，两条轨：换能器（量感 + 风格，由频响-对-目标得出）与源头器材（测量素质 + 系统匹配）。**好在哪：** 带耦合腔感知的频响分析（711 ≠ 5128）+ 峰谷扫描；「共识 ≠ 测量」的防注水门；媒体名单动态判断而非分桶。
- **[course-study](skills/course-study/)** —— 把课程材料（讲义、提纲或课程名）变成全覆盖、费曼式、可应试的笔记。**好在哪：** 强制完整性（覆盖清单 → 对账）；每个概念都有费曼块（白话 → 直觉 → 形式 → 例题 → 误区）；刻意精简。
- **[fact-check](skills/fact-check/)** —— 对一个事实性问题给出快速、有出处的回答：分诊 → 并行检索 → 尽早收敛 → BLUF，限时 ≤2 分钟（简单）/ ≤5 分钟（复杂）。**好在哪：** 唯一速度优先的 skill，但有「速度安全」规则禁止靠猜给出高置信答案；确定性答案合约校验器。
- **[humanizer-academic](skills/humanizer-academic/)** —— 重写 AI 生成的严肃文本（中 / 英 / 混合），**两种模式**：学术论文 与 严肃科普。**好在哪：** **先判定、能不动就不动**（读着像人就原样返回 —— 治好「过度修改」的误伤）；模式决定保留什么腔调、什么才算 AI 痕迹（设问/类比在科普是手艺、在论文是失格；数据三连/「significant」/编号小节在论文是常态、不是 AI 痕迹）；检测器重做成**低误报的「水货」探测器 + 诊断盘**（不是 AI 分类器 —— 真实数据校准证明现代严肃 AI 与人类文本在正则/统计特征上重叠），真正的判官是独立盲审。真实语料 eval（27 篇真人 + 20 篇 AI）：**人类文本 0/27 被过度修改或杜撰，AI 文本 16/20 被判定改善，0 杜撰**。
- **[low-visibility-fix](skills/low-visibility-fix/)** —— 审计现场移动 UI（低光、眩光、戴手套）并交回一套可直接落地的修复方案文档；绝不改目标本身。**好在哪：** 分析器重做为 **PROVE-OR-FLAG**——只在能从已解析值**证明**阈值违例时才报 finding，凡是解析不了的值（未声明背景、相对字号无父链、gap、嵌套 @media、UA 默认控件尺寸……）一律落成带原因的 `needs_judgment`，**绝不静默漏报、绝不杜撰默认值**（旧版会默认白底而算错对比度）；阈值两档清楚标注（critical=低于 WCAG / major=现场加严的工程建议，非标准）；7 个已验证 bug 各有单测兜底（单测 27/27、run_all 39/39），并在真实小程序页面上做过真实性检验 + 独立对抗性验证。
- **[mp-cli-sup](skills/mp-cli-sup/)** —— 通过 `vince-mp` CLI 调试*实时*运行的微信小程序。**好在哪：** 一次持久会话 → 复用连接的瞬时命令、元素 uid 跨调用稳定；免相机 scan；真正的 `doctor`（tsc + .js 新鲜度）；按 requestId 关联前后端错误。
- **[mp-groundline](skills/mp-groundline/)** —— 把微信小程序从 Skyline 渲染器迁移到 WebView，一致性优先。**好在哪：** 翻转渲染器并**保留** workaround（绝不回退），配只读扫描器 + 生成的 MIGRATION-MAP 文档；经 5 轮工程师 × 4 组新鲜测试硬化（抓出 11 个潜伏 bug，含 markdown 注入 + CSS url 注释吞噬）。

### 编码纪律

日常工程纪律 —— 在你写代码时自动触发。

- **[test-driven-development](skills/test-driven-development/)** —— 对*非平凡*行为做测试驱动开发：先写或改一个会失败的测试，按「功能组」看它失败一次，再写最小实现使其通过 —— 测试套件是当前目标的*活规格*。**好在哪：** 一个有判别力的「适度门」治好过度触发（只在真逻辑 / 改 bug / 改已测行为时介入；重命名、配置常量、抛弃式试验、生成代码、纯文档一律跳过）；一个**修改模式**优先改 / 合并 / 删除而非新增（一个功能组一个测试，绝不增殖）；把清点、跑测试、扫陈旧测试派给 subagent。再加上一层**反作弊执行门**（同类里独一份）：红/绿/完成的论断必须附上真实命令 + 输出（禁「应该过」）；每个 bug 修复都要 **revert-to-red**（改完回退掉补丁、确认测试重新变红，证明回归测试不是空壳）；Beck 三策略让 GREEN 最小化。配套**真夹具 eval**（pytest + vitest 8 场景，确定性评分器自动回退生产代码并断言新测试变红 —— 16/16，证明评分器能区分「真 TDD」与「作弊」）。
- **[neat](skills/neat/)** —— 会话收尾时对知识库做洁癖级清理：把文档（CLAUDE.md/AGENTS.md、README、docs/）与跨会话 agent 记忆对着代码对账，让知识不腐烂 —— 跨平台（Claude Code / Codex / OpenCode / OpenClaw）。**好在哪：** 一个确定性的防膨胀/防腐烂 linter（`kb_audit.mjs`）把「同步完成」卡在机器可校验的硬证据上 —— MEMORY.md 字节/行数上限、相对时间泄漏、记忆-对-文档的体量倒挂、索引死链；一个 记忆→文档 的「毕业」阀门防索引膨胀；瘦编排型 SKILL.md（16.6% 常驻，其余按需）。
- **[loop-constructor](skills/loop-constructor/)** —— 为一个你想让 AI agent (半)自主完成的**中大型**任务设计它的工程化*循环* —— **把任务分解成一棵带各自 gate 的子循环树**（每段都是一个扁平循环，自带机器可验证 DoD + 可运行 check + 上限，用 `depends_on` 连接、无环）：每段合适的循环模式（retry / plan-execute-verify / explore-narrow / review / human-in-the-loop）、让每个 gate 闭合的反馈信号、停止与升级条件、人类位置、maker/checker、harness 构件与风险护栏 —— 产出一份填好的、可机器校验的循环设计，**并落盘为项目里一份可直接照跑的 `.loop/` runbook**。**好在哪：** 机制重做为 **SELECT → FILL → VERIFY → PERSIST**，核心是一套**可操作的选择程序 D0–D5**（是不是循环 → 在哪分段[接缝测试] → 每段模式+检查 → 自主度 → 并行 → 护栏），把「凭感觉定 altitude」换成可复核的推导，并产出一份**决策日志**（selection_log）；一个确定性 linter（`lint_loop_design.mjs`）**拒绝任何没有可运行检查的设计**（循环工程 ≈ 验证工程，逐段成立），外加一个渲染器：linter 不过就拒绝写出 runbook；一份**新手复读清单**专抓 linter 看不见的空壳检查（断言结果而非代理、grep 要抓未跟踪文件、soak 要量化试验数）；只设计循环、绝不运行；扎根 [`loop-principle/`](loop-principle/) 知识库。真实任务 eval（6 个真实编码任务，独立评审）：**6/6 lint 通过、6/6 有决策日志、6/6 被判定可直接照跑，分解与自主度均 5/5**。
- **[reorganize-logic](skills/reorganize-logic/)** —— 当项目文档烂到「增量同步不值得」时，以**代码为唯一事实源**从零重建**设计契约层**：把旧契约压成只读 context（绝不复制），重新推导出架构图 + 结构图 + 明确接口定义，过时遗留只在人工评审门后删除。**好在哪：** 一个确定性、语言无关的门（`verify_contracts.mjs`）把每个文档化接口绑到真实 `file:line`、并证明没有「被识别的导出形式」被悄悄漏掉 —— 对模糊的近名匹配只**标记**交 agent 复核而非盖章放行（杜绝「绿但错」）；与 [neat](skills/neat/) 区分：后者是*增量同步*文档，而非推倒重建。

### 造 skill 的流水线

造 skill 的 skill —— 用 conductor 跑整条循环，或单独调任一阶段。

- **[skill-conductor](skills/skill-conductor/)** —— 带质量门循环地驱动 guidance → engineer → zipper 全程。**好在哪：** 防注水的最终验收（`min(re-audit, battery)`）；回退到出问题的那一阶段；绝不假装通过。
- **[skill-guidance](skills/skill-guidance/)** —— 审计一个 skill/仓库（打分、定范围、找缺口）并产出经 schema 校验的 handoff spec。**好在哪：** 扎根 `develop-principle` 知识库的 7 支柱就绪度评分；机器可消费的合约。
- **[skill-engineer](skills/skill-engineer/)** —— 从该 spec 构建并测试 skill，红-绿-重构。**好在哪：** 确定性脚本 eval + 变异抽查 + 一个用 `claude -p` 跑真实触发率的 `trigger_eval`。
- **[skill-zipper](skills/skill-zipper/)** —— 为 token 效率、可靠性与触发准确度重构现有 skill。**好在哪：** 无损 diff + token 增量证明；「描述何时用、而非工作流」的评分表；对已经干净的 skill 拒绝瞎改。

方法论底座 —— 两个 agent-first、自我校验的知识库：**[`develop-principle/`](develop-principle/)**（打造工业级 skill）与 **[`loop-principle/`](loop-principle/)**（工程化 agent 循环，是 `loop-constructor` 的底座）。

## 目录结构

```
skills/             # 开箱即用的 skill（各一个文件夹，含各自 README）
develop-principle/  # 驱动流水线的 agent-first 知识库
loop-principle/     # loop engineering 的 agent-first 知识库（驱动 loop-constructor）
tools/vince-mp-cli/ # mp-cli-sup 驱动的 Node CLI
```

## 致谢

方法论借鉴了更广的 Agent Skills 生态 —— Anthropic 的 [skills](https://github.com/anthropics/skills)（规范 +
`skill-creator`）与 obra 的 [superpowers](https://github.com/obra/superpowers)。

## 许可证

[MIT](LICENSE) © 2026 Vince Jiang。可自由使用、修改、再分发。
