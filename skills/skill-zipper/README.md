# skill-zipper

> 无损地重构一个现有的 skill —— 在不改变行为的前提下，让它更省 token、更可靠、触发更准。

[English](README.en.md) · **简体中文**

**做什么** —— 为 token 效率、可靠性与触发准确度，无损地重构一个现有的 Claude Code skill：精简体量、理顺结构、收紧含糊的规则、修好触发，全程不改变它的行为。

**好在哪** ——
- **无损 diff + token 增量证明**：改了哪些、省了多少，全部可量化 —— 不是「感觉变短了」，而是脚本验证的结果。
- 一张「**描述何时该用、而不是把工作流塞进描述**」的评分表，专治触发不准。
- 对已经干净的 skill **拒绝瞎改** —— 不为重构而重构，不制造无谓的 churn。
- **v2.0：可移植性清单** —— 开放标准 6 字段核 vs Claude-Code-only 扩展字段逐一判定；描述指南对齐 2026 双上限（可移植 1024 / CC 列表 1536）与全安装共享的列表预算；新增 H11（裸 ALWAYS/NEVER → 规则+理由）。

**什么时候用** —— skill 太长 / 需要拆分降 token · 规则含糊 · 触发不准或不触发 · 想做一次结构审计；也可用 `/skill-zipper` 显式调用。
**不适用** —— 从零创建 skill（→ skill-creator）；跨多次运行衡量输出质量；与 skill 无关的写作 / 编辑。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/skill-zipper ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
