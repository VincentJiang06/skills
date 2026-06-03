# Skill 工程扩展阅读 / Skill Engineering Reading List

machine_summary_zh: skill 设计、测试和 TDD 的扩展参考文献，按主题注解；用于深化触发、工具规范、评估、轨迹/变异/契约测试和可靠性的设计。

machine_summary_en: Annotated extended references for skill design, testing, and TDD; deepens triggers, tool specs, evaluation, trajectory/mutation/contract testing, and reliability.

reference_ids: `ref.sok.agentic_skills`, `ref.skillsbench`, `ref.anthropic.context_engineering`, `ref.anthropic.advanced_tool_use`, `ref.openai.gpt41_prompting_guide`, `ref.microsoft.sk_plugins`, `ref.edd_ops`, `ref.adarubric`, `ref.prometheus2`, `ref.gaming_the_judge`, `ref.agentassay`, `ref.hal.holistic_agent_leaderboard`, `ref.harness_bench`, `ref.trace.trajectory_eval`, `ref.tool_registry_design`, `ref.semantic_invariance_agents`, `ref.osworld`, `ref.webarena`, `ref.healthbench`, `ref.mutation_guided_test_meta`

node_ids: `pillar.design`

## 说明

本文件是 `pillar.design` 与测试相关支柱的扩展书目，供资料搜集时深读。每条都标了 tier 和一句用途。

## 文献

- `ref.sok.agentic_skills` (tier 1) — **SoK: Agentic Skills — Beyond Tool Use in LLM Agents**
  - A systematization-of-knowledge paper mapping the full agentic-skill lifecycle; introduces seven packaging/execution design patterns and a representation-by-scope taxonomy. Informs skill-package architecture and governance.
  - 用途: 系统梳理 LLM 智能体可复用技能的完整生命周期，提出七种设计模式与表示×范围分类体系，并记录供应链安全风险；可指导技能包架构、发现与治理。
- `ref.skillsbench` (tier 2) — **SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks**
  - First benchmark treating agent skills as first-class evaluation artifacts (86 tasks, 11 domains): curated skills +16.2pp, self-generated skills no benefit. Informs skill granularity and eval coverage.
  - 用途: 首个专门评测智能体技能的基准（86 任务、11 领域）：精心策划的技能平均提升 16.2pp，模型自生成技能无益，2-3 模块聚焦技能胜过全面文档。为技能粒度与测试策略提供实证。
- `ref.anthropic.context_engineering` (tier 1) — **Effective Context Engineering for AI Agents**
  - Anthropic engineering post on managing context as a finite resource: right-altitude prompts, minimal tool sets, just-in-time retrieval, and three long-horizon strategies. Core reference for skill system-prompt design.
  - 用途: Anthropic 官方工程博客，阐述上下文工程原则：系统提示粒度、工具集最小化、即时检索，以及压缩/笔记/子智能体三种长任务策略。直接适用于技能系统提示与工具规范设计。
- `ref.anthropic.advanced_tool_use` (tier 1) — **Introducing Advanced Tool Use on the Claude Developer Platform**
  - Covers Tool Search (~85% context reduction), Programmatic Tool Calling (~37% fewer tokens), and Tool Use Examples (72%->90% accuracy). Concrete guidance for minimal, example-rich tool and skill definitions.
  - 用途: 介绍工具搜索（减少约 85% 上下文）、程序化工具调用（减少约 37% token）、工具使用示例（准确率 72%→90%）。直接服务工具规范设计与技能描述工程。
- `ref.openai.gpt41_prompting_guide` (tier 1) — **GPT-4.1 Prompting Guide**
  - Official OpenAI prompting guide: agentic workflows, long context, CoT, instruction following, with a complete tool-definition example. Applicable to system-prompt and tool-spec authoring in skills.
  - 用途: OpenAI 官方提示最佳实践：智能体工作流、长上下文、思维链、指令遵循，含完整工具规范示例（apply_patch）。可用于技能 system prompt 与工具规范对齐。
- `ref.microsoft.sk_plugins` (tier 1) — **Plugins in Semantic Kernel**
  - Microsoft documentation for Semantic Kernel plugins: semantic function descriptions, native/OpenAPI/MCP import, AI-friendly naming, parameter minimization. An enterprise reference for capability-package architecture.
  - 用途: 微软官方文档，详述插件架构：函数语义描述、native/OpenAPI/MCP 导入、AI 友好命名与参数最简化、本地状态利用。为工业级技能包架构提供参考。
- `ref.edd_ops` (tier 1) — **Evaluation-Driven Development and Operations of LLM Agents: A Process Model and Reference Architecture**
  - Proposes EDDOps unifying offline and online evaluation in a closed feedback loop for LLM agents — evaluation as continuous governance rather than a final checkpoint. The TDD/EDD analogue for agent systems.
  - 用途: 提出 EDDOps，将离线（开发期）与在线（运行期）评估统一为闭环反馈，视评估为全生命周期持续治理而非最终关卡。对标 TDD/EDD，为技能持续评测架构提供参考。
- `ref.adarubric` (tier 2) — **AdaRubric: Task-Adaptive Rubrics for Reliable LLM Agent Evaluation and Reward Learning**
  - Generates task-specific rubrics from task descriptions and evaluates trajectories step by step with confidence weighting (0.79 Pearson with humans). Methodology for per-skill evaluation rubrics.
  - 用途: 自动为每条任务生成专属评分标准，按置信度加权逐步评估轨迹并生成密集奖励；与人类 Pearson 0.79。为技能评估的 LLM-as-judge 评分标准设计提供方法。
- `ref.prometheus2` (tier 2) — **Prometheus 2: An Open Source Language Model Specialized in Evaluating Other Language Models**
  - Open-source evaluator LM supporting direct assessment and pairwise ranking with custom rubrics; highest human/GPT-4 correlation among open evaluators. A reproducible LLM-as-judge backbone for skill grading.
  - 用途: 开源评估 LM，支持直接评分与成对排名，与人类和 GPT-4 相关性在开源评估器中最高。可作为技能评估中可复现、低成本的 LLM-as-judge 替代方案。
- `ref.gaming_the_judge` (tier 2) — **Gaming the Judge: Unfaithful Chain-of-Thought Can Undermine Agent Evaluation**
  - Shows that rewriting agent CoT while fixing actions/observations inflates judge false-positive rates by up to 90%; motivates action-grounded rather than CoT-only judges for skill assessment.
  - 用途: 证明对 LLM-as-judge 的思维链做针对性改写（保持动作/观察不变）可将误报率提升高达 90%。为技能评估的轨迹级 judge 鲁棒性设计提供风险警示。
- `ref.agentassay` (tier 1) — **AgentAssay: Token-Efficient Regression Testing for Non-Deterministic AI Agent Workflows**
  - A regression-testing framework for non-deterministic agent workflows: stochastic verdicts, mutation operators, metamorphic relations, CI/CD gates, behavioral fingerprinting; 78-100% token-cost reduction.
  - 用途: 首个为非确定性智能体工作流设计的回归测试框架：三值裁定（PASS/FAIL/INCONCLUSIVE）、变异算子、元态关系、CI/CD 门、行为指纹，降低 78-100% token 成本。直接支撑技能持续回归测试。
- `ref.hal.holistic_agent_leaderboard` (tier 2) — **Holistic Agent Leaderboard: The Missing Infrastructure for AI Agent Evaluation**
  - Introduces standardized parallel evaluation infrastructure (hundreds of VMs, 21,730 rollouts) and surfaces counterintuitive findings. An engineering blueprint for large-scale skill eval harnesses.
  - 用途: 提出标准化并行评估基础设施（数百 VM、21,730 次 rollout），将评测从数周压缩至数小时，并揭示更强推理反而降准确率等反直觉发现。为技能大规模评测流水线提供工程参考。
- `ref.harness_bench` (tier 2) — **Harness-Bench: Measuring Harness Effects across Models in Realistic Agent Workflows**
  - A benchmark making the agent harness the primary evaluation axis (106 tasks, 5,194 trajectories): capability should be reported at the model-harness level. Informs skill-harness and test environment design.
  - 用途: 首个将 harness（工具、状态、权限、恢复等系统层）作为主轴评估的基准（106 任务、5,194 轨迹）：应在模型-harness 配置层而非仅模型层报告能力。直接支持技能 harness 与测试环境设计。
- `ref.trace.trajectory_eval` (tier 2) — **TRACE: Trajectory-Aware Comprehensive Evaluation for Deep Research Agents**
  - Proposes a Hierarchical Trajectory Utility Function and Scaffolded Capability Assessment, exposing the 'high-score illusion' of pass@1-only metrics. A methodology for process-level skill evaluation.
  - 用途: 提出分层轨迹效用函数（量化过程效率、认知质量、证据扎根性）与脚手架能力评估协议，揭示 pass@1 造成的高分幻觉。为技能的过程性（轨迹级）评估提供方法论。
- `ref.tool_registry_design` (tier 1) — **Agent-Facing Information Design in LLM Tool Registries**
  - An empirical study (17,700+ trials) showing superlative marketing language dominates tool selection; proposes an Agent Attention Quality Score. Informs tool/skill description standards and registry design.
  - 用途: 基于 17,700+ 次试验分析工具注册表的选择偏差：夸张描述主导选择，传统披露方法失效；提出智能体注意力质量分。直接指导技能注册表与工具说明文案规范。
- `ref.semantic_invariance_agents` (tier 2) — **Semantic Invariance in Agentic AI**
  - A metamorphic testing framework applying 8 semantic-preserving transformations across 7 foundation models; a principled metamorphic methodology applicable to skill robustness testing.
  - 用途: 元态测试框架，对 7 个基础模型施加 8 种语义保持变换，发现更小的模型反而更稳定；为技能的语义不变性/变异测试提供方法。
- `ref.osworld` (tier 2) — **OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments**
  - The first scalable real-computer-environment benchmark (369 tasks across OSes) with execution-based evaluation; human 72.36% vs best model 12.24%. Reference for evaluating skills needing OS-level access.
  - 用途: 首个可扩展真实计算机环境基准（369 任务，Ubuntu/Windows/macOS），人类 72.36% vs 最佳模型 12.24%，配执行式自动评估。为需 OS 级工具访问的技能评估提供基准。
- `ref.webarena` (tier 2) — **WebArena: A Realistic Web Environment for Building Autonomous Agents**
  - A self-hostable four-domain web environment with 812 long-horizon tasks and functional-correctness evaluation; canonical reference for end-to-end functional evaluation of web-interaction skills.
  - 用途: 可自托管的四领域网站环境与 812 个长程任务，强调功能正确性评估；最佳模型 14.41% vs 人类 78.24%。为 web 技能的端到端功能评测提供基准。
- `ref.healthbench` (tier 2) — **HealthBench: Evaluating Large Language Models Towards Improved Human Health**
  - An OpenAI benchmark with physician-authored rubric criteria graded at scale; an exemplary methodology for instance-specific rubric creation and LLM-as-judge calibration in skill evaluation.
  - 用途: 5,000 个多轮对话、262 名医生撰写 48,562 条评分标准，由 GPT-4.1 grader 规模化打分；提供实例专属评分标准的最佳实践。为技能评估的专家共识标准生成与 judge 校准提供方法。
- `ref.mutation_guided_test_meta` (tier 3) — **Mutation-Guided LLM-based Test Generation at Meta**
  - Meta's ACH system combines mutation testing with LLM test generation at scale (10,795 classes, 73% engineer approval). Demonstrates industrial mutation-guided testing applicable to skill regression pipelines.
  - 用途: Meta ACH 系统将变异测试与 LLM 测试生成结合，应用于 10,795 个 Android Kotlin 类，工程师批准率 73%。展示变异测试在工业级 LLM 辅助测试中的应用，可迁移至技能回归测试。
