# skill-creator-max

> The whole skill-building pipeline in one skill — a thin conductor dispatches a **fresh subagent** per role, judges only the returned typed artifact, gates on it, and routes; every rule cites a `skill-philosophy` KB anchor.

**English** · [简体中文](README.md)

**What it does** — Folds the five skill-building functions — composer (decision spec) / guidance (structure contract) / engineer (red-green build) / zipper (lossless compression) / conductor — into **one** skill. The SKILL.md body is a **thin conductor**: it performs none of the functions itself; it **dispatches one fresh subagent per role, monitors the returned typed artifact, validates it against a deterministic gate, and routes the next move**. All of the conductor's power comes from artifacts, never from reading a subagent's process. Replaces the old four-skill architecture (guidance / engineer / zipper / conductor as separate skills).

**The architecture** —

- **Thin always-loaded body + five on-demand role-packs**: `roles/{composer,guidance,engineer,zipper,battery}.md` load only into the dispatched subagent's context, never into the conductor body (anti-bloat).
- **Five artifact JSON schemas**: SkillSpec / StructureContract / EvidenceDossier / CompressionReport / DecisionRecord — all written to the six-vendor intersection, portable.
- **Deterministic L0 gate scripts** (`scripts/validate_*`): **structure-only** — passing a gate is never evidence the content is right (schema-valid ≠ true). Substance is bought by the battery.
- **O5 independent adversarial battery**: `roles/battery.md` is self-contained (distilled from the vince-attacker five lenses), no external skill needed; at high stakes, dispatch a **different-vendor attacker** for model-tier independence.

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

**Honest coverage note (0.1.0-draft)** — A dogfood run went end-to-end: it built a real tiny skill and passed all five L0 gates on **genuine (non-fixture) artifacts**, with a real RED→GREEN harness; every gate script's `--selftest` proved discrimination (all traps caught). BUT: (a) the dogfood was **one agent playing all roles** — true fresh-context per-role independence, the entire point of O5, was **not exercised**; (b) the independent battery has **not yet been run cross-vendor**. So the pipeline is proven to *produce passing artifacts*, not yet proven *under real multi-agent independence* — it self-rates `candidate`, not `industrial`.

Full mechanism in [SKILL.md](SKILL.md).
