# loop-constructor

Design the engineered **loop** for one concrete task you want an AI coding agent to run (semi-)autonomously — and emit a filled, machine-checkable loop-design spec. It **designs** loops; it does not run them.

The anchor: a fast, machine-runnable check is what closes a loop on its own, so the skill designs **backward from the check** — *no runnable check ⇒ it is not a loop* (loop engineering ≈ verification engineering).

## What it produces

A loop-design object covering, in order:

1. **Definition of Done** — a single machine-verifiable goal (predicate/command, not prose).
2. **Pattern** — retry · plan-execute-verify · explore-narrow (debug) · review (maker/checker) · human-in-the-loop, with fit + failure mode.
3. **Feedback signal** — the cheapest runnable check that still catches the failure class.
4. **Stop conditions** — success + failure branches + escalation, with a mandatory max-iteration/budget cap.
5. **Human placement** — in-the-loop vs on-the-loop, by blast-radius × reversibility × feedback-quality.
6. **Maker/checker** — a separate, fresh-context adversarial reviewer.
7. **Harness primitives** — hooks · worktrees · subagents · external memory · connectors.
8. **Risk guards** — reward hacking, error amplification, context drift, permission blast radius, token blowup, premature over-delegation.
9. **Emit + self-score** — the filled loop-design JSON + a self-scored quality rubric + residual risks.

## How it's good

- A deterministic linter, `scripts/lint_loop_design.mjs`, **rejects any design with no runnable check** (and enforces the mandatory cap, non-empty failure branches, separate checker, risk guards, machine-verifiable DoD). The skill eats its own dogfood — it returns a design only after the linter PASSes.
- Grounded in the **`loop-principle/`** knowledge base: it retrieves from the KB (`node <loop-principle>/tools/query_kb.mjs "<q>"`) and reuses its templates/checklists, citing node ids instead of asserting from memory.

## Requires

The `loop-principle/` KB reachable at `../../loop-principle` (in-repo) or via `$LOOP_PRINCIPLE` / an absolute path after install. If the KB is absent the skill degrades to the cited node ids rather than failing.

Built and verified through the vince-skill pipeline (guidance → engineer → zipper → independent fresh-agent battery): `done` / `industrial`, 0 loops.
