# loop-constructor-codex

> Design the engineered *loop* for a medium/large task you want an AI agent to run (semi-)autonomously **on the OpenAI Codex CLI** — and only design it, never run it.
> 为你想让 AI agent（半）自主完成、并用 **Codex CLI** 执行的中大型任务，设计它的工程化*循环* —— 只设计，绝不执行。

**English** · **简体中文**

**What it does / 做什么** — Same as [`loop-constructor`](../loop-constructor/): decomposes the task into a tree of gated sub-loops (each a flat loop with a machine-verifiable DoD + runnable check + cap, wired by `depends_on`, acyclic) and persists a runnable `.loop/` runbook. The **loop-design JSON schema and linter are identical** to the sibling, so designs are cross-compatible — what differs is that the loop's abstractions are realized on **Codex** (single-agent, `codex exec`). / 与 `loop-constructor` 同：把任务分解成一棵带 gate 的子循环树并落盘为可照跑的 `.loop/` runbook。schema 与 linter 与姊妹技能完全一致、设计可互通 —— 区别只在于循环的实现映射到 **Codex**（单 agent、`codex exec`）。

**The Codex mapping / Codex 映射** — three roles = three separate `codex exec` invocations (the evaluator a fresh `read-only` one given only the diff + contract); durable state lives on disk (`.loop/`, a ledger, `contract.md`, **AGENTS.md**, `codex resume`) because every `codex exec` is a fresh context; `large` fan-out = concurrent `codex exec` processes in git worktrees. Details in [`references/codex-runtime.md`](references/codex-runtime.md). The emitted runbook carries a **"How to run this loop (Codex CLI)"** preamble.

**Since 0.2.0 (tracks the sibling's 0.3.0)** — the stop condition must close on **both** sides (a zero-change gate against arms-racing *and* a minimum-progress floor against quitting early); `restart`'s "patching has stalled" is a counter fixed **before** the run, not an in-flight call; contract sizing is stated as **lower bounds** over machine-gradable assertions (endpoint ≥8 / module ≥12 / app ≥20, ceiling 3×); and the emitted runbook ends with a **run-report contract** — no success metric without its integrity counterpart or an explicit `not measured` tag. Schema and linter are still byte-identical to the sibling. / 0.2.0 起：停止条件两侧都关（零改动闸 + 最少推进量下限）；`restart` 判据开跑前量化成计数器；契约断言数是**下限**（端点 ≥8 / 模块 ≥12 / 应用 ≥20，上限 3×）；runbook 末尾带遥测配对的 run-report 契约。schema 与 linter 仍与姊妹技能逐字节一致。

**When to use / 什么时候用** — "design an agent loop for codex" · "set up a self-running Codex workflow"; or `$loop-constructor-codex`. **Not for / 不适用** — actually running the loop (it designs, not executes); non-Codex Claude-Code loops (→ the sibling `loop-constructor`); editing the loop-principle KB.

**Grounding / 知识库** — the `loop-principle` KB is **referenced, not embedded**: default `<kb>` = the sibling `../loop-constructor/loop-principle`; set `$LOOP_PRINCIPLE=/abs/path` to relocate. Installed without the sibling ⇒ KB-degraded mode (the skill says so in its report). / KB 不内置，默认指向姊妹技能的副本；无姊妹时进入 KB-degraded 模式并如实告知。

Full spec: [SKILL.md](SKILL.md)
