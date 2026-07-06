You are the eval_tester, not the skill_tester.

Read:
1. `/Users/vince/playground/skill-developer/eval_exchange/SPEC.md`
2. `/Users/vince/playground/skill-developer/eval_exchange/sessions/20260706-095235+0800-loop-constructor-codex-v0/SESSION.json`

Use the exact `session_id` from `SESSION.json`
(`20260706-095235+0800-loop-constructor-codex-v0`). Dynamically read the session directory
and `skill-tester/manifest.json`; do NOT rely on this prompt to contain the cases,
expected outputs, or answers. The session absolute path is:
`/Users/vince/playground/skill-developer/eval_exchange/sessions/20260706-095235+0800-loop-constructor-codex-v0`

Create ONE new directory under `eval-tester-runs/` named `codex-<YYYYMMDD-HHMMSS+TZ>`
(get the timestamp from `date +%Y%m%d-%H%M%S%z`). Do NOT modify the target skill,
`skill-tester/`, or any previous eval tester run.

Keep this run BOUNDED and cheap — this is meant to be a single small Codex pass:
- Run the deterministic checks exactly as written in each case's `expected_behavior` and
  `deterministic_commands` (repo_root = `/Users/vince/playground/skill-developer`). They
  are re-runnable and require no npm install (node stdlib only).
- For case-01 and case-02: re-run the linter on the produced `design.json`, then JUDGE the
  produced design + rendered runbook against that case's `expected_behavior` (staged shape,
  D0–D6 completeness, contract sufficiency, roles separation, the codex-exec runbook
  preamble, and ZERO banned Claude-primitive tokens —
  `run_environment.banned_claude_primitive_tokens`).
- For case-03: run the four deterministic commands (battery 71/71, `cmp` linter identity,
  description <=320, codex-runtime.md present) and render both goldens into a TEMP dir to
  grep for banned tokens. Do not write into the repo.
- `open_probe_policy` is enabled with `max_extra_cases_per_eval_tester: 2`. Use at most 2
  extra probes, and prefer probing the linter's discrimination (e.g. copy a produced
  design, break one field, confirm the linter FAILs it) over inventing new tasks. Write
  extra probes under `artifacts/extra-cases/`.

Write into your run dir:
- `status.json`
- `transcript.md` (files read, commands run with their exit codes/output, how you judged,
  where you could not decide)
- `score.json`
- `findings.json`
- `artifact-manifest.json`
- supporting files under `artifacts/`

Fail closed: on any missing file, inconsistent path, non-reproducible check, or
insufficient evidence, set `status: blocked` (or `fail`) with a `blocked_reason` and record
it in `findings.json`. Severities P0/P1 are blocking.

End by writing (or appending) the session's `claude-readme.md` and the `aggregate/`
summary per SPEC §8 and §10, giving a clear pass | fail | blocked verdict.
