# kb-grounding — ground the build in the develop-principle KB

Read this before Step 1 (and any time you need the TDD/testing method). It is
the mechanics of grounding the build in the local **develop-principle** KB
instead of inventing the method.

Ground the build in the local **develop-principle** KB (the `develop-principle/`
library at the repo root; default `../../develop-principle`). Do not invent the TDD/testing
method — pull it:

```bash
node <kb>/tools/query_kb.mjs "TDD red green refactor eval case 契约 变异" --broad
node <kb>/tools/query_kb.mjs "skill 测试 轨迹 回归 金字塔" --broad
```

Reuse its templates instead of duplicating them: `templates/eval_case.template.json`,
`templates/tdd_plan.template.md`, `templates/trajectory_assertion.template.json`,
and the matrices in `testing/` (`test_strategy_matrix.json`, `tdd_workflow.json`).
