# runtime-mapping — the model/effort knobs across runtimes

On-demand reference for emitting the pyramid's (tier, effort) decision as a
concrete runtime's parameters. Never emit a parameter the runtime does not
support — map to the nearest supported notch and state the degradation in the
per-agent report line.

## Conceptual ladders

- Effort: `low < medium < high < max`. Subagent floor is `medium` — the low
  notch exists in the vocabulary but is never assigned to a subagent.
- Capability tiers, named by purpose (never by product catalog):
  - **frontier / opus-tier** — deepest reasoning. Illustrative example (will rot): claude-opus-4-5.
  - **mid / sonnet-tier** — strong general work. Illustrative example (will rot): claude-sonnet-4-5.
  - **small / haiku-tier** — light homogeneous lookups. Illustrative example (will rot): claude-haiku-4-5.

Those three are the ONLY illustrative model names in this skill — examples,
not a lookup table. Map any other stack by asking which of the three purposes
each model serves *in that stack*.

## Claude Code (Agent tool / Workflow `agent()` opts)

- Model knob: the Agent tool's `model` option takes tier-shaped values
  (`opus` / `sonnet` / `haiku`) — tiers map directly.
- Effort knob: where an `effort` / reasoning-effort option is exposed, map by
  name (`medium` / `high` / `max`). A surface that only offers a thinking
  on/off or budget switch is a binary toggle — see the generic table.

## Codex CLI

- Model knob: `model` in config / `codex exec -c model=...`.
- Effort knob: `model_reasoning_effort`, ladder `minimal < low < medium < high < xhigh`.
  Mapping: `max → xhigh`, `high → high`, `medium → medium`. `minimal` and `low`
  sit below the floor and are never emitted for subagents.
- Intake runs the same map in reverse: a session reporting `xhigh` reads as
  conceptual `max`, `minimal` as `low` (then the floor clamps it up).

## Generic harnesses

| Runtime exposes | Do | Report |
|---|---|---|
| A named `reasoning_effort`-style ladder | map by name; missing notch → nearest by rank, ties upward | note the substitution |
| Only a binary thinking toggle | recommendations are all ≥ medium → toggle ON | note "binary toggle: `<notch>` ≈ on" |
| No effort knob at all | emit only the model/tier choice | note "no effort knob; tier advice only" |

Degenerate cases (a ladder missing your notch, unknown notch names): pick the
nearest supported notch, never invent parameters, and state the degradation.
`mapToRuntime(effort, runtime)` in `scripts/decide.mjs` implements exactly
this table.
