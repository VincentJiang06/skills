# skill-engineer

> 拿着 skill-guidance 的 handoff spec，把一个 Claude Code skill 真正建出来、测出来 —— 红-绿-重构，eval 必须真跑绿。

[English](README.en.md) · **简体中文**

**做什么** —— 从 skill-guidance 的 handoff spec（`.skill-guidance/handoff-spec.json`）出发，构建并测试一个 Claude Code skill：先写会失败的 eval、再把 spec 落成文件让 eval 跑绿，最后配一个独立的新 agent 测试组复核。它是流水线的**第 2 阶段（实现）**。

**好在哪** ——
- 确定性脚本 eval + 变异抽查：不是「看着对」，而是把可重跑的 harness 真正执行、按退出码判 pass。
- 一个 `trigger_eval`：用 `claude -p` 真把这个 skill 跑起来，对着基线量**真实触发率**，而非「我觉得会触发」。
- 独立测试组对构建规则一无所知，专抓自测漏掉的 bug。
- 测试驱动：required case 没真跑通、或脚本 skill 没有可重跑 harness，就一律视为未验证，不报成功。
- **v2.0：E 门是可执行的** —— 交付前自跑 `validate_report.mjs`（P0/对抗清单 join、harness **当场重跑**、红日志校验），与 conductor 用同一把尺；trigger_eval 支持 3 次投票 + held-out 防过拟合；行为类 skill 的红阶段 = 无技能基线记录；发布前安全 lint（秘钥/注入/未声明外呼）。

**什么时候用** —— 「实现 / 开发 / 接好这个 skill」·「让 eval case 跑通」·「把 handoff-spec 变成文件」·指向 `.skill-guidance/handoff-spec.json` 时；也可用 `/skill-engineer` 显式调用。
**不适用** —— 规划 / 审计（→ skill-guidance）；token 压缩 / 重构（→ skill-zipper）；没有 spec 的空白脚手架（→ skill-creator）。

**安装** —— `npx skills add VincentJiang06/skills`（或 `cp -R skills/skill-engineer ~/.claude/skills/`）。全功能请同时安装 `skill-guidance`；`skill-principle/` 知识库现在内置在 `skill-guidance/skill-principle/`，`skill-engineer` 会复用它。

完整说明见 [SKILL.md](SKILL.md)。
