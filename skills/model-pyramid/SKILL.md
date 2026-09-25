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
  version: "1.1.0"
  model_baseline: "claude-opus-5-5 · effort high · Claude Code 2.1.280 · facts read 2026-09-25 against claude5-family.md base 2026-09-24"
---

# model-pyramid

Pick **model** and **effort** for the session and for every subagent you spawn, then say so
in one line each. This skill recommends and reports — it never spawns agents, edits configs,
or blocks you.

> **Everything numeric here is dated** (stamp: `metadata.model_baseline`). **Any point version
> (e.g. 5.1, 5.5) or a silent weight swap under the same name** ⇒ re-verify defaults, thinking,
> pairing and what it touched; **a new model generation** ⇒ full re-sweep, your evals included.

## The two axes (use these, not a rule table)

- **Claude had the context, tried — at higher effort too — and still got it wrong → capability gap → change the MODEL.**
- **Claude got it wrong by skipping a file, not running tests, not double-checking → thoroughness gap → change the EFFORT.**

Effort is the main thinking-depth control — **and more**: it governs *all* response tokens (text,
tool calls, thinking) — how many files get read, how much gets verified, how far a task runs
before checking in. **Lower effort ⇒ fewer tool calls.**

⛔ **The corollary that kills the most common mistake**: search / exploration / repeated tool
calling is the *last* place to economise on effort. Cutting effort on a search agent buys an
agent that stops looking. Hold it or raise it (not to `xhigh` by reflex — see below).

## Defaults: start here, move on evidence

1. **Model** — subagents inherit the session model; that is the correct default. Override only
   for a reason you can name.
2. **Effort** — **set it explicitly.** Omitted on the API = *that model's* default: **Opus 5.5
   `medium`**; Fable 5.1, Opus 5, Sonnet 5 `high`; Haiku 4.5 none. A bare Agent-tool call inherits
   the *session's* (`references/runtime-knobs.md`).
3. **Adjust with evals, not vibes.** Step down where quality holds, up where it doesn't.
   Carrying settings over from an earlier model generation ⇒ **re-sweep**, don't reuse.

## Sizing a fan-out

Classify **per task, never per batch**. One spawn of five mixed tasks gets five decisions.

| Task shape | Model | Effort | Why |
|---|---|---|---|
| **Peer co-work** — equal-difficulty shards, judge panels, adversarial verifiers, one delegated deep task | inherit | inherit | It is the same work, split. Cutting either knob cuts the work. An *independence* verifier (blind judge, fresh red team) is **non-fork** — a fork (Claude Code default) shares its author's context. |
| **Search / exploration** — codebase sweep, web research, evidence gathering | inherit | **inherit or raise** | Effort governs tool-call volume. This is the axis you *raise* for search. |
| **High-volume homogeneous lookups** (~20+ cheap, near-identical) | inherit — *or* drop **one** tier (Opus→Sonnet) | one step down — *or* inherit if the tier dropped | **One knob, not both** (clamp); effort is usually the safer one. |
| **Long-horizon autonomous run** (>30 min, token budgets in the millions) | Opus 5.5; Fable 5.1 when the gap is capability | `xhigh` | `xhigh` is defined for exactly this. |
| **Anything else** | inherit | the model's default, written out | No reason to move a knob ⇒ don't move it — but name the level. |

**Clamps**
- At most **one knob per layer** — one tier down *or* one effort step, not both.
- Two layers is the norm. A third layer, or a bottom-tier pick from a frontier session, needs
  a one-line justification in the report.
- **No hard floor.** `low` is a documented, legitimate subagent setting — justify it, don't ban it.
- An explicit user override **wins verbatim**. Advisory means advisory.

## Before you emit `xhigh` or `max`

- **Raise `max_tokens`** — 64k is the documented start, 128k for long agentic turns (Opus 5.5
  thinks more per turn; Fable 5.1 wants it large from `high` up). It caps thinking **plus** text.
- **Check the level exists on that model** — an unsupported level silently falls back to the
  highest supported level at or below it.
- **Thinking is always on for Opus 5.5 / Fable 5.1 / Fable 5** — `thinking:disabled` or
  `budget_tokens` ⇒ 400 at *any* effort; lower effort instead. (Opus 5: 400 only at `xhigh`/`max`.)
- **`max` is for genuinely frontier problems** — elsewhere it adds cost for small gains. On Opus
  5.5, reserve `xhigh`/`max` for a *measured* quality gain.

## Cost levers that are not "pick a cheaper model"

- **Advisor** — a stronger model consulted only *at decision points*. Fits long multi-step
  tasks where most turns are routine but plan quality decides the outcome; adds little on short
  tasks. Legal for *every* model it attaches to; no pairing row (Opus 5.5 today) ⇒ **no advisor**
  until a test request with that pair succeeds. → `references/orchestration.md`
- **`opusplan`** — Opus in plan mode, Sonnet for execution: free when the task genuinely splits that way.
- **Effort down-step** — usually a bigger, safer lever than a model down-step: it degrades
  gracefully and applies per request.

## The cache trap

Changing **model or top-level effort invalidates the prompt cache**. Hold one level per cached
conversation — vary effort *across* workloads, or use **per-message effort (beta)**, which keeps
the cache on Opus 5.5 / Fable 5.1 / Opus 5.

## Report

One line per agent:

```
<label>  model=<alias|id>  effort=<level>  rule=<peer|search|bulk|long-horizon|default|override>  [flags]
```

Flags worth emitting: `inherited`, `justified:<reason>`, `override`, `max_tokens-raised`,
`cache-hold`, `advisor:<model>`, `non-fork`, `degraded:<what the runtime could not express>`
(`effort-not-expressible` only if neither Workflow `opts.effort` nor agent-type `effort:`
frontmatter is available). Each line carries its rule + flags, so it survives compaction.

## Files

| File | Load when |
|---|---|
| `references/model-and-effort.md` | a non-session model is named, or you need a model's default, levels or thinking legality |
| `references/orchestration.md` | an advisor, opusplan, verifier/judge fan-out or >30-min run is on the table |
| `references/runtime-knobs.md` | emitting knobs for a concrete runtime (Claude Code, Agent tool, Workflow, agent frontmatter, API, Codex) |
| `scripts/check_plan.mjs` | a plan JSON exists — run it, don't read it |

## Mechanical check

```bash
node scripts/check_plan.mjs '{"agents":[{"label":"reviewer","model":"claude-opus-5-5","effort":"max"}]}'
```

Checks only table facts (levels, `max_tokens`, thinking, advisor pairing, cache, search/both-knobs
cuts vs the session's resolved effort). Unknown models are **reported** (`model-unknown`: re-verify
this skill), never passed; aliases get no model-specific verdict. **Zero findings = nothing fired,
not "verified"**; whether your sizing is wise is not judged.
