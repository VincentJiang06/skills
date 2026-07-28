# orchestration — advisor, opusplan, subagents, and where the cost actually goes

> Stamped **2026-07-29**. The advisor is an experimental, Anthropic-API-only feature;
> availability and pairing rules change. Re-verify before relying on a row here.

## Four ways to get a stronger model involved

Pick by **when** you want the strong model to run.

| Approach | Strong model runs | Started by |
|---|---|---|
| **Advisor** | at decision points mid-task | Claude calls it when it needs guidance |
| **`opusplan`** | during plan mode, then switches to Sonnet for execution | you enter plan mode |
| **Subagent with `model` set** | for the whole delegated subtask | you delegate |
| **Switch `/model`** | every turn from now on | you switch |

## The advisor

A second, **at-least-as-capable** model that Claude consults mid-task — before committing to
an approach, when an error keeps recurring, before declaring a task done. It receives the
**full conversation** and returns guidance Claude applies before continuing. Server-side tool;
Claude decides when to call it.

**Where it fits**: long, multi-step tasks where most turns are routine but **plan quality
decides the outcome** — large refactors, a recurring bug, work you want independently checked
before it is declared done.

**Where it does not**: short tasks with little to plan, or work where *every* turn needs the
strongest model. For those, switch the main model instead.

### Pairing legality (the advisor must be ≥ the main model)

| Main model | Accepted advisors |
|---|---|
| Haiku 4.5 | Fable, Opus, Sonnet — *Haiku can call an advisor, never be one* |
| Sonnet 4.6 | Fable, Opus, Sonnet |
| Sonnet 5 | Fable, Opus, Sonnet 5 (a Sonnet 4.6 advisor is rejected) |
| Opus 4.6 | Fable, Opus, Sonnet 5 |
| Opus 4.7+ | Fable, and Opus 4.7 or later |
| Fable 5 | Fable only |

If the advisor is less capable than the main model it is simply **not attached** — you get a
notification, not an error. **Subagents inherit the configured advisor** and re-run the pairing
check against *their own* model, so a Sonnet subagent under an Opus session may use an advisor
the parent could not.

⚠ At this baseline Claude Code **does not offer Fable 5 as the advisor** (it appears dimmed and
`--advisor fable` is rejected), so a Fable 5 main session runs without one.

### Cost shape

Each call sends the whole conversation at the advisor's rates, and the advisor's own read is
**never cached** — every call reprocesses the transcript. But it fires at decision points, not
every turn, so *a faster main model + a stronger advisor typically costs less than running the
stronger model throughout*.

Useful pairings: Sonnet main + Opus advisor (routine work, escalate planning/failures/completion
checks) · Haiku main + Opus advisor (cheapest main with strong planning) · Opus main + Opus
advisor (independent check on high-stakes work, cost second).

**Cache note**: toggling the advisor mid-session does **not** invalidate the main model's prompt
cache — unlike changing model or effort.

## Subagent sizing in practice

- **Opus 5 delegates to subagents more readily** than 4.8 and is strong at multi-agent
  coordination with writer-verifier patterns. Expect more fan-out; size it deliberately.
- **Opus 5 verifies its own work without being told.** Delete inherited instructions like
  "include a final verification step" or "use a subagent to verify" — on Opus 5 they cause
  **over-verification**. This does not apply to *independence*-motivated verifiers (a blind
  judge, a fresh-context red team): those defend against correlated error, not against
  laziness, and they stay.
- **Sonnet 5 is the documented pick for high-volume subagents** in multi-agent orchestration.
- **`low` effort is documented for subagents** doing simple, scoped work. It is a real setting,
  not a smell.

## Long-horizon runs (>30 min, million-token budgets)

- `xhigh` exists for this shape of work.
- Fable 5 is built for it: works autonomously with fewer mid-task check-ins, and pulls furthest
  ahead the longer the job runs.
- Set a large `max_tokens` — it caps thinking **plus** response text together.
- Consider a task budget so the model can pace itself, rather than exposing a raw countdown.

## What this skill will not tell you

Whether the pairing is *worth it* for your workload. Benchmark claims about advisor cost/quality
ratios move with every release; measure on your own evals rather than quoting a number from a
launch post.
