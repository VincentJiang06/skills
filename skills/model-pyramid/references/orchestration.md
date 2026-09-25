# orchestration — advisor, opusplan, subagents, and where the cost actually goes

> Stamped **2026-09-25** (advisor-tool page fetched 2026-09-25; Claude Code changelog through
> 2.1.281). The advisor is a beta server tool on the Claude API and Claude Platform on AWS (not
> Bedrock / Google Cloud / Foundry); pairing rules change. Re-verify before relying on a row here.

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

The API's table (advisor-tool page, "Model compatibility", fetched 2026-09-25) — `check_plan`
carries the same lookup:

| Main model (executor) | Accepted advisors |
|---|---|
| Haiku 4.5, Sonnet 4.6 | Mythos/Fable 5.1, Mythos/Fable 5, Opus 5, Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 5, Sonnet 4.6 — *Haiku can call an advisor, never be one* |
| Sonnet 5 | Mythos/Fable 5.1, Mythos/Fable 5, Opus 5, Opus 4.8, Opus 4.7, Sonnet 5 |
| Opus 4.6 | Mythos/Fable 5.1, Mythos/Fable 5, Opus 5, Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 5 |
| Opus 4.7, Opus 4.8 | Mythos/Fable 5.1, Mythos/Fable 5, Opus 5, Opus 4.8, Opus 4.7 |
| Opus 5, Fable 5, Mythos 5 | Mythos/Fable 5.1, Mythos/Fable 5, Opus 5 |
| Fable 5.1, Mythos 5.1 | Mythos 5.1, Fable 5.1 only |

**Opus 5.5 is not in the pairing table at this baseline** — neither as executor nor as advisor
(U1). Any pairing that involves it is *unverified*: try it, and check it actually attached.

On the API an invalid pair returns **400**. In Claude Code an invalid advisor is simply **not
attached** — you get a notification, not an error. **Subagents inherit the configured advisor**
and re-run the pairing check against *their own* model, so a Sonnet subagent under an Opus
session may use an advisor the parent could not.

Claude Code offers **Fable 5 as an advisor again** for organisations with Fable access (2.1.232);
the earlier "dimmed in the picker" state is gone.

### Cost shape

Each call sends the whole conversation at the advisor's rates, and the advisor's own read is
**never cached** — every call reprocesses the transcript. But it fires at decision points, not
every turn, so *a faster main model + a stronger advisor typically costs less than running the
stronger model throughout*.

Useful pairings (the advisor page: Opus as advisor keeps total cost similar or lower; Fable 5.1
maximises the quality lift; the benefit shrinks as the executor's own capability approaches the
advisor's): Sonnet main + Opus advisor (routine work, escalate planning/failures/completion
checks) · Haiku main + Opus advisor (cheapest main with strong planning) · Opus main + Opus
advisor (independent check on high-stakes work, cost second).

**Cache note**: toggling the advisor mid-session does **not** invalidate the main model's prompt
cache — unlike changing model or effort.

## Subagent sizing in practice

- **Independence-motivated verifiers are non-fork.** Forking is on by default in Claude Code
  (2.1.232) and a fork inherits the full conversation — a "blind" judge spawned as a fork is not
  blind. Spawn it as a non-fork subagent or a separate session and report `non-fork`.
- **Async subagents save wall time, not quality** (Fable 5.1 migration guide: a lead that does not
  block on its subagents finishes sooner at similar quality, tokens and cost).
- *Opus 5 pattern, a reasonable start on 5.5 (not re-tested, EX-6):*
  **Opus 5 delegates to subagents more readily** than 4.8 and is strong at multi-agent
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

- **Start on Opus 5.5 at `xhigh`**; it sustains multi-hour autonomous runs with parallel
  subagents better than Opus 5. Move to **Fable 5.1** when evals at higher effort still fall short
  — i.e. when the gap is *capability* (two axes), not thoroughness (models overview).
- Set a large `max_tokens` — it caps thinking **plus** response text together (64k–128k).
- **Pacing, not stopping.** On the API, a task budget (beta) lets the model pace itself. On Opus
  5.5 multi-agent harnesses, an `elapsed 340s / 1200s` line appended to each message makes the
  team parallelise and finish sooner — it is **advisory**; if you need a hard stop, keep your own
  timeout, and check quality (under time pressure it may search and verify a little less).
  Lowering effort reduces the work itself; a budget mostly keeps more agents working in parallel.
- In **Claude Code** there is no task budget: use `/goal`, agent `maxTurns` (hitting it returns
  output marked partial) or, on Managed Agents, a session budget.
- Do not expose a raw context-window countdown (it induces early hand-off; claude5-family ADC1).

## What this skill will not tell you

Whether the pairing is *worth it* for your workload. Benchmark claims about advisor cost/quality
ratios move with every release; measure on your own evals rather than quoting a number from a
launch post.
