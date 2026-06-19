# test-driven-development

> Test-driven development for *non-trivial* behavior — the suite is a LIVING SPEC of the current target, so when the target changes you edit it, not only add.

**English** · [简体中文](README.md)

**What it does** — Test-driven development for *non-trivial* behavior: write or update a failing test FIRST, watch it fail, then write the minimal code to pass. The suite is a LIVING SPEC of the current target — as the target changes you EDIT / MERGE / DELETE tests, not only add.

**Why it's good** —
- A discriminative **right-size gate** that fixes over-triggering: engages on real logic / bugfix / behavior-change; skips renames, config-constants, spikes, generated code, docs.
- A **MODIFY mode** that edits / merges / deletes over piling on — one test per feature-group, no proliferation.
- Delegates suite inventory, test-runs, and stale-test scans to subagents, keeping the main thread fast.

**When to use** — auto-triggers as you build: implementing real logic (a function / method / endpoint / component with branching or edge cases) · fixing a bug (reproduce with a failing test first) · changing behavior of already-tested code; or call `/test-driven-development` (a.k.a. TDD).
**Not for** — trivial / mechanical edits (renames, formatting, comments, type-only, config/constant tweaks); throwaway prototypes / spikes; generated code; pure-docs changes.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/test-driven-development ~/.claude/skills/`).

Full spec: [SKILL.md](SKILL.md)
