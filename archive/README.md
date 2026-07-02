# archive/ — frozen previous versions

Superseded skill versions, kept for reference and rollback. **Not installable
and not maintained** — the skill installer scans `skills/`, not here; nothing in
this folder is deployed or gated.

## skill pipeline v1 (frozen 2026-07-02)

`skill-guidance-v1`, `skill-engineer-v1`, `skill-zipper-v1`,
`skill-conductor-v1` are the pipeline as it stood at commit `8bf320b`, before
the **v2** refactor (executable G/E gate scripts, guidance audit disposition,
holdout trigger-eval, portability checklist, the KB `UPDATE.md` runbook). The
live v2 keeps the plain names under `skills/`.

Each frozen copy contains only the files that shipped (SKILL.md + `rules/`
+ `scripts/` + `assets/` + `schemas/`); the frontmatter `name:` was suffixed
`-v1` to match its directory. The shared `skill-principle` KB was **not**
duplicated here — it is a library that evolves independently of the pipeline
skills and lives (with full git history) at
`skills/skill-guidance/skill-principle/`.

To inspect or restore a v1 skill in full (including its dev-only `evals/`, which
were never tracked):

```bash
git show 8bf320b:skills/skill-guidance/SKILL.md          # any single file
git archive 8bf320b skills/skill-guidance | tar -x       # the whole tracked tree
```

See each live skill's `CHANGELOG.md` (2.0.0 / 2.1.0) for what changed.
