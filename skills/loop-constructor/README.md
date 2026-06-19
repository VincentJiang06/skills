# loop-constructor

> 为你想让 AI agent (半)自主完成的中大型任务，设计它的工程化*循环* —— 而且只设计，绝不执行。

[English](README.en.md) · **简体中文**

**做什么** —— 把任务分解成一棵带各自 gate 的子循环树（每段是一个扁平循环，自带机器可验证的 DoD + 可运行 check + 上限，用 `depends_on` 连接、无环），并落盘为项目里一份可直接照跑的 `.loop/` runbook。它只设计循环、不执行。

**好在哪** ——
- **反向设计** —— 从「什么 check 能证明这件事做完了」倒推（循环工程 ≈ 验证工程）。
- 一个确定性 linter（`lint_loop_design.mjs`）拒绝任何没有可运行检查的设计；渲染器对被拒的设计拒绝写出 runbook —— 写出的 `.loop/` 文档本身就是「通过」的证明。
- 扎根 `loop-principle/` 知识库：引用节点 id、复用其模板/清单，绝不另起炉灶。

**什么时候用** —— 「该怎么给 X 设计一个循环」·「设计一个 agent loop」·「搭一个自主 / 自运行的 agent 工作流」；也可用 `/loop-constructor` 显式调用。
**不适用** —— 「帮我改写这段 prompt」/ 单次 prompt 工程（不是循环设计）；「现在真的把这个循环跑起来 / 把功能做出来」（它只设计、不执行）；「给 loop-principle 加个节点」/ 改知识库（KB 编写，超范围）；非 agent / 非循环或领域问题（乐评 / 音频 / 课程 → 对应 skill）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/loop-constructor ~/.claude/skills/`）。

完整说明见 [SKILL.md](SKILL.md)。
