# trigger-eval — measure triggering empirically, don't just score the text

The pipeline's weakest spot is that it reasons about a skill's `description`
**statically**: guidance scores it, zipper rewrites it, but nothing ever *runs*
the skill to see whether it actually fires on the right prompts. `scripts/trigger_eval.mjs`
closes that gap, porting the idea of Anthropic skill-creator's `run_eval.py` /
`improve_description.py`: feed labeled prompts to a judge, measure trigger
precision/recall against the labels.

This is the empirical evidence for the **`metrics` pillar** (triggering accuracy).
It is shared tooling: `skill-guidance` cites it as the way to satisfy the
metrics pillar, and `skill-zipper`'s Retrigger operation uses it to prove a
description rewrite improved triggering instead of only re-scoring the prose.

## Cases file

```json
{
  "cases": [
    { "id": "t1", "prompt": "客观评价这条耳机的声音",            "should_trigger": true },
    { "id": "t2", "prompt": "帮我把这张专辑写一篇乐评",            "should_trigger": false },
    { "id": "n1", "prompt": "这个 DAC 推得动 300 欧的耳机吗",     "should_trigger": true }
  ]
}
```

Label each prompt: `should_trigger: true` for prompts the skill MUST fire on,
`false` for adjacent prompts it must NOT steal (the neighbours from the spec's
`Do NOT use` list and `adversarial_checklist` are the best `false` cases). Aim
for a balanced set — at least 3 of each — and hold some out so you are not
tuning the description to the same prompts you score on.

## Running it

```bash
# Real measurement — spends tokens, needs an authenticated `claude` CLI:
node ../skill-engineer/scripts/trigger_eval.mjs <skill-dir> cases.json --judge cli --threshold 0.9 --json

# Deterministic self-test of the runner's math (no tokens, used by evals/run_all.mjs):
node ../skill-engineer/scripts/trigger_eval.mjs <skill-dir> cases.json --judge mock --mock-rule YES
```

- `--judge cli` asks `claude -p`, for each case, whether the description alone
  would invoke the skill, and parses a `TRIGGER` / `SKIP` verdict.
- `--judge mock` triggers iff the prompt contains the `--mock-rule` substring.
  It exists ONLY to verify this runner deterministically; it tells you nothing
  about a real description.
- Exit code is `0` iff `precision >= threshold AND recall >= threshold`, so the
  conductor / CI can gate on it. The full report (confusion matrix + per-case
  outcomes) conforms to `assets/trigger-eval.schema.json`.

## How it fits the build

During Step 3/5 (write + run evals), a skill whose top driver is triggering
should ship a `cases.json` and record a `--judge cli` run in the build report's
`metrics`. A green mock self-test proves the harness works; only the `cli` run
proves the *description* works — do not report triggering accuracy from the mock
judge.
