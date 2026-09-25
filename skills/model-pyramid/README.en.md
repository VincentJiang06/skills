# model-pyramid

> Right-size **model + effort** at the moment you open a session, spawn subagents, or decide whether to attach an advisor — it advises, it never acts for you.

**English** · [简体中文](README.md) · version 1.1.0

## The two axes

This is the core of the skill; everything else unfolds from it:

- **Claude had the context, tried — at higher effort too — and was still wrong → capability gap → change the MODEL.**
- **Claude was wrong because it skipped a file, didn't run the tests, or didn't double-check → thoroughness gap → change the EFFORT.**

**Effort is the main knob for "how deeply to think" — but not only that.** It governs **every token in the response — text, tool calls, thinking**: how many files get read, how many tool calls are made, how much re-checking happens, how far a multi-step task runs before reporting back. **Lower effort ⇒ fewer tool calls.**

⛔ **Hence the corollary that matters most:** search / exploration / repeated tool calling is the **last** place to save effort. Cutting a search agent's effort buys an agent that **stops looking**. Keep it or raise it — but don't reflexively jump to `xhigh`: Opus 5.5's guidance reserves `xhigh`/`max` for work where the gain is **measured**.

## Defaults

1. **Model** — subagents inherit the session model by default. Inheriting is the right default; to override it, you must be able to say why.
2. **Effort** — **write it out explicitly.** On the API, omitted = *that model's own* default (in Claude Code a bare Agent-tool call inherits the **session's** effort instead), and the defaults differ: **Opus 5.5 is `medium`** (the current default Opus); Fable 5.1, Opus 5 and Sonnet 5 are `high`; Haiku 4.5 has no effort knob. A plan written in the Opus 5 era to "leave it at default" runs **one level lower** on 5.5.
3. **Tune with evals, not by feel.** Effort settings **carried over from an older model are all re-swept**, never reused.

## Sizing a fan-out

**Classify per task, never one setting for the whole batch.** Spawning five mixed tasks at once = five decisions.

| Task shape | Model | Effort |
|---|---|---|
| **Peer work** — equal-difficulty shards, judge panels, adversarial verifiers, a single delegated deep task (**verifiers valued for independence — blind judges, fresh red teams — must be non-fork**: Claude Code forks by default, and a fork shares the author's context) | inherit | inherit |
| **Search / exploration** — codebase sweeps, web research, evidence gathering | inherit | **inherit or raise** |
| **High-volume homogeneous lookups** (~20+ cheap near-identical tasks) | inherit — *or* drop **one** tier (Opus→Sonnet) | one step down toward `low` — *or* inherit if you dropped the tier (**pick one, never both**, see the clamp below; lowering effort is usually safer) |
| **Long-horizon autonomy** (>30 min, million-token budgets) | start on Opus 5.5; move to Fable 5.1 only when the gap is **capability** | `xhigh` |
| Everything else | inherit | that model's default level, **written out** |

**Clamp:** move at most **one** knob per tier; two tiers is normal, a third needs a one-line reason; **no hard floor** — `low` is an officially documented level for subagents; argue for it, don't ban it (**this overturns v0.1.0's medium floor**); a level the user set explicitly is **followed as given**.

## Cost levers that are not "switch to a cheaper model"

- **Advisor** — a model **at least as strong**, called at **decision points** (before settling on a plan, when an error keeps recurring, before declaring done) rather than running throughout. It gets the whole conversation and gives guidance. Suits long tasks where most turns are routine but plan quality decides the outcome. The pairing must be legal for **every** model it attaches to; an executor with no row in the pairing table (Opus 5.5 today) **gets no advisor by default** until a test request with that exact pair succeeds.
- **`opusplan`** — Opus in plan mode, Sonnet for execution.
- **One effort step down** — usually a bigger and safer lever than one model tier down: it is gradual, and it applies per request.

## The cache trap

**Changing the model or the top-level effort invalidates the prompt cache.** Pick the levels at the start of a cached session and hold them; to vary effort, vary it across workloads, or use **per-message effort (beta)**, which keeps the cache on Opus 5.5 / Fable 5.1 / Opus 5. (Switching the advisor does **not** invalidate the cache.)

## Thinking

**Thinking is always on for Opus 5.5, Fable 5.1 and Fable 5:** sending `thinking:disabled` or `budget_tokens` returns 400 at **any** effort — remove the field and lower effort to save instead. (Opus 5 returns 400 only at `xhigh`/`max`.)

## Mechanical check

```bash
node scripts/check_plan.mjs '{"agents":[{"label":"reviewer","model":"claude-opus-5-5","effort":"max"}]}'
```

It checks only what is **deterministically decidable**: whether the level exists on that model (a missing level **falls back silently**, it is not an error); whether `max_tokens` is raised at `xhigh`/`max`; thinking legality (`disabled` or `budget_tokens` on an always-on model returns 400); whether the advisor pairing is in the API pairing table (checked for the session model and for each subagent's own model; a pair outside the table — e.g. a subagent on Opus 5.5 inheriting the advisor — gets an `advisor-pairing-unverified` **warning**: report-only, exit code unchanged, but never treated as verified); whether effort changes inside a cached session; and search effort cuts / both-knobs-dropped relative to the session's **effective effort** (resolved from the model default). **Unknown models are reported (`model-unknown`, listed first), never passed silently**; aliases (`opus`/`best`…) get no model-specific verdict. **Zero findings = no rule fired, not a verified plan**; nor does it judge whether your sizing is wise — that is the skill's judgment layer.

```bash
node evals/run_all.mjs        # dev repo only: P behavior fixtures · C script⇄doc consistency · L text guards
```

> `evals/` is a dev-time directory and is **not shipped with the skill** (excluded by `.clawhubignore`, not tracked by git); the installed skill does not contain it.

The **C group** is the most valuable: the support matrix in the script, each model's default effort and always-on-thinking flag (C6), and the `max_tokens` starting points must **say the same thing** as the tables in `references/`. Every number in this skill rots with each generation, and "the doc changed but the script didn't" is its most typical failure.

## Files

| File | Read it when |
|---|---|
| [`references/model-and-effort.md`](references/model-and-effort.md) | Level semantics, the support matrix, **each model's recommended starting point** (the fact most often wrongly carried across generations) |
| [`references/orchestration.md`](references/orchestration.md) | Advisor pairing legality and cost shape, opusplan, subagent patterns |
| [`references/runtime-knobs.md`](references/runtime-knobs.md) | Passing parameters to a specific runtime: Claude Code / Agent tool / Workflow / API / Codex |
| [`scripts/check_plan.mjs`](scripts/check_plan.mjs) | Machine-check a sizing plan |

⚠ **The runtime pitfall people hit most:** **a single Agent-tool call has a `model` parameter but no effort parameter** — the subagent can only inherit the session's effort. To pin effort per agent, use Workflow's `agent(prompt, {model, effort})`, or an **agent type whose frontmatter sets `effort:`** (`.claude/agents/*.md`). Only when neither route exists do you honestly report `degraded:effort-not-expressible`.

## When

Before the **first** subagent spawn of any fan-out; when asked "what model and effort should this session / this worker get"; when considering an advisor; or `$model-pyramid`.

**Not for** — API price shopping; the **structure** of a loop or workflow (that is [`loop-constructor`](../loop-constructor/)'s job); prompt writing.

## Staleness

`metadata.model_baseline` is the **stamp** on this skill's facts: `claude-opus-5-5 · effort high · Claude Code 2.1.280 · facts read 2026-09-25`.
**Every number here will expire.** **Any point version (e.g. 5.1, 5.5) or a silent weight swap under the same name** ⇒ targeted re-check of defaults, thinking legality, pairings and whatever facts it touches; **a new generation** ⇒ full re-sweep, including your own evals. A `model-unknown` from `check_plan` is the signal that this has already happened.

## Known residuals (1.1.0)

- **Repeated advisor warning:** when the advisor itself is an alias (e.g. `opus`) or an unlisted model (e.g. `claude-opus-5-5`), `advisor-pairing-unverified` is reported once on the session line and then again for **each distinct subagent model** (4 subagents → 5 identical-meaning warnings). Noise only — it doesn't block and the conclusion is right; the fix budget is spent, so it is registered for the next A42 re-check.
- Other open items (all P3, see CHANGELOG): no fixture covers `max-tokens-low`; two assertions guard the deleted code `advisor-weaker`; the session line itself gets no effort/thinking check; an omitted subagent effort is not resolved from the model default; `{"agents":[null]}` exits 1 instead of 2; the `max` guidance still cites the Opus 4.7 table; trigger accuracy is unmeasured.

Full spec: [SKILL.md](SKILL.md)
