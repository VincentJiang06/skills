# model-pyramid

> 在开会话、开子代理、决定要不要挂 advisor 的那一刻，把 **model + effort** 配到位 —— 只建议、不代劳。
> Right-size **model + effort** for the session and for every subagent, and decide whether to attach an
> advisor — advisory, testable, never acts on your behalf.

**English** · **简体中文**

## 两条轴 / The two axes

这是整个技能的核心，其余都是它的展开：

- **Claude 拿到了上下文、试了、还是做错了 → 能力缺口 → 换 MODEL。**
- **Claude 是因为跳过文件、没跑测试、没复核而做错 → 彻底度缺口 → 换 EFFORT。**

> Wrong *with* the context in hand ⇒ capability gap ⇒ change the model.
> Wrong *because it skipped a file / didn't run the tests* ⇒ thoroughness gap ⇒ change the effort.

**effort 不是"想多深"**，它管的是**整个回复里的所有 token —— 正文、工具调用、思考**：读几个文件、发几次工具调用、复核到什么程度、多步任务跑多远才回来汇报。**effort 越低 ⇒ 工具调用越少。**

⛔ **由此得到最要命的那条推论**：搜索 / 探索 / 反复调工具是**最不该**省 effort 的地方。官方把"repeated tool calling、detailed web search、knowledge-base search"列为**该上 `xhigh`** 的理由。给搜索代理降 effort，买到的是一个**不再继续找**的代理。

## 默认值 / Defaults

1. **Model** —— 子代理默认继承会话模型。继承就是对的默认；要覆盖，得说得出理由。
2. **Effort** —— 默认是 **`high`**，在所有支持 effort 的模型上，设 `high` 与**不传这个参数完全等价**。（例外：Opus 4.7 默认 `xhigh`。）
3. **靠 eval 调，不靠感觉。** 从上一代模型**搬过来的 effort 设置一律重扫**，不要沿用。

## fan-out 定档 / Sizing a fan-out

**逐任务分类，绝不整批一个设置。** 一次 spawn 五个混合任务 = 五个决定。

| 任务形状 | Model | Effort |
|---|---|---|
| **同侪协作** 等难度分片、judge panel、对抗验证者、单个委派的深任务 | 继承 | 继承 |
| **搜索 / 探索** 代码库扫描、网页研究、证据搜集 | 继承 | **继承或调高** |
| **高频同质查找**（~20+ 廉价近同任务） | 降**一**层 | `low`–`medium` |
| **长跑自治**（>30 分钟、百万级 token 预算） | Fable 5 优先 | `xhigh` |
| 其他 | 继承 | 默认 `high` |

**钳制**：每层最多动**一个**旋钮；两层是常态，第三层需要一行理由；**没有硬下限** —— `low` 是官方为子代理写明的合法档位，要论证、不要禁用（**这一条推翻了 v0.1.0 的 medium 下限**）；用户显式指定的**原样照办**。

## 不是"换个便宜模型"的成本手段

- **Advisor** —— 一个**至少同等强**的模型，在**决策点**被叫来（定方案前、错误反复出现时、宣布完成前），而不是全程跑。它拿到完整对话、给出指导。适合"多数回合例行、但方案质量决定成败"的长任务。
- **`opusplan`** —— plan 模式用 Opus，执行切 Sonnet。
- **降一档 effort** —— 通常比降一层 model 更大也更安全的杠杆：它是渐变的，且逐请求生效。

## 缓存陷阱 / The cache trap

**改 model 或改 effort 会作废 prompt cache。** 在一段带缓存的会话开头选定档位并保持；要变 effort，跨工作负载变，别在同一段长会话里变。（切换 advisor **不会**作废缓存。）

## 确定性校验 / Mechanical check

```bash
node scripts/check_plan.mjs '{"agents":[{"label":"reviewer","model":"claude-opus-5","effort":"max"}]}'
```

只校验**确定性可判**的部分：该档位在该模型上是否存在（不存在是**静默回落**，不是报错）、`xhigh`/`max` 下 `max_tokens` 是否抬高、Opus 5 的 thinking×effort 冲突（返 400）、advisor 配对是否合法、缓存会话里 effort 是否被改动、以及两个旋钮是否被同时下调。**它不判断你的定档是否明智** —— 那是本技能判断面的活。

```bash
node evals/run_all.mjs        # P 行为夹具 · C 脚本⇄文档一致性 · L 文本护栏
```

其中 **C 组**是最值钱的：脚本里的支持矩阵、advisor 排名、`max_tokens` 起点，必须和 `references/` 里的表**说同一件事**。这个技能的每个数字都会随代际腐烂，而"只改文档、没改脚本"正是它最典型的坏法。

## 文件 / Files

| 文件 | 什么时候读 |
|---|---|
| [`references/model-and-effort.md`](references/model-and-effort.md) | 五档语义、支持矩阵、**每个模型各自的推荐起点**（这一条最常被跨代错误沿用） |
| [`references/orchestration.md`](references/orchestration.md) | advisor 配对合法性与成本形状、opusplan、子代理模式 |
| [`references/runtime-knobs.md`](references/runtime-knobs.md) | 给具体运行时下发参数：Claude Code / Agent tool / Workflow / API / Codex |
| [`scripts/check_plan.mjs`](scripts/check_plan.mjs) | 机检一份定档方案 |

⚠ **最容易踩的运行时坑**：**Agent tool 有 `model` 参数，但没有 effort 参数** —— 子代理只能继承会话 effort。要按代理钉死 effort，必须走 Workflow 的 `agent(prompt, {model, effort})`。方案里带 effort 却走 Agent tool 时，如实报 `degraded:effort-not-expressible`，不要下发一个根本不会生效的设置。

## 什么时候用 / When

任何 fan-out 的**第一个** subagent spawn 之前；被问"这个会话 / 这个 worker 该给什么模型和 effort"；考虑要不要挂 advisor；或 `$model-pyramid`。

**不适用** —— API 价格比价；loop 或 workflow 的**结构**设计（那是 [`loop-constructor`](../loop-constructor/) 的活）；提示词写作。

## 时效 / Staleness

`metadata.model_baseline` 是本技能事实的**戳记**：`claude-5 family · docs read 2026-07-29`。
**这里每一个数字都会过期。** 家族一换代，先对着实时文档复核再信本技能里的任何数字 —— 并且**重扫你自己的 eval**，不要沿用上一代的 effort 设置。

Full spec: [SKILL.md](SKILL.md)
