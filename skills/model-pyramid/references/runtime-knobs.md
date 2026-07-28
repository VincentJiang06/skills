# runtime-knobs — where model and effort actually live

> Stamped **2026-07-29**. Never emit a parameter a runtime does not support: map to the nearest
> supported setting and state the degradation in that agent's report line.

## Claude Code — session

| Knob | Surfaces |
|---|---|
| Model | `/model`, `--model`, `ANTHROPIC_MODEL`, the `model` setting |
| Effort | `/effort`, `--effort`, `CLAUDE_CODE_EFFORT_LEVEL`, the `effortLevel` setting |
| Advisor | `/advisor`, `--advisor`, the `advisorModel` setting |

**Aliases**: `default` (clears the override) · `best` (Fable 5 where available, else latest Opus)
· `fable` · `opus` · `sonnet` · `haiku` · `sonnet[1m]` · `opus[1m]` · `opusplan` (Opus in plan
mode → Sonnet for execution).

**Persistence gotchas**
- `low` / `medium` / `high` / `xhigh` persist across sessions when set interactively.
  **`max` applies to the current session only** — unless set via `CLAUDE_CODE_EFFORT_LEVEL`.
- First run of Fable 5 / Opus 4.8 / Opus 4.7 applies **that model's default effort** and holds it
  across sessions until you make an explicit choice. **Opus 5 has no such hold** — a level you
  set earlier carries over.
- `/effort` in non-interactive (`-p`) mode applies to the current session only and **cannot
  release the model-default hold** (it reports `Not applied`); pass `--effort` at launch instead.
- `ultracode` is a **Claude Code setting, not an effort level**: it sends `xhigh` *and* has Claude
  orchestrate dynamic workflows. Current session only. Not accepted by the persisted
  `effortLevel` setting or by `CLAUDE_CODE_EFFORT_LEVEL`.

## Claude Code — subagents (⚠ the asymmetry that bites)

| Surface | Model | Effort |
|---|---|---|
| **Agent tool** | ✅ `model` parameter | ❌ **no effort parameter** |
| **Workflow `agent()`** | ✅ `opts.model` | ✅ `opts.effort` (`low`…`max`) |
| Subagent frontmatter (`.claude/agents/*.md`) | ✅ `model` field | ❌ |
| `CLAUDE_CODE_SUBAGENT_MODEL` | ✅ (all subagents) | ❌ |

**Consequence**: if your sizing decision has an effort component, the Agent tool cannot express
it — the subagent inherits the session effort. To pin effort per agent you must go through a
Workflow. Say so in the report as `degraded:effort-not-expressible` rather than silently
emitting a setting that will not take.

Subagents inherit the session advisor and re-check the pairing against their own model.

## Claude API

```jsonc
{
  "model": "claude-opus-5",
  "max_tokens": 64000,          // raise this at xhigh/max — caps thinking + text together
  "output_config": { "effort": "medium" }   // low | medium | high | xhigh | max
}
```

- `effort` is **request-level**: to change it later, set it on the next request.
- Do **not** pass `adaptive` as an effort value — that is a *thinking* mode, not an effort level.
- Changing effort between requests **breaks the cached prefix**. Pick a level at the start of a
  cached session and hold it.
- Opus 5 only: `thinking: {"type":"disabled"}` with effort `xhigh`/`max` returns **400**.

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
