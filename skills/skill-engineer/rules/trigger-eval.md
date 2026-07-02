# trigger-eval — measure triggering empirically, don't just score the text

The pipeline reasons about a skill's `description` statically (guidance scores
it, zipper rewrites it) — but only a run shows whether the skill actually fires
on the right prompts and stays quiet on its neighbours. `scripts/trigger_eval.mjs`
is that run: labeled prompts → judge → precision/recall vs the labels. It is
the empirical evidence for the **`metrics` pillar**, and the zipper's
Retrigger operation uses it to prove a description rewrite helped rather than
just re-scoring the prose.

**When required:** at `full` altitude, or whenever triggering is a top driver
of the skill's value (the spec's `trigger` unit or a P0/P1 action says so).

## Cases file — mirror skill-creator's tuning-loop shape

```json
{
  "cases": [
    { "id": "t1", "prompt": "客观评价这条耳机的声音",        "should_trigger": true },
    { "id": "f1", "prompt": "帮我把这张专辑写一篇乐评",        "should_trigger": false },
    { "id": "t2", "prompt": "这个 DAC 推得动 300 欧的耳机吗", "should_trigger": true,  "holdout": true },
    { "id": "f2", "prompt": "推荐一条一千元内的耳机",          "should_trigger": false, "holdout": true }
  ]
}
```

Anthropic's skill-creator tunes descriptions with ~20 queries, and its numbers
are good defaults because each guards against a distinct failure:

- **~half `should_trigger: true`, half `false`** — the `false` cases must be
  *near-misses* (the spec's "Do NOT use" neighbours, sibling-skill territory),
  because far-away negatives test nothing.
- **~40% marked `"holdout": true`** — never edit the description against
  holdout cases; the runner gates on the holdout slice separately, which is
  what catches a description tuned to its own test set.
- **`--runs 3`** — a single LLM-judge call is noisy; majority-of-3 gives a
  stable trigger rate.

## Running it

```bash
# Real measurement — spends tokens, needs an authenticated `claude` CLI:
node ../skill-engineer/scripts/trigger_eval.mjs <skill-dir> cases.json \
  --judge cli --runs 3 --threshold 0.9 --json

# Deterministic self-test of the runner's math (no tokens; used by evals/run_all.mjs):
node ../skill-engineer/scripts/trigger_eval.mjs <skill-dir> cases.json --judge mock --mock-rule YES
```

- `--judge cli` asks `claude -p` whether the description alone would invoke
  the skill (add `--model` to pin the judge model to your daily driver).
- `--judge mock` triggers iff the prompt contains the `--mock-rule` substring —
  it verifies the runner deterministically and says nothing about a real
  description. Never report triggering accuracy from the mock judge.
- Exit 0 iff combined precision AND recall ≥ threshold, **and** the holdout
  slice (when present) clears the threshold too. Report shape:
  `assets/trigger-eval.schema.json`.

## Tuning loop (when the eval fails)

Iterate like skill-creator's `run_loop`, at most ~5 rounds: read the FP/FN
cases → adjust the description (sharper verbs, an explicit do-NOT naming the
neighbour that stole the FP) → re-run → **select by the holdout score, not the
train score**. If 5 rounds don't converge, the problem is usually scope, not
wording — send it back to the spec's `trigger` design.

## Sibling collision battery (cross-skill)

Per-skill precision/recall misses the real deployment failure: two installed
skills whose descriptions overlap fight over the same prompts. When the skill
ships into a multi-skill install, run the negatives against the *sibling*
descriptions too (same cases file, each sibling's dir) and confirm each prompt
triggers exactly its intended owner. The conductor's final acceptance and the
zipper's Retrigger both cite this as the anti-over-trigger evidence.

## How it fits the build

Ship the labeled `cases.json` under `<target>/evals/` (it is a regression
asset, not scratch), record the `--judge cli` run in the build report's
`metrics` note, and keep the holdout labels stable across iterations so later
runs stay comparable.
