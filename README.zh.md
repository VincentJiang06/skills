# 工业级 Agent Skills

> 给 Claude Code 用的 agent skills：自带合约、校验器与 eval 套件 —— 上线前先被一个独立评审「往死里挑」，而不是自测绿了就算。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) · [English](README.md) · **简体中文**

大多数 agent skill 只是「一段 prompt + 一份侥幸」。这些 skill 是当软件来造的：每个都有一个确定性校验器、
一套红绿 eval 循环，以及一个**专门想把它弄坏**的独立新 agent 测试组。小而专、范围锋利、中英双语（其中数个
中文优先）。拿去改，改成你自己的。

## 快速开始

```bash
cp -R skills/fact-check ~/.claude/skills/    # 单个 skill（全部则用 skills/*）
```

之后直接用自然语言提问，Claude Code 会按描述自动触发；也可用 `/<skill-name>` 显式调用：

```
> 查一下：埃菲尔铁塔夏天会变高吗？               # → fact-check
```

项目内使用？改为拷到 `<你的仓库>/.claude/skills/`。

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

```text
想法 / 现有 skill
 └─▶ ① guidance   审计 · 定范围 · 按 7 支柱评就绪度   → 经 schema 校验的 handoff spec
     └─▶ ② engineer   测试先行地构建（红 → 绿 → 重构）· 用 `claude -p` 验真实触发   → build report
         └─▶ ③ zipper   以无损 diff + token 增量为证压缩 · 已经干净的 skill 绝不瞎改
             └─▶ ④ conductor   包住 ①–③：循环、复审结果、把最弱的一阶段打回重做
```

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
- **[humanizer-academic](skills/humanizer-academic/)** —— 重写学术文本（中 / 英 / 混合），去掉 AI 写作痕迹同时保留学术腔。**好在哪：** 在三个层面去信号（词汇 + 结构 + 统计/突发度），而非一张词表；并补上定义清晰的纹理（立场、具体性、变化 —— 绝不口语化、绝不杜撰）；检测器只检测，成败交独立盲审。
- **[low-visibility-fix](skills/low-visibility-fix/)** —— 审计现场移动 UI（低光、眩光、戴手套）并交回一套可直接落地的修复方案文档；绝不改目标本身。**好在哪：** 确定性分析器 + 有界视觉走查；可只锁定单页做廉价复跑；审计与落地清晰分离。
- **[mp-cli-sup](skills/mp-cli-sup/)** —— 通过 `vince-mp` CLI 调试*实时*运行的微信小程序。**好在哪：** 一次持久会话 → 复用连接的瞬时命令、元素 uid 跨调用稳定；免相机 scan；真正的 `doctor`（tsc + .js 新鲜度）；按 requestId 关联前后端错误。

### 造 skill 的流水线

造 skill 的 skill —— 用 conductor 跑整条循环，或单独调任一阶段。

- **[skill-conductor](skills/skill-conductor/)** —— 带质量门循环地驱动 guidance → engineer → zipper 全程。**好在哪：** 防注水的最终验收（`min(re-audit, battery)`）；回退到出问题的那一阶段；绝不假装通过。
- **[skill-guidance](skills/skill-guidance/)** —— 审计一个 skill/仓库（打分、定范围、找缺口）并产出经 schema 校验的 handoff spec。**好在哪：** 扎根 `develop-principle` 知识库的 7 支柱就绪度评分；机器可消费的合约。
- **[skill-engineer](skills/skill-engineer/)** —— 从该 spec 构建并测试 skill，红-绿-重构。**好在哪：** 确定性脚本 eval + 变异抽查 + 一个用 `claude -p` 跑真实触发率的 `trigger_eval`。
- **[skill-zipper](skills/skill-zipper/)** —— 为 token 效率、可靠性与触发准确度重构现有 skill。**好在哪：** 无损 diff + token 增量证明；「描述何时用、而非工作流」的评分表；对已经干净的 skill 拒绝瞎改。

方法论底座：**[`develop-principle/`](develop-principle/)** —— 一个用于打造工业级 skill 的 agent-first 知识库。

## 目录结构

```
skills/             # 开箱即用的 skill（各一个文件夹，含各自 README）
develop-principle/  # 驱动流水线的 agent-first 知识库
tools/vince-mp-cli/ # mp-cli-sup 驱动的 Node CLI
experiments/        # 研究 / A-B 对照材料，非成品
docs/               # 内部设计文档与 skill 分析
```

## 致谢

方法论借鉴了更广的 Agent Skills 生态 —— Anthropic 的 [skills](https://github.com/anthropics/skills)（规范 +
`skill-creator`）与 obra 的 [superpowers](https://github.com/obra/superpowers)。

## 许可证

[MIT](LICENSE) © 2026 Vince Jiang。可自由使用、修改、再分发。
