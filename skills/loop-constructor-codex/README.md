# loop-constructor-codex

> 为你想让 AI agent（半）自主完成、并用 **OpenAI Codex CLI** 执行的中大型任务，设计它的工程化*循环* —— 只设计，绝不执行。

[English](README.en.md) · **简体中文**

**做什么** —— 与姊妹技能 [`loop-constructor`](../loop-constructor/) 相同：把任务分解成一棵带各自 gate 的子循环树（每段是一个扁平循环，自带机器可验证的 DoD + 可运行 check + 上限，用 `depends_on` 连接、无环），并落盘为可直接照跑的 `.loop/` runbook。区别只在于循环的各个角色落到 **Codex** 上：每个角色一个独立的 `codex exec` 进程。

**Codex 映射** —— 三个角色 = 三次独立的 `codex exec`（评审是只拿到 diff + 立约时那份契约的全新 `read-only` 进程；契约与评审读的指令文件同属受保护面，生成者不可改）；每次 `codex exec` 都是新上下文，所以持久状态全在磁盘上（`.loop/`、账本、`contract.md`、`codex resume` 时先重读磁盘）；`large` 扇出 = 多个并发 `codex exec` 进程、各占一个 git worktree。细节见 [`references/codex-runtime.md`](references/codex-runtime.md)。落盘的 runbook 带一段 **"How to run this loop (Codex CLI)"** 前言。

**0.3.0（跟进姊妹技能 0.5.0）** ——
- **修复里冒出的缺陷会让循环停下**：若上一轮修复里又冒出 P0/P1 缺陷（或修复区膨胀超 50%、同类缺陷修满 2 轮等），循环停下交给 owner，不再原地重来；owner 先问「这个判断到底该不该交给代码」——要不要换判断平面（re-plane）由 owner 决定，循环自己不能选。路由顺序固定为 escalate → re-plane → loopback → restart，先命中者生效；「任务不可能或被阻塞 → 停下上报」这条出口永不封死。`codex-runtime.md` 的操作步骤改为逐条对应这套规则，不再有自己的一套（旧句「只在契约错时上报」已删）。
- **评审读到的指令文件不能由生成者改**：全新的 `codex exec` 仍会自动读取各级 `AGENTS.md`、`AGENTS.override.md`、`.codex/`、execpolicy 规则、memories 和 `.loop/prompts/`。`--sandbox read-only` 只限制评审能写什么，管不了它把什么当指令。所以评审要么用 `-C` 从一份指令文件与契约时刻一致的 checkout 启动，要么启动前校验这些文件的 sha256；有改动就当 diff 数据给评审看，绝不执行；两样都没做，就如实写 `L-i incomplete`。
- **Codex 事实重新盖戳**：「codex-cli 0.144.4 本机观察，2026-09-25」——hooks、multi_agent 都是 stable 且开启，memories 为 experimental 且开启。仍规定每个角色一个独立进程（进程内 multi_agent 的隔离性未验证）；`--ephemeral` 等隔离开关存在，但效果未实测，不拿来当控制手段。
- **Harness 双向结算**：每逢模型或 codex-cli 发版，既删掉模型已能自己做的部分，也把该版本已知的失败模式加回来当护栏；每次改动都盖 `model_baseline`（模型 id + effort + codex-cli 版本）。
- **数字出处 D7**：选型流程扩到 D0–D7，分阶段设计声明 `parameter_provenance`；新产出的设计必须 0 FAIL 且 0 WARN 才算干净。
- **linter 与姊妹技能一致，并按哈希钉住**：`lint_loop_design.mjs` = loop-constructor 0.5.0 的 linter（0.4.0 起未变），sha256 `1fec173225e5c671086da11fc6b85bb2183f6da636e0db7d25cdb16ae256fd36`。0.2.0 所说的「与姊妹逐字节一致」其实早已失效（958 行对 1,160 行），现已恢复并钉住。设计在两个技能间可互通。
- 验收（本版）：三个示例设计 lint 0 FAIL / 0 WARN；开发用测试 78/78；旧/新 linter 在全部 26 份现有设计上的退出码和 FAIL 数完全一致，仅缺 `parameter_provenance` 的分阶段设计多一条 WARN。
- 两臂实验（E11，3 个用例）：带技能的一臂在路由和评审信任边界上 3/3 更好；但只赢了用例 1，用例 2、3 在可执行性和检查实效上略输给裸模型（它的设计会点名一些执行者还得自己动手做的 harness 工具）。成本没法评估（只记了工具调用次数，没记 token）。独立性只到 instance 档：全部角色都跑在 Opus 5.5 high 上，按 owner 指令偏离了 2026-09-13 的模型策略。结论：candidate。
- 已知未修：`contract.md` 的保护只写进了参考文档和示例设计，fresh-reader 核对表和 runbook 前言都还没有写。所以新设计即使让生成者能改契约，也照样过得了全部检查。另有 11 条 P3 未修，清单见 CHANGELOG「Acceptance evidence」。

**什么时候用** —— 「给 codex 设计一个 agent loop」·「搭一个用 Codex 自运行的工作流」；或 `$loop-constructor-codex`。
**不适用** —— 真的把循环跑起来（它只设计、不执行）；非 Codex 的 Claude Code 循环（→ 姊妹技能 `loop-constructor`）；改 loop-principle 知识库。

**知识库** —— `loop-principle` 知识库**引用而不内置**：默认 `<kb>` 指向姊妹技能的 `../loop-constructor/loop-principle`；可用 `$LOOP_PRINCIPLE=/绝对路径` 改位置。没有姊妹技能时进入 KB-degraded 模式，并在报告里如实说明。

完整说明见 [SKILL.md](SKILL.md)，版本记录见 [CHANGELOG.md](CHANGELOG.md)。
