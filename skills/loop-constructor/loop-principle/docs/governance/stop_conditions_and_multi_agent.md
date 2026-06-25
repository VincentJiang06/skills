# Stop Conditions, Human Placement & Multi-Agent Governance / 停止条件、人类位置与多 agent 治理

machine_summary_zh: 确定性停止闸门（Stop hook 跑检查脚本、连续 8 次阻塞后覆盖结束）+ 升级触发（连续失败/超轮数/范围超限/受限资源/矛盾/安全风险/人工判断）。maker/checker 分离 + 对抗式审查子 agent（全新上下文只看 diff+标准）。人在循环内 vs 之上按爆炸半径×可逆性×反馈质量。多 agent 乐团前提是隔离。

machine_summary_en: A deterministic stop gate (Stop hook runs a check script; overridden after 8 consecutive blocks) plus escalation triggers (consecutive failures / max iterations / scope creep / restricted resource / contradiction / security risk / human judgment). Maker/checker separation plus an adversarial reviewer subagent (fresh context, diff+criteria only). Human in-the-loop vs on-the-loop by blast radius × reversibility × feedback quality. The multi-agent orchestra requires isolation.

reference_ids: `ref.anthropic.claude_code_best_practices`, `ref.anthropic.claude_code_hooks`, `ref.osmani.loop_engineering`, `ref.osmani.code_agent_orchestra`, `ref.fowler.humans_and_agents`, `ref.schneier.agentic_ooda_loop`

node_ids: `procedure.stop_gate`, `procedure.escalation_triggers`, `principle.maker_checker_separation`, `principle.adversarial_review_subagent`, `principle.human_on_vs_in_loop`, `principle.autonomy_by_blast_radius`, `pattern.multi_agent_orchestra`

## 1. The deterministic stop gate ✓✓

Anthropic: *"a Stop hook runs your check as a script and blocks the turn from ending until it passes. Claude Code overrides the hook and ends the turn after 8 consecutive blocks."* A real verification gate **with a hard max-iteration backstop** so it can't loop forever. A loop with no stop condition is automated waste.

> ⚠ The "8" is version-dependent on live docs — verify against current docs.

## 2. Stop & escalation triggers

| Stop type | Triggers |
|---|---|
| **Success** | all acceptance checks pass; diff within limits |
| **Failure** | N consecutive same-type failures; max iterations; scope creep; restricted resource; requirement contradiction; security/data risk |
| **Human escalation** | product judgment; architecture choice; production permission; public-API change; flaky/untrustworthy tests |

## 3. Maker/checker & adversarial review ✓✓

Osmani: maker/checker separation is *"the most useful structural thing in a loop, by far"* — the writer is too nice grading its own homework; *"done is a claim and not a proof."* Anthropic gives the mechanism: a reviewer in a **fresh subagent context sees only the diff and the criteria — not the reasoning that produced the change** — *"so it evaluates the result on its own terms."*

Crucial warning (`principle.adversarial_review_subagent`): *"A reviewer prompted to find gaps will usually report some, even when the work is sound… Chasing every finding leads to over-engineering… Tell the reviewer to flag only gaps that affect correctness or the stated requirements, and treat the rest as optional."*

## 4. Human in-the-loop vs on-the-loop ⚠

> Honesty flag: this distinction produced **no independently-verified claim** in the research run. Field working consensus:

- **In-the-loop** — human inside the inner cycle, approving consequential steps. For **high-risk, low-reversibility** work (auth, payments, migrations, deletes, prod config, public-API changes).
- **On-the-loop** — human supervises from above: sets goals/rules/acceptance/boundaries, reviews at checkpoints + final merge. For **low-risk, reversible, well-tested** work.

Fowler's why/how loop is the same idea from the work-type side ◐. **Governance rule of thumb** (`principle.autonomy_by_blast_radius`): autonomy = f(blast radius × reversibility × feedback quality). No tests + irreversible = always human-in-the-loop.

## 5. Multi-agent / parallel loops

The "orchestra": implementer · tester · reviewer · security · docs ◐. **Isolation is the precondition** before parallelism: git worktree, separate branch, separate dev DB, sandbox, separate logs, separate permissions — so concurrent agents don't corrupt each other's state. Cost is real (`anti_pattern.token_blowup`): each subagent runs its own model + tools.

See also: `doc.harness.harness_and_tooling_layer` (the hook/worktree/subagent primitives), `doc.risks.costs_risks_failure_modes` (security, token, over-delegation).
