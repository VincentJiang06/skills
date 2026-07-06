# Codex CLI runtime mapping

The loop-design vocabulary (roles, contract, separate-context evaluator, restart,
gate, harness_primitives) is **runtime-neutral** — it names loop-engineering
concepts, not Claude primitives. This file is the concrete realization of each
concept on the **OpenAI Codex CLI** (single-agent; `codex exec`). Load it during
NEGOTIATE (roles), FILL (harness_primitives + D4), and PERSIST (the runbook's
how-to-run preamble). Cite loop-principle node ids as the sibling references do.

Codex facts assumed: single-agent, **no subagent / Task-tool spawning**; non-interactive
run `codex exec "<prompt>"` (each call = a fresh process/context); session continuation
`codex resume`; project instructions in **AGENTS.md**; config `~/.codex/config.toml`;
sandbox modes `read-only` / `workspace-write` / `danger-full-access` + an approval policy;
MCP servers in `config.toml`; skills installed at `~/.codex/skills/<name>/`.

## 1. Role realization — three roles = three separate `codex exec` invocations

`roles.{planner,generator,evaluator}` are not in-process personas — they are
**separate `codex exec` invocations**, each a fresh process with its own context
(`principle.adversarial_review_subagent`, `principle.separate_planning_from_execution`).

| Role | Realization | Sandbox |
|------|-------------|---------|
| planner | `codex exec "<plan prompt>"` → writes `contract.md` + the plan; no code | `read-only` (or `workspace-write` to write the plan files) |
| generator | `codex exec "<build prompt>"` → writes all the code; never grades itself | `workspace-write` |
| evaluator | a **NEW** `codex exec` given ONLY the artifact (diff) + `contract.md` — never the generator's transcript or reasoning | `read-only` |

The evaluator's `separate_context:true` means literally a fresh invocation that never
saw the build conversation. Concrete pattern:

```
codex exec "$(cat .loop/prompts/evaluator.md)" --sandbox read-only
```

where `evaluator.md` says "here is the diff and the contract; the artifact is broken —
prove it, cite the failing assertion." A generator process grading its own output is the
#1 loop failure (sycophancy) — enforce the boundary by using a distinct process, not a
new turn in the same one.

## 2. Durable state / `harness_primitives` — everything crosses invocations via disk

Because each `codex exec` is a fresh context, **nothing survives except what is on disk**
(`concept.external_state_memory`). The `harness_primitives` name that durable set:

- `.loop/` runbook — the emitted design + this how-to-run doc.
- an on-disk ledger, e.g. `.loop/state.json` or `.loop/run-state.md` — which stage is
  done, what's next, the last green checkpoint.
- `contract.md` — the negotiated assertions (the graded criteria).
- **AGENTS.md** — standing project instructions Codex auto-reads every run (the Codex
  analogue of a project instructions file; **not** CLAUDE.md).
- `codex resume` — continue a prior session; but treat it as untrusted for *state* — the
  stage prompt must instruct **re-reading the on-disk ledger first**, never trusting the
  in-context summary.

Rule for every stage prompt: *first read `.loop/state.json` + `contract.md`, then act.*

## 3. D4 parallelism — concurrent OS processes, never in-process fan-out

There are no in-process subagents in Codex. `pattern.multi_agent_orchestra`
(`technique.git_worktree_isolation`):

- **`large` (fan-out):** N **concurrent `codex exec` processes**, each launched in its
  own **git worktree** (`git worktree add ../wt-<stage> <branch>`), each writing only its
  own files. They coordinate *only* through the shared on-disk ledger — never shared
  context. A final **gate stage** merges the worktrees and runs the design's cross-cutting
  check. An orchestrating shell script (or `AGENTS.md`-driven human) launches and joins them.
- **`medium` (sequential):** one `codex exec` per stage, in dependency order, in the main
  worktree. No concurrency, no worktree juggling.

## 4. Sandbox & approval mapping for `risk_guards` / `human_placement`

Map each guard/placement lever onto a Codex sandbox + approval flag
(`principle.autonomy_by_blast_radius`, `anti_pattern.permission_blast_radius`,
`principle.human_on_vs_in_loop`):

| Lever | Codex realization |
|-------|-------------------|
| evaluators / scouts / read-only probes | `--sandbox read-only` |
| generators (must edit files) | `--sandbox workspace-write` |
| anything touching the host beyond the repo | **never `danger-full-access` by default** — require an explicit human decision |
| `human_placement: in_the_loop` | an interactive Codex session **or** `codex exec` with an approval policy that prompts before each write/command |
| `human_placement: on_the_loop` | `codex exec` running unattended + human review at the **gate stages** (read the diff + the check result, not every step) |

## 5. Runbook operator loop — how a human / shell script drives the stages

For each stage in dependency order:

1. Run the stage prompt: `codex exec "<stage prompt>" --sandbox workspace-write`.
2. Run the stage's **Check** command (the gate). Green → commit/checkpoint, advance.
3. Red → retry within the stage's `max_iterations` cap.
4. Cap hit → take the stage's `on_failure` route:
   - `loopback` → reset to the named upstream stage's last green checkpoint and re-run it.
   - `restart` → **discard this stage's worktree** (`git worktree remove --force`), re-create
     it clean, and re-derive the stage from `contract.md` (not from the rotted attempt).
   - `escalate` / `abort` → stop, hand the partial diff to a human; escalate a **wrong
     contract**, not a merely-broken build.

A minimal driver is a shell `for` loop over the stages doing exactly the above; the
runbook's per-stage Check lines are the gates.

## 6. What does NOT map (and its replacement)

- **Claude Code hooks** → not available. Use **shell wrappers around `codex exec`** (a
  driver script that runs the check after each invocation) or a git pre-commit hook as the
  deterministic gate (`technique.hooks_as_deterministic_gate` is the generic
  deterministic-gate concept, not a Claude hook).
- **Claude memory** → use **AGENTS.md** (standing instructions) + `.loop/` files (run state).
- **`/compact`** → irrelevant: each `codex exec` is already a fresh context, so there is no
  in-session compaction to survive. Survival = disk (see §2); on `codex resume`, re-read the
  ledger rather than trusting a summary.
