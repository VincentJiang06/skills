# model-and-effort — the roster and the ladder

> Stamped **2026-07-29** against Anthropic's model/effort docs. Every number below rots.
> Re-verify at the next family change; treat a stale number as unknown, not as truth.

## The effort ladder

Five levels. `high` is the default and is **identical to omitting the parameter**.

| Level | What it is for |
|---|---|
| `low` | Most efficient; significant token savings with some capability reduction. Documented use: "simpler tasks that need the best speed and lowest costs, **such as subagents**" — classification, quick lookups, high-volume work. |
| `medium` | Balanced; moderate token savings. Agentic tasks needing a balance of speed, cost and performance. |
| `high` | **Default.** Complex reasoning, difficult coding, agentic tasks. |
| `xhigh` | Extended capability for long-horizon work — long-running agentic and coding tasks (**over 30 minutes**) with token budgets in the millions. |
| `max` | Absolute maximum, no constraint on token spend. Deepest reasoning and most thorough analysis. |

Effort is a **behavioural signal, not a token budget**: at low effort Claude still thinks on
hard problems, just less than it would at a higher level for the same problem.

### What effort actually moves

It affects **all tokens** — text, tool calls and function arguments, and thinking. That is why
it is the right knob for *thoroughness* and the wrong knob to economise on *search*.

| Lower effort tends to | Higher effort may |
|---|---|
| combine operations into fewer tool calls | make more tool calls |
| make fewer tool calls | explain the plan before acting |
| proceed directly to action without preamble | give detailed summaries of changes |
| use terse confirmations | include more comprehensive comments |

## Support matrix

| Model | Levels |
|---|---|
| Fable 5 | `low` `medium` `high` `xhigh` `max` |
| Opus 5, Sonnet 5, Opus 4.8, Opus 4.7 | `low` `medium` `high` `xhigh` `max` |
| Opus 4.6, Sonnet 4.6 | `low` `medium` `high` `max` (**no `xhigh`**) |

Setting an unsupported level does not error — it **falls back to the highest supported level at
or below** what you asked for (`xhigh` runs as `high` on Opus 4.6). Enterprise orgs can also cap
levels per model per role; above the cap it silently runs at the cap in JSON/background modes.

## Documented start points, per model

These differ per model — this is the part people most often carry over wrongly.

| Model | Where to start | Notes |
|---|---|---|
| **Opus 5** | **`high`** (the default) | Step up to `xhigh` for demanding coding/agentic work, `max` when the task justifies unconstrained spend. Use `low`/`medium` **liberally** as the primary control for cost and latency wherever evals show quality holds. Converts extra effort into results more reliably than any earlier Opus. Strong at `low`/`medium`; code review stays accurate at lower levels. |
| **Fable 5** | **`high`** (the default) | Effort is *the* primary control for trading intelligence vs latency vs cost. `xhigh` for the most capability-sensitive work; `medium`/`low` for routine — and lower Fable 5 settings "still perform well and often exceed `xhigh` performance on prior models". Thinking cannot be turned off. At `high`/`xhigh` set a large `max_tokens`. |
| **Sonnet 5** | **`high`** (the default) | `xhigh` for the hardest coding/agentic work. `medium` = cost-saving step-down, comparable to Sonnet 4.6 at `high`. `low` for high-volume or latency-sensitive workloads. |
| **Opus 4.8 / 4.7** | **`xhigh`** for coding and agentic use | `high` as the minimum for intelligence-sensitive work; step to `medium`/`low` only once measured. (Opus 4.7's API default is `high` but its *recommended* start is `xhigh`; in Claude Code, Opus 4.7 defaults to `xhigh`.) |
| **Haiku 4.5** | n/a for effort | Speed and scale tier; rivals Sonnet 4.0-class reasoning. Can *call* an advisor but cannot *be* one. |

⛔ **Do not port effort settings across generations.** The docs are explicit: if you carried
effort settings over from an earlier model, run a fresh effort sweep on your evals rather than
reusing them.

## Model roster — what each one is for

| Model | Shape of work | Operational notes |
|---|---|---|
| **Fable 5** | Long, complex, multi-step; works autonomously with fewer mid-task check-ins. Pulls furthest ahead on long-horizon work. | Thinking always on; decides per step how much to think, steered by effort. |
| **Opus 5** | Complex agentic coding and enterprise work. Step-change over 4.8 in deep reasoning, agentic/long-horizon tasks, and test-time compute scaling. Frontier capability at half Fable 5's cost. | 1M context (default *and* max), 128k max output, thinking on by default. **Verifies its own work unbidden** — remove inherited "add a verification step" / "use a subagent to verify" instructions, they cause over-verification. **Delegates to subagents more readily.** Responses run longer than 4.8's. |
| **Sonnet 5** | Everyday coding, writing, analysis, research. Explicitly the pick for **high-volume subagents in multi-agent orchestration**. | Balance of performance, cost, speed. |
| **Haiku 4.5** | Everyday light requests, speed and scale. | Cannot serve as an advisor. |

## Interactions worth remembering

- **Opus 5: thinking disabled + `xhigh`/`max` ⇒ 400.** Either keep thinking off and stay at
  `high` or below, or keep the level and drop the `thinking` field.
- **`max_tokens` is a hard cap on thinking + response text together.** At `xhigh`/`max`, start
  at 64k and tune.
- **Effort ≠ brevity on Opus 5.** Changing effort does not reliably shorten the visible answer;
  prompt for length instead.
- **Effort changes invalidate the prompt cache** (so do model changes) because effort shapes the
  rendered prompt. Hold it constant inside one cached conversation.
- **Thinking disabled on Opus 5** can occasionally emit a tool call as plain text or leak
  internal XML tags — prefer keeping thinking on and controlling cost with effort.
