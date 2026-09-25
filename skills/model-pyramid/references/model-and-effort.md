# model-and-effort — the roster and the ladder

> Stamped **2026-09-25** against `claude5-family.md` (base 2026-09-24), the models overview and the
> Opus 5.5 / Fable 5.1 what's-new pages. Every number below rots. Re-verify at **any point version
> or silent weight swap** (targeted), and fully at a new generation; a stale number is unknown, not truth.
> Rows marked *carried* were not re-audited this wave (4.x, Sonnet 5, Haiku 4.5 — exemption EX-2).

## The effort ladder

Five levels. The **default differs per model** (Opus 5.5: `medium`; most others: `high`) — see the
start-point table. Omitting the parameter means *that model's* default, so set it explicitly.

| Level | What it is for |
|---|---|
| `low` | Most efficient; significant token savings with some capability reduction. Documented use: "simpler tasks that need the best speed and lowest costs, **such as subagents**" — classification, quick lookups, high-volume work. |
| `medium` | Balanced; moderate token savings. Agentic tasks needing a balance of speed, cost and performance. |
| `high` | Complex reasoning, difficult coding, agentic tasks. Default on Fable 5.1, Opus 5, Sonnet 5 — **not** on Opus 5.5. |
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
| Opus 5.5, Fable 5.1 (= Mythos 5.1), Fable 5 (legacy) | `low` `medium` `high` `xhigh` `max` |
| Opus 5 (legacy), Sonnet 5, Opus 4.8, Opus 4.7 | `low` `medium` `high` `xhigh` `max` |
| Opus 4.6, Sonnet 4.6 | `low` `medium` `high` `max` (**no `xhigh`**) |

Setting an unsupported level does not error — it **falls back to the highest supported level at
or below** what you asked for (`xhigh` runs as `high` on Opus 4.6). Enterprise orgs can also cap
levels per model per role; above the cap it silently runs at the cap in JSON/background modes.

## Documented start points, per model

These differ per model — this is the part people most often carry over wrongly.

`Default` = the API default when `effort` is omitted (models overview, "Default effort" row).
`Thinking` = whether `thinking: {"type":"disabled"}` is refused. `scripts/check_plan.mjs` carries the
same two columns; a dev-only harness check (C6, not shipped with the skill) binds them.

| Model | Default | Thinking | Where to start | Notes |
|---|---|---|---|---|
| **Opus 5.5** (`claude-opus-5-5`) | `medium` | always on (`disabled` or `budget_tokens` → 400) | **`medium`, set explicitly**; sweep `low`–`high` on your evals | Current default Opus (Claude Code 2.1.280). At `medium` it matches or beats Opus 5 at `high` on coding/knowledge work; `low` comes close on several coding evals. Thinks **more per turn** than Opus 5 at the same level, most at `xhigh`/`max` — leave `max_tokens` room (128k has worked for long agentic turns). Reserve `xhigh`/`max` for a *measured* gain. Effort level names are not the same amount of thinking across models. (src-prompting-claude-opus-5-5 "Calibrate effort"; ADC2b) |
| **Fable 5.1** (`claude-fable-5-1`), Mythos 5.1 (`claude-mythos-5-1`, same model) | `high` | always on | `high`; `xhigh` for the most capability-sensitive work | At `low` it **calls search/retrieval tools less often** and answers from memory — raise effort for turns that need fresh information. At `xhigh`/`max` it can think long before a long deliverable: leave `max_tokens` room. (src-whats-new-fable-5-1 "Changed from Claude Fable 5"; ADC1b) |
| **Sonnet 5** (`claude-sonnet-5`) | `high` | adaptive, on by default | `high` (*carried*) | `xhigh` for the hardest coding/agentic work. `medium` = cost-saving step-down, comparable to Sonnet 4.6 at `high`. `low` for high-volume or latency-sensitive workloads. |
| **Opus 5** (`claude-opus-5`, legacy) | `high` | on by default; `disabled` accepted only at `high` or below | `high` | Step up to `xhigh` for demanding coding/agentic work, `max` when the task justifies unconstrained spend. Use `low`/`medium` **liberally** as the primary control for cost and latency wherever evals show quality holds. Converts extra effort into results more reliably than any earlier Opus. Strong at `low`/`medium`; code review stays accurate at lower levels. |
| **Fable 5** (`claude-fable-5`), Mythos 5 (`claude-mythos-5`) — legacy | `high` | always on | `high` | Effort is *the* primary control for trading intelligence vs latency vs cost. `xhigh` for the most capability-sensitive work; `medium`/`low` for routine — and lower Fable 5 settings "still perform well and often exceed `xhigh` performance on prior models". At `high`/`xhigh` set a large `max_tokens`. |
| **Opus 4.8 / 4.7** (`claude-opus-4-8`, `claude-opus-4-7`) — *carried* | `high` | — (not re-audited) | **`xhigh`** for coding and agentic use | `high` as the minimum for intelligence-sensitive work; step to `medium`/`low` only once measured. (Opus 4.7's API default is `high` but its *recommended* start is `xhigh`; in Claude Code, Opus 4.7 defaults to `xhigh`.) |
| **Opus 4.6, Sonnet 4.6** (`claude-opus-4-6`, `claude-sonnet-4-6`) — *carried* | `high` | — (not re-audited) | `high` | No `xhigh` (see support matrix). |
| **Haiku 4.5** (`claude-haiku-4-5`) — *carried* | none (no effort knob) | extended | n/a for effort | Speed and scale tier; rivals Sonnet 4.0-class reasoning. Can *call* an advisor but cannot *be* one. |

⛔ **Do not port effort settings across generations.** The docs are explicit: if you carried
effort settings over from an earlier model, run a fresh effort sweep on your evals rather than
reusing them.

## Model roster — what each one is for

| Model | Shape of work | Operational notes |
|---|---|---|
| **Opus 5.5** | The default start for most workloads (models overview): long-running agentic coding and knowledge work; sustains multi-hour autonomous runs with parallel subagents better than Opus 5. $4/$20 per MTok — 40% of Fable 5.1's $10/$50. | 1M context, 128k output, thinking always on, default effort `medium`. Behavioural notes below for Opus 5 are a *reasonable start* on 5.5, not re-tested (EX-6). |
| **Fable 5.1** | Demanding reasoning and long-horizon agentic work, or when Opus 5.5 at higher effort still falls short on your evals. | Thinking always on. May issue one tool call per turn where Fable 5 batched several (costs round trips, not quality). |
| **Fable 5** (legacy) | Long, complex, multi-step; works autonomously with fewer mid-task check-ins. | Thinking always on; still served. `fable`/`best` keep resolving to it in Claude apps gateway sessions (Claude Code 2.1.257). |
| **Opus 5** (legacy) | Complex agentic coding and enterprise work. Step-change over 4.8 in deep reasoning, agentic/long-horizon tasks, and test-time compute scaling. | 1M context (default *and* max), 128k max output, thinking on by default. **Verifies its own work unbidden** — remove inherited "add a verification step" / "use a subagent to verify" instructions, they cause over-verification. **Delegates to subagents more readily.** Responses run longer than 4.8's. |
| **Sonnet 5** | Everyday coding, writing, analysis, research. Explicitly the pick for **high-volume subagents in multi-agent orchestration**. | Balance of performance, cost, speed. |
| **Haiku 4.5** | Everyday light requests, speed and scale. | Cannot serve as an advisor. |

## Interactions worth remembering

- **Opus 5.5 / Fable 5.1 / Fable 5 (and Mythos 5.x): thinking is always on** — `thinking:
  {"type":"disabled"}` or a manual `budget_tokens` returns **400 at any effort**. Drop the field (or
  send `adaptive`) and lower effort where you used to disable thinking.
- **Opus 5 (legacy): thinking disabled + `xhigh`/`max` ⇒ 400.** Either keep thinking off and stay at
  `high` or below, or keep the level and drop the `thinking` field.
- **`max_tokens` is a hard cap on thinking + response text together.** At `xhigh`/`max`, start
  at 64k and tune (model-migration guidance); the cost-optimization guidance and the Opus 5.5
  prompting guide go to 128k for long agentic turns at `xhigh`/`max` — both are documented (DS-1).
- **Effort ≠ brevity on Opus 5.** Changing effort does not reliably shorten the visible answer;
  prompt for length instead. *Unverified on Opus 5.5* (no source this wave, U4).
- **Top-level effort changes invalidate the prompt cache** (so do model changes). Hold it constant
  inside one cached conversation, or use **per-message effort (beta)**, which keeps the cache on
  Opus 5.5, Fable 5.1 / Mythos 5.1 and Opus 5. In Claude Code, `/effort` on Fable 5.1 no longer
  invalidates the cache (2.1.260).
- **Thinking disabled on Opus 5** can occasionally emit a tool call as plain text or leak
  internal XML tags — prefer keeping thinking on and controlling cost with effort.
