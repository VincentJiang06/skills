# Loop Measurement / 循环度量

machine_summary_zh: 用六组指标量化一个循环是否好用，而不是只看单次主观印象：效果（任务成功率）、自主（自主解决率、人工介入率）、效率（达标迭代数）、完整性（奖励作弊率、回归逃逸率）、成本（单次解决成本、上下文窗口占用）、控制（停止闸门触发率、审查捕获率）。成功类指标必须与完整性类指标配对，否则高分可能是被钻空子的。

machine_summary_en: Quantify whether a loop is sound with six metric groups instead of one-off impressions: effectiveness (task success rate), autonomy (autonomous resolution, human intervention), efficiency (iterations to acceptance), integrity (reward-hack rate, regression escape), cost (cost per resolution, context-window utilization), and control (stop-gate trigger, reviewer catch). Success metrics must be paired with integrity metrics, or a high score may simply be gamed.

reference_ids: `ref.anthropic.claude_code_best_practices`, `ref.openai.harness_engineering`, `ref.osmani.loop_engineering`, `ref.fowler.humans_and_agents`, `ref.reflexion`, `ref.metr.reward_hacking`, `ref.impossiblebench`, `ref.datadog.harness_first_agents`, `ref.mindstudio.token_budget`, `ref.openai.unrolling_codex_agent_loop`, `ref.anthropic.claude_code_hooks`

node_ids: `pillar.measurement`, `metric.task_success_rate`, `metric.autonomous_resolution_rate`, `metric.iterations_to_acceptance`, `metric.human_intervention_rate`, `metric.reward_hack_rate`, `metric.regression_escape_rate`, `metric.cost_per_resolution`, `metric.context_window_utilization`, `metric.stop_gate_trigger_rate`, `metric.reviewer_catch_rate`

## Why measure a loop at all

A loop that "feels productive" is not the same as a loop that is sound. Because a loop errs *many times unattended* (`anti_pattern.error_amplification`) and a weak harness can *certify wrong code* (`anti_pattern.reward_hacking`), the only honest way to know whether a loop is good is to measure it across competing dimensions. The catalog lives in `metrics/metric_catalog.json`; each metric has a graph node here.

## The six groups

| Group | Metric | What it answers |
|---|---|---|
| Effectiveness | `metric.task_success_rate` | Does the loop reach machine-verifiable acceptance? |
| Autonomy | `metric.autonomous_resolution_rate`, `metric.human_intervention_rate` | How much has it "replaced the prompter" — and where does it still need a human? |
| Efficiency | `metric.iterations_to_acceptance` | How many rounds to pass — slow feedback or head-banging? |
| Integrity | `metric.reward_hack_rate`, `metric.regression_escape_rate` | Are the "passes" real, or gamed/leaky? |
| Cost | `metric.cost_per_resolution`, `metric.context_window_utilization` | What does a resolution cost, and is context saturating? |
| Control | `metric.stop_gate_trigger_rate`, `metric.reviewer_catch_rate` | Do the gate and the checker actually work? |

## The one rule that matters

**Never report a success/autonomy metric without its integrity counterweight.** A 95% task-success rate next to a 30% reward-hack rate is not a good loop — it is a loop whose check is being gamed (`concept.verification_bottleneck`; METR measured o3 reward-hacking in 30.4% of runs). Pair `metric.task_success_rate` with `metric.reward_hack_rate`, and `metric.autonomous_resolution_rate` with `metric.regression_escape_rate`. Audit diffs, not just green checks.

See also: `doc.feedback.feedback_verification_observability` (what closes the loop), `doc.risks.costs_risks_failure_modes` (the failure modes these metrics surface), `templates/loop_quality_rubric.template.json` (the qualitative companion to these quantitative metrics).
