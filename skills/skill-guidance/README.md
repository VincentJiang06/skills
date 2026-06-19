# skill-guidance

> 给一个 skill 打分、定范围、找缺口 —— 并产出下一阶段可直接吃的 handoff spec。

[English](README.en.md) · **简体中文**

**做什么** —— 评估一个 Claude Code skill 或 skill 仓库：打分、定范围、找缺口 —— 并产出一份给 `skill-engineer` 用的、经 schema 校验的 handoff spec。它是 skill 流水线的第 1 阶段（规划 / 审计），只评估，不写实现。

**好在哪** ——
- 一张扎根 `develop-principle` 知识库的 **7 支柱就绪度评分表**，判断 skill 是否「工业级」、缺什么、缺多少。
- 产物是机器可消费的**合约**（schema 校验），第 2 阶段 `skill-engineer` 可直接吃，不靠口头交接。
- 每条判断都引自 KB，而非凭记忆 —— 评分有据，缺口落到具体可执行的动作上。

**什么时候用** —— 「这个 skill 好不好 / 够不够工业级」·「帮我打分 / 审计 / 定范围」·「构建前先看看这个 SKILL.md / 仓库」；也可用 `/skill-guidance` 显式调用。
**不适用** —— 实现 / 写代码（→ skill-engineer）；token 重构（→ skill-zipper）；空白脚手架（→ skill-creator）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/skill-guidance ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
