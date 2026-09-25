# loop-constructor-codex

> Design the engineered *loop* for a medium/large task you want an AI agent to run (semi-)autonomously **on the OpenAI Codex CLI** — and only design it, never run it.

**English** · [简体中文](README.md)

**What it does** — Same as the sibling [`loop-constructor`](../loop-constructor/): decomposes the task into a tree of gated sub-loops (each a flat loop with a machine-verifiable DoD + runnable check + cap, wired by `depends_on`, acyclic) and persists a runnable `.loop/` runbook. What differs is how the loop's roles land on **Codex**: one separate `codex exec` process per role.

**The Codex mapping** — three roles = three separate `codex exec` invocations (the evaluator a fresh `read-only` one given only the diff + the contract-time contract; the contract is protected like the instruction files the evaluator reads, outside the generator's write surface); every `codex exec` is a fresh context, so durable state lives on disk (`.loop/`, a ledger, `contract.md`, re-read on `codex resume`); `large` fan-out = concurrent `codex exec` processes in git worktrees. Details in [`references/codex-runtime.md`](references/codex-runtime.md). The emitted runbook carries a **"How to run this loop (Codex CLI)"** preamble.

**0.3.0 (tracks the sibling's 0.5.0)** —
- **A defect inside the last fix stops the loop.** If the previous round's fix produced a new P0/P1 (or the fix area grew >50%, or the same defect class took 2 fix rounds, …) the loop stops and hands over to the owner instead of restarting in place; the owner first asks whether the judgment should be done by code at all — moving it to another plane (re-plane) is the owner's call, never an action the loop picks. The routing order is fixed: escalate → re-plane → loopback → restart, first hit wins; the "task impossible or blocked → stop and report" exit is never sealed. `codex-runtime.md`'s operator steps now follow that rule instead of stating their own (the old "escalate only a wrong contract" line is gone).
- **The generator cannot edit what the evaluator obeys.** A fresh `codex exec` still auto-reads `AGENTS.md` at every level, `AGENTS.override.md`, `.codex/`, execpolicy rules, memories and `.loop/prompts/`. `--sandbox read-only` limits what the evaluator writes, not what it treats as instructions. So the evaluator is launched with `-C` from a checkout whose instruction files match the contract-time state, or those files' sha256 are verified before launch; a changed file is shown as diff data, never obeyed; with neither control, the design says `L-i incomplete`.
- **Codex facts re-stamped** "observed on codex-cli 0.144.4, 2026-09-25": hooks and multi_agent are stable and on, memories experimental and on. The skill still prescribes one process per role (in-session multi_agent isolation is unverified); isolation flags such as `--ephemeral` exist but were not tested, so they are not the control.
- **Two-way harness settlement**: at each model or codex-cli release, delete what the model now does for free and add back that version's known failure modes as guards; stamp each change with `model_baseline` (model id + effort + codex-cli version).
- **Number provenance D7**: the procedure runs D0–D7, staged designs declare `parameter_provenance`, and a newly emitted design is clean only at 0 FAIL and 0 WARN.
- **Linter shared with the sibling, pinned by hash**: `lint_loop_design.mjs` = loop-constructor 0.5.0's linter (unchanged since 0.4.0), sha256 `1fec173225e5c671086da11fc6b85bb2183f6da636e0db7d25cdb16ae256fd36`. The 0.2.0 claim "byte-identical to the sibling" had silently become false (958 vs 1,160 lines); it is restored and pinned. Designs are cross-compatible between the two skills.
- Acceptance (this version): the three example designs lint 0 FAIL / 0 WARN; dev harness 78/78; old vs new linter on all 26 existing designs gives identical exit codes and FAIL counts, plus one WARN on staged designs without `parameter_provenance`.

**When to use** — "design an agent loop for codex" · "set up a self-running Codex workflow"; or `$loop-constructor-codex`. **Not for** — actually running the loop (it designs, not executes); non-Codex Claude Code loops (→ the sibling `loop-constructor`); editing the loop-principle KB.

**Grounding** — the `loop-principle` KB is **referenced, not embedded**: default `<kb>` = the sibling's `../loop-constructor/loop-principle`; set `$LOOP_PRINCIPLE=/abs/path` to relocate. Installed without the sibling ⇒ KB-degraded mode (the skill says so in its report).

Full spec: [SKILL.md](SKILL.md) · history: [CHANGELOG.md](CHANGELOG.md).
