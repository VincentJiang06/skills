# Skill 运维与治理扩展阅读 / Skill Ops and Governance Reading List

machine_summary_zh: skill 量化指标、可观测性、生命周期/发布、治理安全与上下文记忆的扩展参考文献，按主题注解。

machine_summary_en: Annotated extended references for skill metrics, observability, lifecycle/release, governance/security, and context/memory.

reference_ids: `ref.otel.genai_spans`, `ref.reliability_bench`, `ref.beyond_pass1`, `ref.clear_framework`, `ref.eval_stat_guarantees`, `ref.efficient_bench_agents`, `ref.agent_eval_survey`, `ref.sigstore`, `ref.nist_ai_rmf_genai`, `ref.asb_iclr2025`, `ref.seagent_mac`, `ref.eu_ai_act`, `ref.securing_agentic_ai`, `ref.memgpt`, `ref.memory_survey_2026`, `ref.memory_survey_storage_to_experience`

node_ids: `pillar.metrics`

## 说明

本文件是指标、生命周期与治理相关支柱的扩展书目，供资料搜集时深读。每条都标了 tier 和一句用途。

## 文献

- `ref.otel.genai_spans` (tier 1) — **Semantic Conventions for Generative AI Client Spans**
  - The OTel specification defining standard attributes for LLM inference, embeddings, and tool-execute spans, including full token-usage and streaming-latency attributes; the canonical anchor for instrumenting skill cost and trace quality.
  - 用途: CNCF 官方规范，定义 LLM 推理/嵌入/工具执行 span 的标准属性，含 input/output/cache token 与流式延迟；是技能可观测性和 token 成本核算的工业标准锚点。
- `ref.reliability_bench` (tier 1) — **ReliabilityBench: Evaluating LLM Agent Reliability Under Production-Like Stress Conditions**
  - Benchmarks agent reliability on consistency (pass^k), perturbation robustness, and fault tolerance; perturbations drop success from 96.9% to 88.1%. A three-axis template for production-readiness testing of skills.
  - 用途: 沿重复执行一致性（pass^k）、语义扰动鲁棒性、工具/API 故障容错三个维度评估生产就绪度，扰动下成功率从 96.9% 降至 88.1%。为技能压力测试与 SLO 定义提供三轴模板。
- `ref.beyond_pass1` (tier 1) — **Beyond pass@1: A Reliability Science Framework for Long-Horizon LLM Agents**
  - Introduces four reliability metrics beyond pass@1 across 23,392 episodes, showing capability and reliability rankings diverge substantially at longer horizons. The basis for pass^k-style skill reliability testing.
  - 用途: 提出可靠性衰减曲线、方差放大因子、优雅降级分数、熔断起始点四项指标，23,392 轮次实验显示能力排名与可靠性排名严重分叉。为技能长时稳定性评估提供方法论。
- `ref.clear_framework` (tier 1) — **Beyond Accuracy: A Multi-Dimensional Framework for Evaluating Enterprise Agentic AI Systems**
  - Proposes the CLEAR (Cost, Latency, Efficacy, Assurance, Reliability) enterprise eval framework; accuracy-only agents are 4.4-10.8x more expensive. Concrete KPI dimensions for skill release gates.
  - 用途: 提出 CLEAR 框架（成本、延迟、效能、保障、可靠性），实验表明纯优化准确率的 agent 成本高出 4.4-10.8 倍。直接适用于技能发布的多维 KPI 定义。
- `ref.eval_stat_guarantees` (tier 2) — **Efficient Evaluation of LLM Performance with Statistical Guarantees**
  - Frames benchmarking as finite-population inference and achieves up to 5x query reduction while maintaining valid confidence intervals. Informs statistically rigorous, cost-efficient skill evaluation.
  - 用途: 将 benchmark 评估建模为有限总体统计推断，提出 Factorized Active Querying 在同等置信区间宽度下节省约 5 倍查询量。为技能评估预算与统计严谨性权衡提供理论基础。
- `ref.efficient_bench_agents` (tier 2) — **Efficient Benchmarking of AI Agents**
  - Shows that evaluating only tasks with 30-70% historical pass rates cuts evaluation cost 44-70% while preserving rank fidelity. A practical shortcut for trimming skill regression suites.
  - 用途: 发现仅评测历史通过率 30-70% 的中等难度任务可减少 44-70% 评估量同时保持排名保真度。直接指导技能回归测试套件的优化。
- `ref.agent_eval_survey` (tier 2) — **Survey on Evaluation of LLM-based Agents**
  - An ACL Findings survey covering five evaluation dimensions and major benchmarks; identifies gaps in cost-efficiency and safety assessment. The landscape reference for a skill eval taxonomy.
  - 用途: 梳理规划、工具使用、Web、代码等评估维度与主流基准，指出成本效率、安全鲁棒性等企业级评估方法不足。为技能指标体系设计提供全景参考。
- `ref.sigstore` (tier 1) — **Sigstore: Keyless Software Signing and Transparency**
  - A keyless signing stack (Cosign + Fulcio + Rekor) adopted by PyPI and Homebrew; the concrete implementation pattern for signing and verifying skill registry artifacts.
  - 用途: 由 Cosign、Fulcio、Rekor 三组件实现无长期私钥的工件签名与透明日志，被 PyPI、Homebrew 采用；为技能注册表信任根提供实践方案。
- `ref.nist_ai_rmf_genai` (tier 3) — **NIST AI 600-1: AI Risk Management Framework — Generative AI Profile**
  - The July 2024 NIST GenAI companion to AI RMF 1.0; defines 12 GenAI-specific risk categories mapped to the four RMF functions. The primary U.S. governance reference for skill risk assessment.
  - 用途: AI RMF 1.0 的 GenAI 专项配套（2024-07），定义 12 个 GenAI 风险类别并映射到 Govern/Map/Measure/Manage。为技能治理框架设计和合规审计提供权威基准。
- `ref.asb_iclr2025` (tier 3) — **Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents**
  - A comprehensive agent security benchmark (10 scenarios, 13 LLMs, 27 attack/defense methods) with attack success up to 84.3% and limited defenses. The quantitative red-team baseline for skill security gates.
  - 用途: 在 10 个场景、13 种 LLM、27 种攻防方法下量化智能体安全，最高平均攻击成功率 84.3% 而防御有限。为技能安全测试提供可复现的定量基线。
- `ref.seagent_mac` (tier 3) — **Taming Privilege Escalation in LLM-Based Agent Systems: A Mandatory Access Control Framework**
  - Defines privilege escalation as exceeding least-privilege for the intended task and proposes SEAgent mandatory access control with information-flow graphs. Applicable to skill tool-permission boundaries.
  - 用途: 定义智能体的权限提升攻击（超出最小必要特权），提出基于属性访问控制与信息流图的 SEAgent 框架。为技能工具权限边界与混淆副手防御提供可落地架构。
- `ref.eu_ai_act` (tier 3) — **Regulation (EU) 2024/1689 — The EU Artificial Intelligence Act**
  - The world's first comprehensive AI regulation; classifies AI by risk tier with conformity obligations for high-risk systems from August 2026. The compliance reference for skills deployed to EU users.
  - 用途: 全球首部 AI 综合立法（2024-08 生效），按风险等级分类监管，高风险系统义务自 2026-08 起执行。技能向欧盟用户发布需对照评估合规义务。
- `ref.securing_agentic_ai` (tier 3) — **Securing Agentic AI: A Comprehensive Threat Model and Mitigation Framework for Generative AI Agents**
  - Introduces the ATFAA threat taxonomy (9 threats across 5 domains) and SHIELD mitigations, bridging generic LLM security and agent-specific risks. A structured threat-modeling reference for skills.
  - 用途: 提出 ATFAA 威胁框架（9 项威胁跨认知/时序/执行/信任/治理五域）与 SHIELD 缓解策略。为技能威胁建模和安全需求规格提供专用于 agent 的分类法。
- `ref.memgpt` (tier 4) — **MemGPT: Towards LLMs as Operating Systems**
  - Introduces OS-inspired virtual context management: two-tier memory with self-editing via tool calls for effectively unlimited context. The foundational pattern for persistent skill memory across sessions.
  - 用途: 提出受操作系统内存管理启发的虚拟上下文管理：主/外两层内存与自编辑工具突破上下文窗口限制。是技能长对话与跨会话持久记忆的奠基设计参考。
- `ref.memory_survey_2026` (tier 4) — **Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers**
  - Surveys LLM-agent memory (2022-2026) via a write-manage-read framework across five mechanism families, with open challenges in continual consolidation. The survey reference for designing skill memory backends.
  - 用途: 围绕写-管-读框架与五类机制梳理 2022-2026 年 agent 记忆研究，讨论多会话评估与持续整合等开放挑战。为技能记忆子系统设计提供全景参考。
- `ref.memory_survey_storage_to_experience` (tier 4) — **From Storage to Experience: A Survey on the Evolution of LLM Agent Memory Mechanisms**
  - An ACL 2026 Findings survey framing memory evolution as Storage to Reflection to Experience, with three drivers and design guidelines. Guidance for skill memory architecture selection and evolution.
  - 用途: 将 agent 记忆演化划分为存储→反思→经验三阶段，提炼一致性、适应、持续学习三大驱动。为技能记忆架构选型与演进路径提供理论指导。
