# loop-constructor

> Designs the engineered *loop* for a medium/large task you want an AI agent to run (semi-)autonomously — and only designs it, never runs it.

**English** · [简体中文](README.md)

**What it does** — Decomposes the task into a tree of gated sub-loops (each a flat loop with its own machine-verifiable DoD + runnable check + cap, wired by `depends_on`, acyclic) and persists it as a runnable `.loop/` runbook in the project. It DESIGNS the loop; it does NOT execute it.

**Why it's good** —
- **Design backward** from "what check proves this is done?" (loop engineering ≈ verification engineering).
- A deterministic linter (`lint_loop_design.mjs`) rejects any design with no runnable check, and the renderer refuses to write a runbook for a rejected design — a written `.loop/` doc is itself proof the design passed.
- Grounded in the `loop-principle/` KB: cites node ids, reuses its templates/checklists, never restates theory.

**When to use** — "how should I design a loop for X" · "design an agent loop" · "set up an autonomous / self-running agent workflow"; or call `/loop-constructor`.
**Not for** — "reword this prompt" / single-shot prompt engineering (not a loop design); "now actually run the loop / build the feature" (it designs, does not execute); "add a node to loop-principle" / editing the KB (KB authoring, out of scope); non-agentic / non-loop or domain questions (album / audio / course → the relevant skill).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/loop-constructor ~/.claude/skills/`). The `loop-principle/` KB is embedded in this skill folder and installs with `loop-constructor`.

Full spec: [SKILL.md](SKILL.md)
