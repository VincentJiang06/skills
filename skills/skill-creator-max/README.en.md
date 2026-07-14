# skill-creator-max

> The whole skill-building pipeline in one skill — a thin conductor dispatches a **fresh subagent** per role, judges only the returned typed artifact, gates on it, and routes; every rule cites a `skill-philosophy` KB anchor.

**English** · [简体中文](README.md)

**What it does** — Folds the five skill-building functions — composer (decision spec) / guidance (structure contract) / engineer (red-green build) / zipper (lossless compression) / conductor — into **one** skill. The SKILL.md body is a **thin conductor**: it performs none of the functions itself; it **dispatches one fresh subagent per role, monitors the returned typed artifact, validates it against a deterministic gate, and routes the next move**. All of the conductor's power comes from artifacts, never from reading a subagent's process. **This IS the repo's skill-building pipeline now**: it replaces the retired four-skill architecture (skill-guidance / skill-engineer / skill-zipper / skill-conductor — removed from the repo).

**The architecture** —

- **Thin always-loaded body + five on-demand role-packs**: `roles/{composer,guidance,engineer,zipper,battery}.md` load only into the dispatched subagent's context, never into the conductor body (anti-bloat).
- **Five artifact JSON schemas**: SkillSpec / StructureContract / EvidenceDossier / CompressionReport / DecisionRecord — all written to the six-vendor intersection, portable.
- **Deterministic L0 gate scripts** (`scripts/validate_*`): **structure-only** — passing a gate is never evidence the content is right (schema-valid ≠ true). Substance is bought by the battery.
- **O5 independent adversarial battery**: `roles/battery.md` is self-contained (distilled from the vince-attacker five lenses), no external skill needed; at high stakes, dispatch a **different-vendor attacker** for model-tier independence.
- **Runs fully standalone**: the `skill-philosophy` KB is design-time provenance kept **outside the repo** — NOT shipped, NOT read at runtime. The role-packs operationalize its rules and inline the anchors as citation labels, so no KB needs to be present to run the pipeline.

**Why it's good (the six pits it closes)** —

1. **Green-but-wrong validators** — gates are deliberately demoted to L0 structure-only; substantive evidence can only come from the independent battery + second-order spot-checks.
2. **The asymptotic battery mis-encoded as "N clean rounds"** — the stop condition is a pre-registered E9 budget/marginal gate, never a clean-round count.
3. **Single-operator self-report / forgeable gates** — gate control is out-of-band, and every gate verdict is saved as a complete decision object (Decision Record: evidence, rejected options, uncertainty, adjudicator).
4. **Bloat** — the conductor body stays thin; the heavy rules live in role-packs and enter only the subagent's context on demand.
5. **Orchestration friction + correlated authorship** — one skill removes the cross-skill handoffs; **fresh-subagent dispatch per role** decorrelates builder from grader by construction.
6. **Description / portability** — six-vendor-intersection schemas + description-length discipline + hard anti-triggers.

**Trigger discipline (important)** — This skill is **EXPENSIVE** (large token cost). It fires ONLY on an explicit user request to **author/build/create an agent skill** ("build me a skill", "create a new skill", "$skill-creator-max"), with hard anti-triggers against daily-memory-summary / journaling / any generic "create/make/summarize X". Trigger holdout eval: **0/12 false-fires**. If intent is ambiguous, it asks one question rather than betting the pipeline on a guess.

**When to use** — "build me a skill" · "create a new skill for X" · "package this repeated workflow so it triggers automatically" · "$skill-creator-max".

**When NOT to use** — Summarizing/writing daily memory or journaling (hard anti-trigger); any single stage on its own (auditing an existing skill, compressing only, running one attack round → the respective standalone skills); any generic create request that is not authoring an agent skill.

**Model-agnostic** — Role-packs are portable Markdown; all artifact schemas use six-vendor-intersection JSON; any model can run the whole pipeline. A different-vendor attacker at high-stakes acceptance buys stronger battery independence.

**What ships** — 1 `SKILL.md` (thin conductor) + 5 role-packs (`roles/`) + 5 artifact schemas (`schemas/`) + 7 deterministic gate scripts (`scripts/`, each with a `--selftest` discrimination proof) + 1 orchestration-anchors reference (`references/orchestration-anchors.md`).

**Install** — `cp -R skills/skill-creator-max ~/.claude/skills/skill-creator-max` (or via `npx skills add VincentJiang06/skills`).

**Live-test record (v1.0.0)** — The pipeline has now been exercised on two real builds: (1) it built a brand-new skill (`paper-writer`) end-to-end from nothing; (2) it rebuilt `humanizer-academic` to v4.0.0 through the pipeline. Both runs used **genuine per-role fresh-context independence** (a separate dispatched subagent per role — not one agent playing all roles), which closes the biggest coverage gap of the 0.1.0-draft era. The independent battery also earned its keep: it caught real defects that the builders' own green test suites missed (a paper-writer P1 integrity gap; the humanizer hemoglobin fact-invention).

**Honest residual** — the **cross-vendor (model-tier) battery has still not been run**: every battery round to date was instance-tier independence within the same model family. That is the one remaining independence gap. Self-rated strong-candidate / 1.0, with that caveat stated.

Full mechanism in [SKILL.md](SKILL.md).
