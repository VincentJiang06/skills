# Canonical loop-design shape

The object loop-constructor produces and `scripts/lint_loop_design.mjs`
validates. Build to **these exact keys** — the linter binds to them. The shape is
informed by `loop-principle/templates/{dod_spec,loop_design,loop_quality_rubric}`
but is the dedicated JSON the linter checks (the KB templates are the
prose/Markdown render of the same design).

```json
{
  "task": "<string: the concrete task, one line>",
  "definition_of_done": {
    "goal": "<single verifiable goal — a predicate/command, NOT prose>",
    "machine_verifiable": true
  },
  "loop_pattern": "retry | plan_execute_verify | explore_narrow | review | human_in_the_loop",
  "feedback_signal": {
    "check": "<runnable cmd — REQUIRED, non-empty; this is the anchor>",
    "expect": "pass"
  },
  "stop_conditions": {
    "success": "<string>",
    "failure": ["<>=1 failure branch>"],
    "escalate": ["<escalation trigger>", "..."],
    "max_iterations": 8
  },
  "human_placement": "in_the_loop | on_the_loop",
  "maker_checker": {
    "separate_checker": true,
    "scope": "<string: what the fresh-context checker reviews>"
  },
  "harness_primitives": ["<>=0 items>"],
  "risk_guards": [
    { "risk": "<string>", "mitigation": "<string>" }
  ]
}
```

## What the linter enforces (FAIL rules)

| Field | FAILs when |
|-------|------------|
| `feedback_signal.check` | missing / empty / whitespace-only / null (presence ≠ a real signal). **Anchor.** |
| `stop_conditions` | missing or `{}` (empty) |
| `stop_conditions.failure` | missing or empty list |
| `stop_conditions.max_iterations` | missing or not a positive integer (the cap is mandatory) |
| `human_placement` | missing or not `in_the_loop`/`on_the_loop` |
| `maker_checker.separate_checker` | missing object or `separate_checker !== true` |
| `risk_guards` | missing or empty list, or any item missing `risk`/`mitigation` |
| `definition_of_done` | missing object, empty `goal`, or `machine_verifiable !== true` (the flag is **author-attested** — the linter gates on the boolean, it does not NLP-inspect the goal string; write a real predicate/command) |
| `loop_pattern` | missing or not one of the five patterns |
| (input itself) | non-JSON / non-object / array / empty → graceful FAIL, never a crash |

A complete, check-first design → all `PASS`, exit 0. See
`assets/golden-loop-design.json` for a passing fixture to copy.
