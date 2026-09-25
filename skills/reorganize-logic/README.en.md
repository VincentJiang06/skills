# reorganize-logic

> Rebuild a project's design-contract layer from scratch when docs have rotted past where incremental sync is worth it — code is the only source of truth, and never green-but-wrong.

**English** · [简体中文](README.md)

**What it does** — Compacts the old contracts as read-only context (never copied), re-derives an architecture diagram + structure diagram + explicit interface definitions from the code; stale legacy is deleted ONLY behind a human review gate (manifest, nothing auto-deleted). Scopable to the whole project or one module/dir.

**Why it's good** —
- A deterministic, language-agnostic gate (`verify_contracts.mjs`) ties every documented interface to a real file:line and flags any recognized export the contract misses (see Known limitations).
- Coverage is per symbol, not per name: the same name defined in two files needs a row (or exclusion) for each; a re-export (ESM or CommonJS barrel, `.d.ts`) needs no second row. The file walk skips dependency/virtualenv/cache dirs and the paths git itself reports as ignored and untracked (a tracked file is never skipped for matching an ignore pattern), reads a `src/build/` source dir, and prints what it skipped on a `not read:` line.
- It FLAGS ambiguous near-name matches for the agent to reconcile rather than rubber-stamping — no green-but-wrong.
- The gate checks structure, not design intent: excluding a strongly-exported symbol requires a same-line **reason**, and whether it is really internal is decided by a non-fork fresh reader with an exclusion judgment card (uphold / overturn / unsure, checked against the code); unsure items come to you.
- When the gate can't be satisfied honestly (only by an untrue contract, editing code or the gate, or a language with no matcher) the run escalates instead of forcing a green; the gate is never edited mid-task.
- Deletion is fail-closed: unknown → block, never silent-skip.
- Contrast with neat, which SYNCS docs incrementally rather than rebuilding them.

**Known limitations (0.3.3)** —
- Grouped Go `type ( … )` blocks are not read; the printed `extracted`/`ratio` count names, not (name, file) symbols.
- Edge cases carried from 0.2.x (a zero surface passes, exports inside comments are extracted, a plain JS `class X` counts as a strong export, and others): full list with repros in [CHANGELOG.md](CHANGELOG.md) 0.3.3 and 0.3.2.
- Head-to-head against a bare model (3 cases), the skill was never less accurate and never edited legacy docs, but the bare model was more complete in all three.

**When to use** — "reorganize/rewrite the logic" · "rebuild the contracts from scratch" · "rewrite the architecture/structure/interface docs"; or call `/reorganize-logic`.
**Not for** — incremental doc sync / session cleanup (→ neat, the sharpest boundary: this skill DELETES legacy rather than keep-and-sync); designing an agent loop (→ loop-constructor); editing the implementation code (it rebuilds the contract/doc layer, not the logic); a greenfield project with no existing contracts (nothing to clean).

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/reorganize-logic ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
