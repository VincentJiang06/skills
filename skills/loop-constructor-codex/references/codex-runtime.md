# Codex CLI runtime mapping

The loop-design vocabulary (roles, contract, separate-context evaluator, restart,
gate, harness_primitives) is **runtime-neutral** — it names loop-engineering
concepts, not Claude primitives. This file is the concrete realization of each
concept on the **OpenAI Codex CLI** (one `codex exec` process per role). Load it during
NEGOTIATE (roles), FILL (harness_primitives + D4), and PERSIST (the runbook's
how-to-run preamble). Cite loop-principle node ids as the sibling references do.

**Phase map** (moved from SKILL.md in 0.3.0). Load this file during **NEGOTIATE** (roles realization — three
roles = three separate `codex exec` invocations, the evaluator a fresh read-only one
launched so it cannot obey instruction files the generator wrote, §1),
**FILL** (harness_primitives = durable on-disk state; D4 parallelism = concurrent
`codex exec` processes in git worktrees), and **PERSIST** (the emitted runbook carries a
"How to run this loop (Codex CLI)" preamble:
per-stage `codex exec` pattern, evaluator-as-fresh-`codex exec`, re-read-disk
on `codex resume`; for `large` designs, concurrent `codex exec` + worktrees).

**Codex facts — observed on codex-cli 0.144.4, 2026-09-25** (local `codex exec --help`,
`codex features list`, strings in the native binary; local observation, not vendor docs —
re-stamp at each codex-cli release, `references/loops-model.md` §VIII): non-interactive
run `codex exec "<prompt>"` (each call = a fresh process/context; `-C <dir>` sets its
working root); session continuation `codex resume`; project instructions in **AGENTS.md**
(read at every directory level walked, plus `AGENTS.override.md` and any
`project_doc_fallback_filenames`); config `~/.codex/config.toml` (location `$CODEX_HOME`);
a project `.codex/` directory (`hooks.json`, skills); execpolicy `.rules` files; sandbox
modes `read-only` / `workspace-write` / `danger-full-access` + an approval policy; MCP
servers in `config.toml`; skills installed at `~/.codex/skills/<name>/`. Features:
`hooks` stable (on), `multi_agent` stable (on), `memories` experimental (on). Isolation
flags exist — `--ephemeral`, `--disable <feature>` (e.g. `memories`), `--ignore-rules`,
`--ignore-user-config` — but their effect on what a fresh process reads was **not run**,
so no design relies on them as a control.

**The prescribed realization stays one `codex exec` process per role**, even though
`multi_agent` exists: whether an in-session agent is isolated from the parent's
transcript, `AGENTS.md` and memories is unverified, while a separate process's working
root, sandbox and flags can be checked from its command line.

## 1. Role realization — three roles = three separate `codex exec` invocations

`roles.{planner,generator,evaluator}` are not in-process personas — they are
**separate `codex exec` invocations**, each a fresh process with its own context
(`principle.adversarial_review_subagent`, `principle.separate_planning_from_execution`).

| Role | Realization | Sandbox |
|------|-------------|---------|
| planner | `codex exec "<plan prompt>"` → writes `contract.md` + the plan; no code | `read-only` (or `workspace-write` to write the plan files) |
| generator | `codex exec "<build prompt>"` → writes all the code; never grades itself | `workspace-write` |
| evaluator | a **NEW** `codex exec` given ONLY the artifact (diff) + `contract.md` — never the generator's transcript or reasoning — launched from a conductor-owned checkout (below) | `read-only` |

The evaluator's `separate_context:true` means literally a fresh invocation that never
saw the build conversation; its prompt (`.loop/prompts/evaluator.md`) says "here is the
diff and the contract; the artifact is broken — prove it, cite the failing assertion." A
generator process grading its own output is the #1 loop failure (sycophancy) — enforce
the boundary with a distinct process, not a new turn in the same one.

A fresh process still auto-reads the instruction surfaces
in the facts block above, so `--sandbox read-only` alone is **not** independence: it
limits what the evaluator writes, not what it reads as authority. Take one control
(`references/loops-model.md` §II):

```
# (a) conductor-owned checkout of the stage tag; its instruction surfaces must still
#     equal the contract-time tag (the generator's diff should never touch them)
git worktree add .loop/eval-checkout <stage-tag>
git diff --exit-code <contract-tag> <stage-tag> -- ':(glob)**/AGENTS*.md' .codex '*.rules' .loop/prompts
codex exec -C .loop/eval-checkout --sandbox read-only "$(cat .loop/eval-checkout/.loop/prompts/evaluator.md)"
# (b) or verify the surface set recorded at contract time, then launch
#     (the checksum file itself kept outside the generator's write surface)
shasum -a 256 -c <owner-dir>/eval-surfaces.sha256   # every AGENTS*.md, .codex/**, *.rules, .loop/prompts/*
```

A non-empty diff or a checksum mismatch is itself a finding: it is shown to the
evaluator as diff data, never obeyed. Codex memories live outside the repo; unless the
design keeps them out of the evaluator's run, write `L-i incomplete` for that part in
`maker_checker.scope`. When neither control is bought, `maker_checker.scope` says
`L-i incomplete` instead of claiming separation.

## 2. Durable state / `harness_primitives` — everything crosses invocations via disk

Because each `codex exec` is a fresh context, **nothing survives except what is on disk**
(`concept.external_state_memory`). The `harness_primitives` name that durable set:

- `.loop/` runbook — the emitted design + this how-to-run doc.
- an on-disk ledger, e.g. `.loop/state.json` or `.loop/run-state.md` — which stage is
  done, what's next, the last green checkpoint.
- `contract.md` — the negotiated assertions (the graded criteria).
- **AGENTS.md** (every level), `AGENTS.override.md`, `.codex/`, execpolicy rules and
  `.loop/prompts/` — standing instructions every fresh `codex exec` auto-reads. They are
  a **protected evaluator-read surface, not run state**: the owner/planner sets them at
  contract time, they sit outside the generator's write surface, and their sha256 (or
  the contract-time tag) is held where the generator cannot write (§1). Run state the
  generator may write stays in the `.loop/` ledger and contract-derived files.
- `codex resume` — continue a prior session; but treat it as untrusted for *state* — the
  stage prompt must instruct **re-reading the on-disk ledger first**, never trusting the
  in-context summary.

Rule for every stage prompt: *first read `.loop/state.json` + `contract.md`, then act.*

## 3. D4 parallelism — concurrent OS processes, never in-process fan-out

This skill prescribes no in-process fan-out (the facts block says why).
`pattern.multi_agent_orchestra` (`technique.git_worktree_isolation`):

- **`large` (fan-out):** N **concurrent `codex exec` processes**, each launched in its
  own **git worktree** (`git worktree add ../wt-<stage> <branch>`), each writing only its
  own files. They coordinate *only* through the shared on-disk ledger — never shared
  context. A final **gate stage** merges the worktrees and runs the design's cross-cutting
  check. An orchestrating shell script (or a human following the runbook) launches and joins them.
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

This section maps each exit of `references/loops-model.md` §V to commands. It adds no
routing rule of its own: which exit fires, and in what order (escalate → re-plane →
loopback → restart, first hit wins), is decided there. For each stage in dependency
order:

1. Run the stage prompt: `codex exec "<stage prompt>" --sandbox workspace-write`.
2. Run the stage's **Check** command (the gate). Green → commit/checkpoint, advance.
3. Before every evaluator launch, apply the §1 control (checkout or `shasum -c`).
4. After every check and evaluator verdict, read the outer escalate entries first —
   if any one fired, take **escalate** now, whatever the cap. Otherwise red → retry
   within the stage's `max_iterations` cap; at the cap take the stage's `on_failure`:
   - **escalate** (a fixer signature, a wrong contract, the task impossible or
     blocked): stop the driver, write the partial diff, the failing evidence and the
     plane question into `.loop/` for the owner. The driver never restarts or loops
     back on its own after this.
   - **loopback** (the stage's input accused) → reset to the named upstream stage's
     last green checkpoint and re-run it with only the failing assertion and its output.
   - **restart** (the stage's own-work stall counter tripped, before it went green) →
     `git worktree remove --force` the stage worktree, re-create it clean from the last
     green baseline, re-derive the stage from `contract.md` in a fresh `codex exec`.
   - **abort** → stop and report.
   Re-plane is the owner's decision after an escalate stop; the driver has no re-plane
   step.

A minimal driver is a shell `for` loop over the stages doing exactly the above; the
runbook's per-stage Check lines are the gates.

## 6. What does NOT map (and its replacement)

- **Claude Code subagents / Task tool** → one `codex exec` process per role (§1, §3).
- **Hooks** — codex-cli has its own (`hooks` stable; `.codex/hooks.json`). A hook file is
  an auto-loaded surface the generator must not write (§1). The deterministic gate stays a
  **shell wrapper around `codex exec`** (a driver that runs the check after each
  invocation) or a git pre-commit hook the generator does not invoke
  (`technique.hooks_as_deterministic_gate` is the generic deterministic-gate concept).
- **Memories** — codex-cli has them (`memories` experimental, on). They are an evaluator
  surface to keep out of its run or record as `L-i incomplete` (§1), never the loop's
  state store: run state lives in `.loop/` files.
- **`/compact`** → irrelevant: each `codex exec` is already a fresh context, so there is no
  in-session compaction to survive. Survival = disk (see §2); on `codex resume`, re-read the
  ledger rather than trusting a summary.
