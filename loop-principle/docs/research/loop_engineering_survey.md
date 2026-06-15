# Loop Engineering — State-of-the-Art Survey (2025–2026)

machine_summary_zh: 中立、最大深度的 loop engineering 调研主文档。设计让 agent 自己计划-行动-观察-修正-停止的系统而非人逐轮提示；其内核是验证工程。最被印证的原则：一个可运行的快速检查让循环自主闭合，否则你成了验证循环。

machine_summary_en: The neutral, maximal-depth master survey of loop engineering. Designing a system that lets the agent plan-act-observe-adjust-stop instead of a human prompting turn-by-turn; at root it is verification engineering. The most corroborated principle: a fast runnable check closes the loop autonomously, else you become the verification loop.

reference_ids: `ref.osmani.loop_engineering`, `ref.openai.harness_engineering`, `ref.openai.unrolling_codex_agent_loop`, `ref.fowler.humans_and_agents`, `ref.kilo.what_is_loop_engineering`, `ref.mindstudio.loop_engineering`, `ref.demmel.feedback_loop_engineering`, `ref.react`, `ref.reflexion`, `ref.self_refine`, `ref.agentic_reasoning_survey`, `ref.anthropic.claude_code_best_practices`, `ref.anthropic.claude_code_hooks`, `ref.anthropic.agent_skills`, `ref.datadog.harness_first_agents`, `ref.metr.reward_hacking`, `ref.impossiblebench`, `ref.docker.coding_agent_security`, `ref.schneier.agentic_ooda_loop`

node_ids: `concept.loop_engineering`, `concept.loop`, `concept.harness`, `principle.closed_loop_needs_a_check`, `principle.maker_checker_separation`, `concept.verification_bottleneck`, `anti_pattern.reward_hacking`

## How this document fits

This is the master synthesis. It is intentionally the full long-form report. The eight pillar docs (`docs/<pillar>/…`) decompose it into focused, cross-linked topics; the knowledge graph (`knowledge_graph/`) holds the compact nodes and typed edges; `references/` holds the source database. Start from `AGENT_INDEX.md` → `indexes/summary_cards.json`, then expand into the specific pillar doc you need.

## Provenance & confidence

Produced by an adversarial deep-research run (5 search angles · 25 sources fetched · 124 claims extracted · 25 verified, 24 confirmed / 1 refuted). Confidence legend used throughout the docs:

- **✓✓** verified 3–0 (independent adversarial confirmation)
- **✓** verified 2–1 (contested — see notes)
- **◐** sourced but not independently verified, or connective synthesis
- **⚠** open question / no surviving verified claim

`loop engineering` is a freshly coined term (Addy Osmani, ~June 2026); the field is still converging. The four-stage progression *prompt → context → harness → loop* is a useful synthesis but is **not** stated verbatim by Osmani.

## TL;DR

Loop engineering is **designing the system that prompts the agent** — it discovers work, dispatches it, checks results, records state, and decides the next step — instead of you prompting it turn-by-turn ([Osmani](https://addyosmani.com/blog/loop-engineering)). The single load-bearing insight, the most cross-corroborated finding in the survey: **a fast, machine-runnable verification signal is what closes the loop autonomously. Without one, "looks done" is the only signal and *you* become the verification loop** ([Anthropic](https://code.claude.com/docs/en/best-practices)) ✓✓. The bottleneck has moved from *writing* code to *trusting* it ([Datadog](https://www.datadoghq.com/blog/ai/harness-first-agents/)) ✓✓ — so loop engineering is, at root, **verification engineering**. The dominant risks all flow from that: a bad loop errs *many times unattended*, and a *weak harness certifies wrong code*.

## The eight pillars (map)

1. **Foundations** → `doc.foundations.loop_engineering_foundations` — definition, the prompt→context→harness→loop stack, the agent micro-loop, reconciling the differing framings.
2. **Theoretical lineage** → `doc.lineage.theoretical_lineage` — ReAct, Reflexion, Self-Refine, the formal stop predicate + three failure modes.
3. **Anatomy & patterns** → `doc.anatomy.loop_anatomy_and_patterns` — Intent→…→Stop mapped to Explore-Plan-Implement-Commit; retry / plan-execute-verify / explore-narrow / review / human-in-the-loop.
4. **Feedback & verification** → `doc.feedback.feedback_verification_observability` — the signal spectrum, machine-verifiable DoD, the verification bottleneck, production observability (contested).
5. **Harness & tooling** → `doc.harness.harness_and_tooling_layer` — the five primitives + memory, hooks, worktrees, subagents, CDP-per-worktree.
6. **Governance** → `doc.governance.stop_conditions_and_multi_agent` — stop gates, escalation, maker/checker, adversarial review, human on/in-loop, multi-agent isolation.
7. **Costs & risks** → `doc.risks.costs_risks_failure_modes` — error amplification, reward hacking, comprehension debt, cognitive surrender, context drift, security, token blowup.
8. **Adoption, rubric, misconceptions** → `doc.practice.adoption_rubric_misconceptions` — the roadmap, the good-loop rubric, the loop-design template, the five misconceptions.

## Reconciling the differing framings (the headline disagreement)

The sources describe the same animal from different floors, and do **not** truly contradict:

- **OpenAI's "agent loop"** is the *micro*-loop: tool-call → execute → append output → re-query → repeat until the model stops ([OpenAI](https://openai.com/index/unrolling-the-codex-agent-loop/)).
- **Osmani's "loop engineering"** is the *macro*-loop: a self-feeding system of many turns/agents over time ([Osmani](https://addyosmani.com/blog/loop-engineering)).
- **Fowler** draws the *human/agent boundary* across both: an upper "why loop" (humans, outcomes) and a lower "how loop" (agents, build mechanics) ([Fowler](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)).
- **Datadog** and **Demmel** both insist the loop is only real if a *fast feedback signal closes it* ([Datadog](https://www.datadoghq.com/blog/ai/harness-first-agents/), [Demmel](https://www.danieldemmel.me/blog/feedback-loop-engineering)).
- **Kilo** and **MindStudio** frame it as the everyday dev cycle, automated, repeating until a termination condition.

They are describing nested loops and where the human stands relative to them.

## Genuine open disagreements (stated, not papered over)

1. **What is the "control layer"?** Datadog says the *observability platform*; others (Arize, The New Stack) say the *harness*. Unresolved; Datadog has commercial interest. (2–1 split votes on the observability findings.)
2. **How autonomous should loops go?** Genuinely contested; no source settles it.
3. **Whose taxonomy?** Osmani's five-primitive anatomy is one author's map; the four-stage progression is a framing, not a standard.

## Caveats (carried from the research run)

- **OpenAI access:** openai.com returned HTTP 403 to fetchers; OpenAI harness/agent-loop claims were verified via ≥3 independent verbatim mirrors + search, not first-hand.
- **Anachronism:** ReAct (2022) and Reflexion/Self-Refine (2023) predate the term; "ancestor / loop engineering generalizes them" is connective synthesis matching the field's self-described lineage.
- **Vendor self-interest:** the two split-vote (2–1) findings both come from Datadog, which sells observability.
- **Refuted (0–3):** a proposed claim that the 2508.17692 survey offers a clean single/tool/multi-agent taxonomy mapping to loop patterns was killed in verification and is excluded.
- **Open gaps:** human in/on-the-loop governance produced no independently-verified claim; quantified multi-agent cost economics are unsourced.

## Reusable loop-design template & checklist

See `templates/loop_design.template.md` for the copy-paste loop prompt and `templates/loop_quality_rubric.template.json` + `checklists/good_loop_review.checklist.json` for the one-page "good loop" rubric and the safety-boundary gate.

## Full source list

Primary: [Osmani – Loop Engineering](https://addyosmani.com/blog/loop-engineering) · [OpenAI – Harness Engineering](https://openai.com/index/harness-engineering/) · [OpenAI – Unrolling the Codex Agent Loop](https://openai.com/index/unrolling-the-codex-agent-loop/) · [Anthropic – Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) · [Claude Code Hooks](https://code.claude.com/docs/en/hooks) · [Anthropic – Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) · [Datadog – Harness-First Agents](https://www.datadoghq.com/blog/ai/harness-first-agents/) · [ReAct](https://arxiv.org/abs/2210.03629) · [Reflexion](https://arxiv.org/abs/2303.11366) · [Self-Refine](https://arxiv.org/abs/2303.17651) · [Agentic Reasoning Survey](https://arxiv.org/html/2508.17692v1) · [METR – Reward Hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/) · [Schneier – OODA-loop problem](https://www.schneier.com/blog/archives/2025/10/agentic-ais-ooda-loop-problem.html)

Secondary/blog: [Kilo](https://kilo.ai/articles/what-is-loop-engineering) · [MindStudio](https://www.mindstudio.ai/blog/what-is-loop-engineering-ai-coding-agents) · [Demmel](https://www.danieldemmel.me/blog/feedback-loop-engineering) · [Osmani – Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/) · [O'Reilly – Agent Harness Engineering](https://www.oreilly.com/radar/agent-harness-engineering/) · [InfoQ – Fowler](https://www.infoq.com/news/2026/03/mf-aiassisted-dev/) · [Docker – Security horror stories](https://www.docker.com/blog/ai-coding-agent-horror-stories-security-risks/) · [ImpossibleBench](https://www.lesswrong.com/posts/qJYMbrabcQqCZ7iqm/impossiblebench-measuring-reward-hacking-in-llm-coding-1)
