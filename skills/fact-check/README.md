# fact-check

> 对一个事实性问题，给出快速、有出处的结论 —— 而且绝不「自信地答错」。

[English](README.en.md) · **简体中文**

**做什么** —— 分诊问题 → 并行检索多个来源 → 一旦结论被佐证就尽早收敛 → 给出带引用的 BLUF（先说结论）回答。全程限时：简单问题 ≤2 分钟，复杂问题 ≤5 分钟。

**好在哪** ——
- 全仓库唯一**速度优先**的 skill，但有一条「速度安全」铁律：禁止靠猜给出高置信答案 —— 快，但绝不confident-and-wrong。
- 并行检索 + 尽早收敛，把延迟压到最低，而不是把所有来源跑完。
- 确定性的「答案合约」校验器，保证输出结构与引用齐备。

**什么时候用** —— 「fact-check 一下」·「查一下 X / X 是不是真的」·「某个技术/名词是什么」；也可用 `/fact-check` 显式调用。
**不适用** —— 详尽的多源研究报告（→ deep-research）；主观 / 推荐类问题（「哪台笔记本适合我」）；有专属 skill 的深度评测（乐评 → album-review，音频器材 → hifi-review）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/fact-check ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
