# runtime-knobs — where model and effort actually live

> Stamped **2026-09-25** (Claude Code changelog through 2.1.281; claude-api skill bundled with
> 2.1.280). Codex, generic-harness and org-clamp sections are *carried* from 2026-07-29 (EX-3/EX-4). Never emit a parameter a runtime does not support: map to the nearest
> supported setting and state the degradation in that agent's report line.

## Claude Code — session

| Knob | Surfaces |
|---|---|
| Model | `/model`, `--model`, `ANTHROPIC_MODEL`, the `model` setting |
| Effort | `/effort`, `--effort`, `CLAUDE_CODE_EFFORT_LEVEL`, the `effortLevel` setting |
| Advisor | `/advisor`, `--advisor`, the `advisorModel` setting |

**Aliases**: `default` (clears the override) · `best` · `fable` · `opus` (= Opus 5.5 since
2.1.280) · `sonnet` · `haiku` · `sonnet[1m]` · `opus[1m]` · `opusplan` (Opus in plan mode → Sonnet
for execution). An alias's target depends on the surface — `fable` and `best` keep resolving to
**Fable 5** (not 5.1) in Claude apps gateway sessions (2.1.257) — so a plan that must be checked
names the resolved ID; `check_plan` gives no model-specific verdict for an alias.

**Persistence gotchas**
- `low` / `medium` / `high` / `xhigh` persist across sessions when set interactively.
  **`max` applies to the current session only** — unless set via `CLAUDE_CODE_EFFORT_LEVEL`.
- `/effort` saves a level **per model** (2.1.251). A level saved before that change does **not**
  apply to newly released models such as Opus 5.5 — they start at their default until you pick a
  level (2.1.280). The API default for Opus 5.5 is `medium`; Claude Code's own start level for it
  is not observed here (U2) — **confirm with `/effort`** rather than assuming.
- Opus 4.7 / 4.8 / Fable 5 no longer hold their launch-default effort over `/effort` in `-p` or the
  Agent SDK, a project/managed/`--settings` `effortLevel`, or a per-model level (2.1.280);
  `--effort` lifts a new model's default-effort hold for that session only (2.1.257).
- `ultracode` is a **Claude Code setting, not an effort level**: it sends `xhigh` *and* has Claude
  orchestrate dynamic workflows. Current session only. Not accepted by the persisted
  `effortLevel` setting or by `CLAUDE_CODE_EFFORT_LEVEL`.

## Claude Code — subagents (⚠ the asymmetry that bites)

| Surface | Model | Effort |
|---|---|---|
| **Agent tool call** | ✅ `model` parameter | ❌ **no per-call effort** |
| **Workflow `agent()`** | ✅ `opts.model` | ✅ `opts.effort` (`low`…`max`) |
| Agent type (`.claude/agents/*.md`) frontmatter | ✅ `model` field | ✅ frontmatter `effort:` (2.1.78 plugin agents, 2.1.80 skills/commands; honoured on pinned-default models since 2.1.267) |
| `CLAUDE_CODE_SUBAGENT_MODEL` | ✅ (all subagents) | ❌ |

**Consequence**: a bare Agent tool call cannot express an effort — the subagent inherits the
session effort. To pin effort per agent, use a Workflow `opts.effort`, or spawn an **agent type
whose frontmatter sets `effort:`**. Only when neither route exists, say so in the report as
`degraded:effort-not-expressible` rather than emitting a setting that will not take.

**Fork ≠ fresh.** Subagent forking is **on by default** (2.1.232): a `fork` subagent inherits the
full conversation and prompt cache. A verifier whose value is *independence* (blind judge,
fresh-context red team) must be spawned as a **non-fork** subagent or a separate session, or it
shares its author's context — and its errors (claude5-family ADC5). Report it with `non-fork`.
Background spawning (also default since 2.1.232) saves wall time, not quality.

Subagents inherit the session advisor and re-check the pairing against their own model.

## Claude API

```jsonc
{
  "model": "claude-opus-5-5",
  "max_tokens": 64000,          // raise this at xhigh/max (64k–128k) — caps thinking + text together
  "output_config": { "effort": "high" }   // low | medium | high | xhigh | max — omitted = model default (5.5: medium)
}
```

- `effort` is **request-level**: to change it later, set it on the next request.
- Do **not** pass `adaptive` as an effort value — that is a *thinking* mode, not an effort level.
- Changing top-level effort between requests **breaks the cached prefix**. Pick a level at the
  start of a cached session and hold it, or use per-message effort (beta,
  `mid-conversation-output-config-2026-07-01`) on Opus 5.5 / Fable 5.1 / Mythos 5.1 / Opus 5.
- Opus 5.5 / Fable 5.1 / Fable 5: **no `thinking` field** (or `adaptive`) — `disabled` or
  `budget_tokens` returns **400 at any effort**. Opus 5 (legacy): `disabled` 400s only at `xhigh`/`max`.
- **Task budgets** are an API feature (beta; Opus 5.5 supports them): set from the loop's p90 token
  usage; advisory, not a stop. They are **not available in Claude Code** — there, bound a run with
  `/goal`, agent `maxTurns` (a subagent stopping at it returns output marked *partial*, 2.1.246) or, on
  Managed Agents, a session budget (claude5-family ADC5).

## Codex CLI

- Model: `model` in config, or `codex exec -c model=...`
- Effort: `model_reasoning_effort`, ladder `minimal < low < medium < high < xhigh`
- Mapping: `max → xhigh`, `xhigh → xhigh`, `high → high`, `medium → medium`, `low → low`.
  There is no `max`; state the substitution.

## Generic harnesses

| Runtime exposes | Do | Report |
|---|---|---|
| A named effort ladder | map by name; missing level → nearest by rank, ties upward | note the substitution |
| Only a thinking on/off toggle | `high`+ → on; `low`/`medium` → judgement call, default on | `degraded:binary-toggle` |
| No effort knob | emit the model choice only | `degraded:no-effort-knob` |

## Org-level clamps

Enterprise admins can cap the maximum effort per model per custom role. Above the cap it runs
**at the cap** — with a warning in interactive/plain-text runs, but **silently** in JSON,
`stream-json`, and background agents. If a plan depends on `max`, verify it actually applied
rather than assuming.
