You are the skill_tester, not the eval_tester.

Read:
1. `/Users/vince/playground/skill-developer/eval_exchange/SPEC.md`
2. `/Users/vince/playground/skill-developer/eval_exchange/sessions/20260706-095235+0800-loop-constructor-codex-v0/SESSION.json`

Use the exact `session_id` from `SESSION.json`
(`20260706-095235+0800-loop-constructor-codex-v0`).

Your job: execute the target skill `loop-constructor-codex`
(`/Users/vince/playground/skill-developer/skills/loop-constructor-codex`) as a fresh
executor, for the generation cases in `SESSION.json` (case-01, case-02). Do NOT modify the
target skill directory (`may_modify_target_skill: false`). case-03 is a static
skill-fidelity check for the eval_tester — you produce nothing for it.

For each of case-01 and case-02, run the skill's five phases honestly:
- SELECT: full D0–D6 decision log (`references/loop-selection.md`).
- NEGOTIATE: roles (planner/generator/evaluator, evaluator fresh+adversarial) + the
  negotiated contract of testable assertions (`references/loops-model.md`).
- FILL: the staged loop-design JSON (`references/loop-design-shape.md`).
- VERIFY: run the REAL linter until it PASSes, then do the fresh-reader checklist
  (`assets/fresh-reader-checklist.md`) honestly.
- PERSIST: run the REAL renderer (`scripts/render_loop_doc.mjs`). The renderer writes to a
  `.loop/` dir relative to cwd — run it from inside `skill-tester/produced/<case_id>/` (or
  move the output there) so the paths in the manifest resolve.

Write only under `skill-tester/`:
- `skill-tester/produced/<case_id>/design.json` — the linter-valid design.
- `skill-tester/produced/<case_id>/.loop/<slug>.loop.md` and `.loop.json` — rendered.
- `skill-tester/produced/<case_id>/output.md` — a summary: the D0–D6 decision log, the
  roles + contract, the fresh-reader verdict, and the exact lint command + its PASS output.
- `skill-tester/manifest.json` (with `ready_for_external_eval: true` and honest
  `known_limitations`).
- `skill-tester/notes.md` — any friction you hit using the skill (valuable dogfood signal).

Do not write `eval-tester-runs/`, `aggregate/`, or final scores.
