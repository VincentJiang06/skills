# Theoretical Lineage / 理论谱系

machine_summary_zh: loop engineering 是学术谱系的工程化：ReAct 的推理-行动交错（Act→Observe→Adjust）、Reflexion 的语言强化与情景记忆（HumanEval 91% pass@1）、Self-Refine 的训练自由自反馈，以及把迭代精炼形式化为停止谓词 Q≜(y⊨S) 并命名三种失败模式。

machine_summary_en: Loop engineering is the productionization of an academic lineage: ReAct's reason-act interleaving (Act→Observe→Adjust), Reflexion's verbal reinforcement + episodic memory (91% pass@1 on HumanEval), Self-Refine's training-free self-feedback, and the formalization of iterative refinement as a stop predicate Q≜(y⊨S) with three named failure modes.

reference_ids: `ref.react`, `ref.reflexion`, `ref.self_refine`, `ref.agentic_reasoning_survey`

node_ids: `concept.react`, `concept.reflexion`, `concept.self_refine`, `principle.iterative_refinement`, `anti_pattern.error_amplification`

## 1. ReAct (2022) — the direct ancestor ✓✓

Yao et al. (ICLR 2023): generates *"reasoning traces and task-specific actions in an interleaved manner… reasoning traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with external sources… to gather additional information."* This bidirectional synergy **is** the Act→Observe→Adjust cycle loop engineering generalizes into a full Intent-Plan-Act-Observe-Adjust loop.

## 2. Reflexion (2023) — verbal RL + episodic memory ✓✓

Shinn et al. (NeurIPS 2023): *"reinforce language agents not by updating weights, but instead through linguistic feedback."* Agents *"verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials."* Hits **91% pass@1 on HumanEval vs GPT-4's 80%** — empirical proof an iterative reflect-and-retry loop beats single-pass.

> ⚠ The 91% relies on Reflexion's *self-generated internal unit tests* as the signal; the paper admits this *"shifts the bottleneck to correct test generation."* This is reward hacking in embryo — see `anti_pattern.reward_hacking`. The episodic memory buffer is the academic root of `concept.external_state_memory`.

## 3. Self-Refine (2023) — single-model self-feedback ✓✓

Madaan et al. (NeurIPS 2023): one LLM as generator, critic, and refiner — generate → self-critique → refine → repeat — *"no supervised training data, additional training, or reinforcement learning."* Adversarial search found critiques of *efficacy* (weak models can't self-refine; ~5% math gains even with oracle feedback), not of the mechanism. Self-Refine's limits are exactly why the field prescribes maker/checker **separation** (`principle.maker_checker_separation`) rather than self-grading.

## 4. Formalization & failure modes ✓✓

Zhao et al. survey (Aug 2025): iterative refinement is *"the agent checks [output] against a standard S, entering an iterative loop of refinement until the condition is met"* (stop predicate `Q ≜ (y ⊨ S)`). Three failure modes recur across this KB:

1. **Converging on a suboptimal solution** when the feedback mechanism is flawed.
2. **Cascading failures** — one early error halts the chain → `anti_pattern.error_amplification`.
3. **Head-banging** — getting stuck in unproductive loops → mitigated by `procedure.stop_gate`.

> **Refuted (0–3):** a proposed claim that this survey offers a clean single/tool/multi-agent taxonomy mapping to loop patterns was killed in verification. Excluded.

> **Anachronism:** all three papers predate the term (2026); "ancestor" is connective synthesis matching the field's self-described lineage (ReAct → AutoGPT → ralph → orchestration loops).
