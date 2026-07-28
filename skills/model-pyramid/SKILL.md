---
name: model-pyramid
description: >-
  Right-size MODEL + EFFORT for the session and for each subagent at fan-out time,
  and decide whether to attach an advisor. Two axes: capability gap → change model;
  thoroughness gap → change effort. Use when spawning / fanning out / delegating
  subagents, or when asked which model or effort something should get:
  "$model-pyramid". NOT API price shopping.
license: MIT
metadata:
  version: "1.0.0"
  model_baseline: "claude-5 family (Fable 5 / Opus 5 / Sonnet 5 / Haiku 4.5) · docs read 2026-07-29"
---

# model-pyramid

Pick **model** and **effort** for the session and for every subagent you spawn, then say so
in one line each. Framing is **right-sizing**: assign what the work needs. This skill
recommends and reports — it never spawns agents, edits configs, or blocks you.

> **Everything numeric here is dated.** Ladders, defaults and rosters change every model
> generation. `metadata.model_baseline` is the stamp. When the family changes, re-verify
> against live docs before trusting a number in this skill — and re-sweep your own evals.

## The two axes (use these, not a rule table)

- **Claude had the context, tried, and still got it wrong → capability gap → change the MODEL.**
- **Claude got it wrong by skipping a file, not running tests, not double-checking → thoroughness gap → change the EFFORT.**

Effort is **not** "thinking depth". It governs *all tokens in the response — text, tool calls,
and thinking*: how many files get read, how many tool calls get made, how much gets verified,
how far a multi-step task runs before checking in. **Lower effort ⇒ fewer tool calls.**

⛔ **The corollary that kills the most common mistake**: search / exploration / repeated tool
calling is the *last* place to economise on effort. Official guidance names "exploratory tasks
such as repeated tool calling, detailed web search, and knowledge-base search" as a reason to
go **`xhigh`**. Cutting effort on a search agent buys an agent that stops looking.

## Defaults: start here, move on evidence

1. **Model** — a subagent inherits the session model unless you say otherwise. Inheriting is
   the correct default; override only for a reason you can name.
2. **Effort** — the default is **`high`** on every model that supports effort. Setting `high`
   is byte-identical to omitting the parameter. (Exception: Opus 4.7 defaults to `xhigh`.)
3. **Adjust with evals, not vibes.** Step down where quality holds, up where it doesn't.
   Carrying settings over from an earlier model generation ⇒ **re-sweep**, don't reuse.

## Sizing a fan-out

Classify **per task, never per batch**. One spawn of five mixed tasks gets five decisions.

| Task shape | Model | Effort | Why |
|---|---|---|---|
| **Peer co-work** — equal-difficulty shards, judge panels, adversarial verifiers, one delegated deep task | inherit | inherit | It is the same work, split. Cutting either knob cuts the work. |
| **Search / exploration** — codebase sweep, web research, evidence gathering | inherit | **inherit or raise** | Effort governs tool-call volume. This is the axis you *raise* for search. |
| **High-volume homogeneous lookups** (~20+ cheap, near-identical) | drop **one** tier (Opus→Sonnet) | `low`–`medium` | The documented home of `low`: "simpler tasks that need the best speed and lowest costs, such as subagents". |
| **Long-horizon autonomous run** (>30 min, token budgets in the millions) | Fable 5 if available, else top tier | `xhigh` | `xhigh` is defined for exactly this. |
| **Anything else** | inherit | default (`high`) | No reason to move a knob ⇒ don't move it. |

**Clamps**
- At most **one knob per layer** — one tier down *or* one effort step, not both.
- Two layers is the norm. A third layer, or a bottom-tier pick from a frontier session, needs
  a one-line justification in the report.
- **No hard floor.** `low` is a documented, legitimate subagent setting — justify it, don't ban
  it. (This reverses v0.1.0's `medium` floor, which predated the current ladder.)
- An explicit user override **wins verbatim**. Advisory means advisory.

## Before you emit `xhigh` or `max`

- **Raise `max_tokens`** — 64k is the documented starting point. It is a hard cap on thinking
  **plus** response text together, and at these levels the model needs room to think *and* act
  across subagents and tool calls.
- **Check the level exists on that model** — an unsupported level silently falls back to the
  highest supported level at or below it.
- **On Opus 5, thinking cannot be disabled at `xhigh`/`max`** — that combination returns 400.
- **`max` is for genuinely frontier problems.** On most workloads it adds significant cost for
  small gains, and on structured-output tasks it can cause overthinking.
- **Effort does not shorten prose.** On Opus 5, lowering effort does not reliably shorten the
  visible response — if you want it shorter, say so in the prompt.

## Cost levers that are not "pick a cheaper model"

- **Advisor** — a stronger model consulted *at decision points* rather than running throughout.
  Fits long multi-step tasks where most turns are routine but plan quality decides the outcome;
  adds little on short tasks. → `references/orchestration.md`
- **`opusplan`** — Opus for plan mode, Sonnet for execution. A free structural win when the task
  genuinely splits that way.
- **Effort down-step** — usually a bigger and safer lever than a model down-step: it degrades
  gracefully and applies per request.

## The cache trap

Changing **model or effort invalidates the prompt cache**. Pick a level at the start of a cached
conversation and hold it; vary effort *across* workloads, not *within* one long session.
(Toggling the advisor does **not** invalidate the cache.)

## Report

One line per agent:

```
<label>  model=<alias|id>  effort=<level>  rule=<peer|search|bulk|long-horizon|default|override>  [flags]
```

Flags worth emitting: `inherited`, `justified:<reason>`, `override`, `max_tokens-raised`,
`cache-hold`, `advisor:<model>`, `degraded:<what the runtime could not express>`.

## Files

| File | Load when |
|---|---|
| `references/model-and-effort.md` | per-model ladder, support matrix, documented start points |
| `references/orchestration.md` | advisor pairing, opusplan, subagent patterns, cost shape |
| `references/runtime-knobs.md` | emitting knobs for a concrete runtime (Claude Code / Agent tool / Workflow / API / Codex) |
| `scripts/check_plan.mjs` | validate a plan mechanically |

## Mechanical check

```bash
node scripts/check_plan.mjs '{"agents":[{"label":"reviewer","model":"claude-opus-5","effort":"max"}]}'
```

Checks only what is deterministic: level exists on that model, `max_tokens` raised at
`xhigh`/`max`, Opus 5 thinking×effort conflict, advisor pairing legality, effort varied inside a
cached session, and both-knobs-dropped. It does **not** judge whether your sizing is wise.
