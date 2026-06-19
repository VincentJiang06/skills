# reorganize-logic

> Rebuild a project's design-contract layer from scratch when docs have rotted past where incremental sync is worth it — code is the only source of truth, and never green-but-wrong.

**English** · [简体中文](README.md)

**What it does** — Compacts the old contracts as read-only context (never copied), re-derives an architecture diagram + structure diagram + explicit interface definitions from the code; stale legacy is deleted ONLY behind a human review gate (manifest, nothing auto-deleted). Scopable to the whole project or one module/dir.

**Why it's good** —
- A deterministic, language-agnostic gate (`verify_contracts.mjs`) ties every documented interface to a real file:line and proves no recognized export was silently dropped.
- It FLAGS ambiguous near-name matches for the agent to reconcile rather than rubber-stamping — no green-but-wrong.
- Deletion is fail-closed: unknown → block, never silent-skip.
- Contrast with neat, which SYNCS docs incrementally rather than rebuilding them.

**When to use** — "reorganize/rewrite the logic" · "rebuild the contracts from scratch" · "rewrite the architecture/structure/interface docs"; or call `/reorganize-logic`.
**Not for** — incremental doc sync / session cleanup (→ neat, the sharpest boundary: this skill DELETES legacy rather than keep-and-sync); designing an agent loop (→ loop-constructor); editing the implementation code (it rebuilds the contract/doc layer, not the logic); a greenfield project with no existing contracts (nothing to clean).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/reorganize-logic ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
