# Loop Engineering Foundations / 基础

machine_summary_zh: loop engineering 是设计一个替你给 agent 发提示的系统（发现、分配、检查、记录状态、决定下一步），位于 prompt→context→harness→loop 进阶的顶层。区别于 OpenAI 的 agent 微循环（工具调用→执行→追加→重查）与 Fowler 的 why/how 循环划分。

machine_summary_en: Loop engineering is designing a system that prompts the agent (discover, dispatch, check, record state, decide next), at the top of the prompt→context→harness→loop progression. Distinct from OpenAI's agent micro-loop (tool-call→execute→append→re-query) and Fowler's why/how loop split.

reference_ids: `ref.osmani.loop_engineering`, `ref.openai.harness_engineering`, `ref.openai.unrolling_codex_agent_loop`, `ref.fowler.humans_and_agents`, `ref.kilo.what_is_loop_engineering`, `ref.mindstudio.loop_engineering`, `ref.demmel.feedback_loop_engineering`

node_ids: `concept.loop`, `concept.loop_engineering`, `concept.agent_loop_microcycle`, `concept.harness`, `principle.replace_the_prompter`, `principle.engineering_stack_progression`

## 1. The definition

Osmani (June 2026), verbatim: *"Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead."* And: *"Loop engineering sits one floor above the harness. The harness — but it runs on a timer, it spawns little helpers, and it feeds itself."* ✓✓ The five verbs map word-for-word to his expansion: **finds work · hands it out · checks it · records state · decides next**.

## 2. The progression (prompt → context → harness → loop)

| Layer | Optimizes | Core question |
|---|---|---|
| Prompt engineering | a single instruction | "How do I phrase the ask?" |
| Context engineering | the input material | "What code/docs/constraints does it need?" |
| Harness engineering | the run environment | "What can it run, see, change — and what feedback does that produce?" |
| Loop engineering | the work cycle itself | "How does it find work, verify, retry, stop, escalate — without me?" |

**Harness** (the layer directly below) is well-attested by OpenAI: *"the full environment of scaffolding, constraints, and feedback loops that surrounds an AI agent… Repository structure, CI configuration, formatting rules, package managers, application frameworks, project instructions, external tool integration, and linters are all part of the harness."* ✓✓ The engineer's job shifts from *writing code* to *designing the environment, specifying intent, and building feedback loops*.

> ⚠ The four-stage progression is a synthesis; Osmani only calls harness engineering a "cousin / one floor below."

## 3. The agent micro-loop vs the macro-loop

OpenAI's "agent loop" is the *micro*-loop (one turn's tool cycle: tool-call → execute → append output → re-query → repeat until the model stops) ◐. Osmani's "loop engineering" is the *macro*-loop (a self-feeding system of many turns/agents over time). They are nested, not competing.

## 4. Reconciling the framings

- **OpenAI** = the mechanical micro-loop.
- **Osmani** = the autonomous macro-system ("replace yourself as prompter").
- **Fowler** = the human/agent boundary — upper "why loop" (humans, outcomes) over lower "how loop" (agents, build mechanics) ◐.
- **Datadog / Demmel** = the loop is only real if a fast feedback signal closes it.
- **Kilo / MindStudio** = the everyday dev cycle, automated, repeating until a termination condition ◐.

Human moves from *operator inside the loop* to *designer above it* (`principle.replace_the_prompter`).

See also: `doc.lineage.theoretical_lineage` (where the loop comes from), `doc.feedback.feedback_verification_observability` (what closes it), `doc.harness.harness_and_tooling_layer` (what it is built from).
