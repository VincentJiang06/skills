# kb-grounding — ground every judgment in the skill-principle KB

Read this before Step 1 (and any time you need a pillar query). It is the
mechanics of grounding judgments in the local **skill-principle** KB instead
of memory.

Ground every judgment in the embedded **skill-principle** KB (default
`skill-principle/` inside this skill folder) — not memory:

```bash
node <kb>/tools/query_kb.mjs "<topic>" --broad         # principles, templates, checklists
node <kb>/tools/fetch_skill_reference.mjs --list        # public skills to compare against
node <kb>/tools/fetch_skill_reference.mjs <repo.id> <skill-path> --out /tmp/sg-ref
```

The scorecard scores the target against the **7 pillars**: `design`, `research`
(资料搜集), `testing`, `tdd`, `metrics`, `low_context_kb`, `lifecycle`.
