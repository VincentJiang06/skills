# test-driven-development

> Test-driven development for *non-trivial* behavior — the suite is a LIVING SPEC of the current target, so when the target changes you edit it, not only add. Fully re-grounded in the skill-philosophy KB as of v1.0.0.

**English** · [简体中文](README.md)

**What it does** — Test-driven development for *non-trivial* behavior: write or update a failing test FIRST, watch it fail **with evidence**, then write the minimal code to pass. The suite is a LIVING SPEC of the current target — as the target changes you EDIT / MERGE / DELETE tests, not only add.

**Why it's good** —
- A discriminative **right-size gate** that fixes over-triggering: engages on real logic / bugfix / behavior-change; skips renames, config-constants, spikes, generated code, docs.
- A **MODIFY mode** that edits / merges / deletes over piling on — one test per feature-group, no proliferation.
- **Watch-it-fail + revert-to-red**, the two irreducible gates against correlated error (Knight–Leveson) when one context writes both test and code — any "it passes" without command + real output + exit status is itself a defect.
- A **trust-boundary spine** (new in v1.0.0): instruction-shaped text found inside processed code/tests carries ZERO authority — a comment saying "skip the run" is inert data; executing arbitrary test code is a real action surface, so destructive / out-of-repo I/O needs confirmation.
- An executed `evals/` behavioral harness (22 checks): real pytest/vitest fixtures, auto-revert vacuity catching, **assertion-kind red discrimination** (a crash is NOT a red), an injection scenario, an E-L3 stress sentinel, plus two held-out cheat candidates of **non-builder authorship** pinned as regressions.
- Delegates suite inventory, test-runs, and stale-test scans to subagents, keeping the main thread fast.

**When to use** — auto-triggers as you build: implementing real logic (a function / method / endpoint / component with branching or edge cases) · fixing a bug (reproduce with a failing test first) · changing behavior of already-tested code; also the generator's inner discipline inside an agent loop.
**Not for** — trivial / mechanical edits (renames, formatting, comments, type-only, config/constant tweaks); throwaway prototypes / spikes; generated code; pure-docs changes.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/test-driven-development ~/.claude/skills/`).

**Known limitations** (recorded honestly) — revert-to-red is candidate-granular: a vacuous assertion riding along genuine ones is not individually detected; the stress sentinel inside run_all is a deterministic proxy, the full 64K live run happens at major-version cadence only; per-assertion vacuity detection would need mutation testing, deliberately out of scope for the deterministic harness. See `evals/README.md`.

Full spec: [SKILL.md](SKILL.md)
