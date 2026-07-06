# case-02-large-fanout — task brief

**Runtime:** OpenAI Codex CLI (`codex exec`, single-agent — no in-process subagents).

**Task for the loop designer:** Migrate a Node codebase of **~40 independent modules**
from CommonJS (`require`/`module.exports`) to ESM (`import`/`export`), then land a single
**cutover** (package `"type": "module"`, build/test config flipped) — semi-autonomous.

Context the designer can assume:
- The ~40 modules are **largely independent** — each can be converted and unit-tested on
  its own; there is no forced sequential dependency chain between most of them.
- Per-module done is machine-checkable: that module's unit tests pass under ESM and a
  residual scan finds no remaining CJS constructs in it.
- A final cutover stage flips `package.json`/config and runs the **whole** suite + build.
- The scale + independence genuinely warrant **parallel fan-out** (D4 = `large`): many
  modules converted concurrently, then a gate that merges and verifies the whole.

**What we want back:** the full skill run — D0–D6 selection log (D4 must land on `large`
with a real justification), roles + contract, the staged loop-design JSON (linter PASS),
and the rendered `.loop/` runbook. Because this is `large`, the runbook's orchestration
must describe **concurrent `codex exec` processes in git worktrees** coordinating through
an **on-disk ledger**, with the evaluator realized as a fresh read-only `codex exec`.

This is a *design* task. Do NOT perform the migration — produce the loop design only.
