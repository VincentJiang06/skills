---
name: model-pyramid
description: >-
  Right-size each subagent's MODEL + REASONING-EFFORT via 4 pyramid rules
  (peer co-work keeps both; search drops effort one notch, floor medium;
  ~20+ cheap lookups drop one model tier; else medium). Use when spawning /
  fanning out / delegating subagents, or sizing them: "$model-pyramid".
  NOT model shopping/pricing.
license: MIT
metadata:
  version: "0.1.0"
---

# model-pyramid

Advisory rule card for picking each **subagent's model + reasoning-effort** at
fan-out time, in a pyramid shape. Framing is **right-sizing (合理使用)**: assign
what the work needs — never pitch or log these choices as cost reduction. The
skill recommends and reports; it never spawns agents, edits configs, or blocks
the user.

Compatibility: any agent runtime (Claude Code, Codex CLI, generic harnesses).
Optional checker script needs Node.js >= 18.

## When this fires

- Before the FIRST subagent spawn of any fan-out (explore / build / verify / delegate).
- When asked what model or effort a subagent / worker / judge panel should get.

Do NOT fire for: model shopping or API pricing with no subagents in play;
loop/workflow STRUCTURE design (that is `loop-constructor`'s job — co-fire only
to size the agents its loop spawns); "shrink my API spend" asks (out of scope).

## Preflight

1. Identify the session's model capability tier and reasoning effort.
   Tiers: **frontier (opus-tier) > mid (sonnet-tier) > small (haiku-tier)**.
   Effort ladder: **low < medium < high < max**.
2. Effort not introspectable? **Assume `high`** — never assume low.
3. Runtime knob names differ — load `references/runtime-mapping.md` when emitting.

## The four rules — classify each task independently

| Rule | Model | Effort |
|---|---|---|
| **R1 peer/parallel co-work** — equal-difficulty shards, judge panels, adversarial verifiers, or a single delegated deep task (n=1 counts) | keep | keep |
| **R2 search/exploration** — codebase/web/evidence gathering | keep | down exactly ONE notch |
| **R2b very large search fan-out** — ~20+ homogeneous cheap lookups | down exactly ONE tier (e.g. opus-tier→sonnet-tier); already lowest → use R2 | keep |
| **R3 no rule matches** | keep | medium |

**Precedence & clamps**

- Work content wins: parallel-shaped exploration is R2, not R1.
- Mixed batch in one spawn → classify PER TASK, never one batch-wide setting.
- **HARD FLOOR:** `low` is never emitted; any computed sub-medium effort clamps
  UP to medium — every rule, every layer.
- One knob per layer: at most ONE effort notch OR ONE tier down, never both.

## Verify the pyramid shape

- **Two layers is the norm.** A third layer, or any haiku-tier pick from a
  higher-tier session, needs an explicit one-line justification in the report.
- Recursive: when a subagent itself fans out, re-apply the rules per layer —
  floor stays medium, at most one tier drop per layer, and the deeper pyramid
  is flagged as an exception.

## Report & overrides

- Emit ONE line per subagent: `rule=<id> tier=<tier> effort=<notch>` plus any
  clamp / assumed-high / justification flags. Rule ids: `peer` / `search` /
  `search-tier-drop` / `default` / `override`.
- An explicit user override WINS: apply it verbatim, adding a one-line floor
  caveat if it sits below medium. Advisory means advisory — never block. In
  `scripts/decide.mjs` pass it as `task.user_override = {tier?, effort?}` (a
  guessed `override` key is ignored).
- Runtime lacking a knob: map to the nearest supported notch and state the
  degradation; never emit an unsupported parameter (see the mapping reference).

## Deterministic check (optional)

Verify a sizing plan mechanically (stdlib node, JSON in/out):

```bash
node scripts/decide.mjs '{"session":{"tier":"opus-tier","effort":"max"},"tasks":[{"peer":true},{"exploratory":true,"fan_out_size":24,"homogeneous_cheap":true}]}'
```

`checkAssignment(session, assignment)` audits a proposed assignment and flags
`below-floor` / `both-knobs-dropped` / `skipped-tier` / `needs-justification`.

## Files

| File | Load when |
|---|---|
| `references/runtime-mapping.md` | emitting knobs for a concrete runtime (Claude Code / Codex CLI / generic), or the session's knobs are unclear |
| `scripts/decide.mjs` | you want the decision or an assignment audit computed deterministically |

Metrics: decision accuracy = `evals/run_all.mjs` fixture table (target 100%);
activation precision ≥ 0.9 on `evals/cases/trigger-cases.json`.
