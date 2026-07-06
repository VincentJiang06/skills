# Feedback, Verification & Observability / 反馈、验证与可观测性

machine_summary_zh: 一个可运行的快速检查是循环自主闭合的机制；没有它『看起来完成了』是唯一信号，你成了验证循环。涵盖反馈信号谱（lint→…→生产遥测）、机器可验证 DoD、瓶颈从写代码转向信任代码，以及生产可观测性作为最外层循环（争议：可观测性 vs harness 谁是控制层）。

machine_summary_en: A fast runnable check is the mechanism that closes the loop autonomously; without it 'looks done' is the only signal and you become the verification loop. Covers the feedback-signal spectrum (lint→…→production telemetry), machine-verifiable DoD, the bottleneck shift from writing to trusting code, and production observability as the outermost loop (contested: observability vs harness as the control layer).

reference_ids: `ref.anthropic.claude_code_best_practices`, `ref.datadog.harness_first_agents`, `ref.demmel.feedback_loop_engineering`, `ref.openai.harness_engineering`, `ref.fable.loop_engineering_synthesis_2026_07`

node_ids: `principle.closed_loop_needs_a_check`, `concept.feedback_signal_spectrum`, `principle.machine_verifiable_dod`, `concept.verification_bottleneck`, `pattern.production_observability_loop`, `anti_pattern.diligent_wrong_goal`, `principle.verifier_asymmetry`, `principle.positive_detection_for_invariants`

## 1. The load-bearing principle ✓✓

Anthropic, verbatim: *"Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available, and you become the verification loop… Give Claude something that produces a pass or fail, and the loop closes on its own. Claude does the work, runs the check, reads the result, and iterates until the check passes."* Named check types: *"a test suite, a build exit code, a linter, a script that diffs output against a fixture, or a browser screenshot compared against a design."*

## 2. The feedback-signal spectrum

Cheapest/fastest → richest/slowest:

`lint → typecheck → unit tests → output-diff vs fixture → build exit code → integration tests → screenshot vs design → browser console → API contract checks → DB queries → app logs → traces/metrics → CI → review comments → production telemetry`

Demmel's thesis: you want the agent to run its own code, see results, and iterate like a developer; the tighter/faster the feedback, the better the output.

## 3. Machine-verifiable DoD

Write the DoD as **predicates, not prose**. OpenAI: *"The loop runs until objective criteria are met — tests pass, type checks succeed, builds complete."* ✓✓ Bad DoD: "fix the login bug." Good DoD: "`pnpm test auth` passes; response schema unchanged (contract test green); success and failure paths covered; if root cause uncertain, output an investigation report and STOP."

## 4. The verification bottleneck (industry consensus) ✓✓

Datadog: *"AI agents can now produce software faster than any team can verify it. The bottleneck has moved from writing code to trusting what was written"* and *"code reviews become bloom filters — a fast gate, not the source of correctness."* Corroborated by Sonar's 2026 State of Code, AWS CTO Werner Vogels' "verification debt," OpenAI, and Anthropic. **This is why loop engineering = verification engineering.**

### 4a. Two design corollaries ◐

Model-synthesized, owner-authorized (`ref.fable.loop_engineering_synthesis_2026_07`, tier-2):

- **Verifier asymmetry** (`principle.verifier_asymmetry`) — a loop closes autonomously *only where checking is much cheaper than making*. Decompose and order stages by the verification-cost gradient: cheap-to-verify stages close first and autonomously; a stage where verification ≈ generation cost **is** the bottleneck (find a cheaper signal, or put the human there). Draw the per-stage gradient before choosing loop shape — it predicts where the loop stalls. *验证不对称：循环只在检查远比生成便宜处闭合；验证≈生成的阶段即瓶颈所在。*
- **Positive detection for never-lose invariants** (`principle.positive_detection_for_invariants`) — for "never-drop / never-miss" invariants, prove each item that *should* be present *is* present, rather than checking for the absence of error markers. A negative check passes silently on exactly the drop it exists to catch (a dropped record raises no error and leaves nothing to match); the strongest form is a conservation assertion — N in ⇒ N traceably out, by id, not by count. *不丢失不变量用正向检测：逐项证明应在者在，而非"没看到错误"；守恒断言按 id 核对最强。*

## 5. Production observability as the outermost loop ✓ (contested)

Datadog argues telemetry feeds back: agent generates → harness verifies → production telemetry validates → mismatches refine the harness and retry; *"without observability, the loop is not closed… the observability platform becomes the control layer."*

> ⚠ **Disagreement (flag honestly):** this is the most marketing-flavored claim, from a vendor that *sells observability* (2–1 split vote). Other sources (Arize, The New Stack) frame the **harness** — not the observability platform — as the primary control mechanism. Real, unresolved field tension.

See also: `doc.anatomy.loop_anatomy_and_patterns` (the inner verify loop), `doc.risks.costs_risks_failure_modes` (when the check itself gets gamed — reward hacking).
