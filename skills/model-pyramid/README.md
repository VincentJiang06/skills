# model-pyramid

> Right-size每个 subagent 的**模型层级 + reasoning effort**，在 fan-out 那一刻做完 —— 一张可测试的规则卡，只建议、不代劳。
> Right-size each subagent's **model tier + reasoning effort** at fan-out time — an advisory, testable rule card that recommends but never spawns.

**English** · **简体中文**

**What it does / 做什么** — 在你准备 spawn / 并行 / 委派 subagent 时，按任务内容逐个分类，输出一行可审计的 `rule=<id> tier=<tier> effort=<notch>`。框架是**合理使用（right-sizing）**：按活儿的难度配资源 —— 从不把这些选择包装成"省钱"。技能只推荐并报告，绝不 spawn agent、改配置或阻断用户。 / Classifies each task independently and emits one auditable line per subagent. Framing is right-sizing, never cost reduction; it recommends and reports, and never spawns agents, edits configs, or blocks you.

**The four rules / 四条规则**

| Rule | Model | Effort |
|---|---|---|
| **R1 peer/parallel co-work** — 等难度分片、judge panel、对抗验证者，或单个委派的深任务（n=1 也算） | keep | keep |
| **R2 search/exploration** — 代码库 / 网页 / 证据搜集 | keep | 降**恰好一档** |
| **R2b very large search fan-out** — ~20+ 同质廉价查找 | 降**恰好一层**（opus-tier→sonnet-tier） | keep |
| **R3 no rule matches** | keep | medium |

**HARD FLOOR:** 永不输出 `low` —— 任何算出来低于 medium 的 effort 一律上钳到 medium。每层最多动**一个**旋钮：要么降一档 effort，要么降一层 model，绝不同时。一次 spawn 里混合任务 ⇒ **逐任务**分类，绝不给整批一个设置。 / `low` is never emitted; sub-medium clamps up. At most one knob per layer. Mixed batch ⇒ classify per task.

**When to use / 什么时候用** — 任何 fan-out 的**第一个** subagent spawn 之前；或被问"这个 worker / judge 该给什么模型和 effort"；或 `$model-pyramid`。 **Not for / 不适用** —— 没有 subagent 在场的模型选购 / API 定价；loop 或 workflow 的**结构**设计（那是 [`loop-constructor`](../loop-constructor/) 的活，只在给它的循环里的 agent 定 size 时协同触发）；"帮我砍 API 开销"（超出范围）。

**Pyramid shape / 金字塔形状** — 两层是常态。第三层，或从更高层 session 里挑出 haiku-tier，都需要在报告里写一行显式理由。subagent 自己再 fan-out 时按层递归应用规则：floor 仍是 medium，每层最多降一层 model，更深的金字塔标记为 exception。

**Overrides / 覆盖** — 用户显式指定的永远赢：原样执行，若低于 medium 只附一行 floor 说明。Advisory 就是 advisory，从不阻断。走脚本时传 `task.user_override = {tier?, effort?}`。

**Deterministic check / 确定性校验** — 规则可以被机器跑，不必靠感觉：

```bash
node scripts/decide.mjs '{"session":{"tier":"opus-tier","effort":"max"},"tasks":[{"peer":true},{"exploratory":true,"fan_out_size":24,"homogeneous_cheap":true}]}'
```

`checkAssignment(session, assignment)` 审计一份既有的分配方案，标出 `below-floor` / `both-knobs-dropped` / `skipped-tier` / `needs-justification`。Node.js >= 18，纯 stdlib。

**Runtime / 运行时** — 兼容任意 agent runtime（Claude Code、Codex CLI、通用 harness）。各家旋钮名不同，映射见 [`references/runtime-mapping.md`](references/runtime-mapping.md)；运行时没有某个旋钮时映射到最近的档位并如实说明降级，绝不输出不被支持的参数。

**Metrics / 指标** — decision accuracy = `evals/run_all.mjs` fixture 表（目标 100%）；activation precision ≥ 0.9（`evals/cases/trigger-cases.json`）。

Full spec: [SKILL.md](SKILL.md)
