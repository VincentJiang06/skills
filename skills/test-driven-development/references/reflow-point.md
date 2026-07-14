# Reflow point — capturing rework signals as regression candidates [E8]

**Load this when** a user (or reviewing agent) manually CORRECTS this skill's
test output — rewrites an assertion you produced, deletes a test you added,
re-classifies an engage/skip call, or bypasses the skill entirely. Online
rework signals are a factory setting, not a post-launch patch [E8]; the #1
debt symptom is the user silently bypassing the skill [S8].

## Capture format (one JSON object per correction)

Append to `evals/corrections.jsonl` in this skill (create if absent — note:
`evals/` is local/gitignored under the repo's minimal-runnable policy, so this
is a DOCUMENTED manual step, not live plumbing; owner call U3/A40):

```json
{
  "date": "2026-07-14",
  "context": "one line: repo, task, which gate/section was involved",
  "original_output": "what the skill produced (the test/assertion/decision, verbatim or a minimal excerpt)",
  "user_correction": "what the human changed it to, verbatim",
  "suspected_failure_class": "vacuous-test | unwatched-red | over-testing | wrong-mode | injection-obeyed | stale-convention | other",
  "reproducible": null,
  "violates_spec": null
}
```

## Double filter — before it becomes a fixture

A correction graduates into a candidate regression scenario ONLY if both hold
(fill the two nulls):

1. **reproducible** — re-running the same task from the same base tree
   reproduces the original (wrong) output.
2. **violates_spec** — the original output actually breaks a rule this skill
   states (cite the SKILL.md section / reference), not merely the user's
   taste. Taste-only corrections are style feedback, not regression cases.

Both true → build a new `evals/fixtures/<scenario>/` in the standard shape
(`task.json`, `base/`, `candidates/good` = the corrected output,
`candidates/bad` = the original output), register its designated metric in
`run_all.py`'s `EXPECTED_BAD_FAILURE`, and watch the new check fail before the
grader/rule change makes it pass (red-first applies to the harness itself).

Cadence: batch-review captured corrections at each version bump; a correction
that recurs twice before review jumps the queue.
