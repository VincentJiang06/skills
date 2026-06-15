# Adoption, Quality Rubric & Misconceptions / 落地、质量评分与误区

machine_summary_zh: 落地五级：手动→半自动→工具化→多 agent→组织级。判断循环好坏的十二问评分（目标/验收/上下文/小步/反馈/换策略/封顶/回滚/权限/审计/checker≠maker/状态外置）。五大误区：循环=while 循环、越自动越好、循环替代测试、一个大 agent 包打天下、只优化提示词。

machine_summary_en: A five-stage adoption roadmap: manual → semi-auto → tooled → multi-agent → org-level. A twelve-question rubric for judging loop quality (goal/acceptance/context/small-steps/feedback/strategy-change/caps/rollback/permissions/audit/checker≠maker/externalized-state). Five misconceptions: loop = while-loop, more autonomy is always better, loops replace tests, one big agent for everything, optimize only the prompt.

reference_ids: `ref.osmani.loop_engineering`, `ref.anthropic.claude_code_best_practices`, `ref.kilo.what_is_loop_engineering`, `ref.schneier.agentic_ooda_loop`

node_ids: `procedure.adoption_roadmap`, `procedure.loop_quality_rubric`, `anti_pattern.loop_is_a_while_loop`, `anti_pattern.autonomy_maximalism`

## 1. Adoption roadmap

1. **Manual loop** — you run the cycle: ask for a plan, one small change at a time, run tests, paste results back, demand fixes. Goal: learn the rhythm.
2. **Semi-auto** — agent reads/edits/runs local tests/fixes/summarizes; you approve key steps.
3. **Tooled** — add AGENTS.md / CLAUDE.md, custom commands, hooks, CI, review checklist, test scripts. Goal: stop repeating prompts.
4. **Multi-agent** — implementer + tester + reviewer + security + docs, with worktree isolation. Goal: parallelism + cross-checking.
5. **Org-level** — wire into Issues / PR / CI-CD / Slack / Jira / monitoring / error tracking. "Help me code" becomes "the system discovers, handles, and verifies a category of work."

## 2. The good-loop rubric (twelve questions)

Score each yes/no; a good loop scores yes across the board (machine-readable form in `templates/loop_quality_rubric.template.json`, gate form in `checklists/good_loop_review.checklist.json`):

1. Single, clear goal? 2. Machine-verifiable acceptance? 3. Sufficient context? 4. Small steps? 5. Per-step feedback? 6. Changes strategy on failure (vs head-banging)? 7. Max-iterations + budget cap? 8. Reversible / rollbackable? 9. Permission boundaries? 10. Auditable final summary? 11. Checker ≠ maker? 12. State externalized so it survives resets?

Signature of a good loop: **small steps · fast feedback · observable · stoppable · reversible · reusable · auditable · human retains final judgment.**

## 3. The five misconceptions

- **"Loop engineering = a while-loop"** (`anti_pattern.loop_is_a_while_loop`) — the loop is the skeleton; the engineering is goal, context, tools, feedback, judgment, stop conditions, permissions, audit.
- **"More autonomy is always better"** (`anti_pattern.autonomy_maximalism`) — high-risk work belongs human-in/on-the-loop.
- **"Loops replace tests"** — backwards; without tests/observability the loop has no eyes.
- **"One big agent for everything"** — small tasks, small permissions, small steps, multi-role checking beat one mega-agent.
- **"Just optimize the prompt"** — the prompt is one part; tests, tools, logs, permissions, and context management usually matter more.

See also: `templates/loop_design.template.md` (copy-paste loop prompt), `doc.governance.stop_conditions_and_multi_agent` (the autonomy spectrum), `doc.research.loop_engineering_survey` (the master synthesis).
