# test-driven-development

> Test-driven development for *non-trivial* behavior — the suite is a LIVING SPEC of the current target, so when the target changes you edit it, not only add. Fully re-grounded in the skill-philosophy KB as of v1.0.0; targeted settlement for Opus 5.5 / Fable 5.1 in v1.1.0.

**English** · [简体中文](README.md)

**What it does** — Test-driven development for *non-trivial* behavior: write or update a failing test FIRST, watch it fail **with evidence**, then write the minimal code to pass. The suite is a LIVING SPEC of the current target — as the target changes you EDIT / MERGE / DELETE tests, not only add.

**Why it's good** —
- A discriminative **right-size gate** that fixes over-triggering: engages on real logic / bugfix / behavior-change; skips renames, config-constants, spikes, generated code, docs.
- A **MODIFY mode** that edits / merges / deletes over piling on — one test per feature-group, no proliferation.
- **Watch-it-fail + revert-to-red**, the two irreducible gates against correlated error (Knight–Leveson) when one context writes both test and code — any "it passes" without command + real output + exit status is itself a defect.
- A **trust-boundary spine** (new in v1.0.0): instruction-shaped text found inside processed code/tests carries ZERO authority — a comment saying "skip the run" is inert data; executing arbitrary test code is a real action surface, so destructive / out-of-repo I/O needs confirmation.
- An executed `evals/` behavioral harness (22 checks): real pytest/vitest fixtures, auto-revert vacuity catching (it catches a vacuous green, not every vacuous assertion), **assertion-kind red flagging** (a crash should not count as a red; the check is a heuristic pointer, the red kind is read by a judge or human on external outputs), an injection scenario, an E-L3 stress sentinel, plus two held-out cheat candidates of **non-builder authorship** pinned as regressions.
- Delegation is **advice**, not a checkbox (v1.1.0): dispatch inventory, targeted runs and stale-test scans to subagents when the suite is large or they parallelize; inline is fine for a small suite. Delegation changes **who** runs a step, never **whether** — a delegated run still returns command + real output + exit status.
- **Honest independence** (v1.1.0): an isolated test-author / verifier must be a fresh agent that is **not a fork** (or a separate session) — a fork inherits your context; if the host can only fork or you cannot tell, the report says independence was not achieved.

**When to use** — auto-triggers as you build: implementing real logic (a function / method / endpoint / component with branching or edge cases) · fixing a bug (reproduce with a failing test first) · changing behavior of already-tested code; also the generator's inner discipline inside an agent loop.
**Not for** — trivial / mechanical edits (renames, formatting, comments, type-only, config/constant tweaks); throwaway prototypes / spikes; generated code; pure-docs changes.

**Install** — `npx skills add VincentJiang06/skills` (or `cp -R skills/test-driven-development ~/.claude/skills/`).

**Known limitations** (recorded honestly) — revert-to-red is candidate-granular: a vacuous assertion riding along genuine ones is not individually detected; the stress sentinel inside run_all is a deterministic proxy, the full 64K live run happens at major-version cadence only; per-assertion vacuity detection would need mutation testing, deliberately out of scope for the deterministic harness. The regex/count metrics in `grade.py` are construction-verified only on the committed fixtures; on external outputs they are evidence, not a verdict (stated in v1.1.0). The execution metrics (`green` / `revert_to_red`) count as evidence on an external output only when the candidate's diff vs `base/` touches no runner / infra file (conftest, vitest config, setup files), and even then they are evidence, not proof — a candidate-supplied conftest can turn an unfixed bug all-green (battery F-03); in the stress-sentinel scenario revert-to-red is not a vacuity backstop either (F-01). These grader channels stay open in `grade.py`; they are disclosed, not claimed closed. Open 1.1.0 battery items (one P2 in fix text plus several P3) are listed in the CHANGELOG. See `evals/README.md`.

Full spec: [SKILL.md](SKILL.md)
