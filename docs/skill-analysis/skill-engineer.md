# skill-engineer — benchmark report

*Subject:* `vinceSKILLcreate/skill-engineer/` (Stage 2 of the skill pipeline).
*Lens:* benchmarked only against class-(A) heavyweight/industrial skills. Paths relative to `/Users/vince/playground/skill-developer/`.

## 1. What it does

Turns a `skill-guidance` **handoff-spec** into a built, tested skill, then hands a `build-report.json` to `skill-zipper`. It ingests the spec (`rules/ingest-spec.md`), orders `prioritized_actions` into a TDD backlog, writes **failing eval cases first** and proves red against a stub (`rules/red-green-refactor.md`, `rules/run-evals.md`), implements the spec's 8 design units to green (`rules/build-design-units.md`), gates on a **re-runnable verification harness** (`rules/verification-harness.md`), and emits a schema-validated report (`assets/build-report.schema.json`). It runs autonomously but forbids reporting green without executed evals (`SKILL.md:17-19`).

## 2. Industrial-grade features (cited)

- **Spec-driven scaffold generator** — `scripts/scaffold_skill.mjs` reads the handoff-spec and deterministically creates the dir skeleton + a SKILL.md stub seeded from `intent`/`triggers`/`protocol` (`scaffold_skill.mjs:36-44`). It is altitude-aware: lite suppresses empty `scripts/`/`references/` unless a control or resource needs them (`:47-54`), and idempotent — never overwrites without `--force` (`:95-100`).
- **Red→green→refactor with a *required artifact*** — "red by construction" is explicitly rejected; the stub must import cleanly and **return a WRONG sentinel (never `null`)** so the harness reaches assertions and emits real `FAIL` lines into `.skill-engineer/red/red.log` (`verification-harness.md:35-49`). A log that is only `ERR_MODULE_NOT_FOUND` or a bare `EXIT:1` is rejected (`:46-48`).
- **Executable verification harness as the gate** — for any script skill the mechanism must live in `scripts/` and be **imported** by `evals/run_all.mjs`; a harness that embeds its own copy is rejected as tautological (`verification-harness.md:11-16`). The report must carry `harness_ran`, `harness_path`, and real `command_output`; "the conductor re-runs `harness_path`" (`:91-95`).
- **Build-report JSON contract** — `assets/build-report.schema.json` is strict (`additionalProperties:false`), enums `design_units.status` and `verification`, and **gates adversarial coverage**: `tests.checklist_coverage` is `required` with `minItems:1`, one `{edge,case_id,passed}` per spec `adversarial_checklist` entry (`schema:54,82-96`). This makes happy-path-only structurally non-green (`verification-harness.md:73-85`).
- **Anti-tautology + value-pinned assertions** — bans `grep "Do NOT"` as a negative test ("would this pass if the protected step were deleted?", `verification-harness.md:62-71`) and bans shape-only predicates (`typeof x==='object'`); error cases must assert type/message, fuzzy oracles pin exact output (`build-design-units.md:44-49`).
- **A self-test that actually passes** — `evals/run_all.mjs` runs the scaffolder over a real spec and asserts skeleton/idempotency/lite-noise-suppression + that the schema gates checklist/harness. Verified GREEN, exit 0, 5/5.
- **Hard-won platform fix encoded** — the macOS `/tmp`→`/private/tmp` run-as-main bug is documented with the `realpathSync` fix **and** a mandated CLI eval case so a broken entry point fails the harness (`build-design-units.md:31-42`).

## 3. Best-in-class external counterparts

- **anthropics `skill-creator`** (`anthropics-skills/skills/skill-creator/`). Scaffolds by **copying a static inline template** ("ALWAYS use this exact template", `SKILL.md:122`) — there is *no* init/scaffold script. Its bundled scripts are downstream: `quick_validate.py` (frontmatter linter: kebab name, ≤1024-char description, allowed-keys), `package_skill.py` (validate-then-zip to `.skill`, excludes `evals/`), and an empirical **trigger-eval harness** — `run_eval.py` spawns real `claude -p` subprocesses and measures trigger-rate across N runs vs a threshold; `run_loop.py` adds a **train/test split to prevent description overfitting** (`run_loop.py:24-44`).
- **pptx / xlsx / docx** (`anthropics-skills/skills/*`). The bar for *bundling* heavy scripts: `office/validate.py` checks output XML against bundled **OOXML XSD schemas** with `--auto-repair`, plus `pack/unpack/clean`. These are runtime validators the agent runs on its *output* — and notably they ship **zero unit tests / eval harness** for the scripts themselves (`find … -iname '*test*'` → empty).
- **superpowers `test-driven-development` + `verification-before-completion`**. Pure behavioral law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST", "Verify RED — MANDATORY, never skip" (TDD `SKILL.md:33,113-115`); "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE" with a gate function and a regression red-green check (`verification-before-completion:18-38,84-88`). No scripts.
- **addyosmani `test-driven-development` / `source-driven-development`**. The Prove-It pattern (reproduce bug as failing test first), test-state-not-interactions, the test pyramid, and (source-driven) cite-every-decision discipline.

## 4. Head-to-head

**Stronger.**
- *Scaffolding* — skill-engineer ships a **spec-driven generator** (`scaffold_skill.mjs`) that skill-creator lacks entirely; skill-creator pastes a fixed template, so its scaffold cannot adapt dir layout to altitude/controls/resources the way `:47-54` does.
- *Testing bundled scripts* — it **mandates a re-runnable harness that imports the `scripts/` mechanism** (`verification-harness.md:11-16`). pptx/xlsx/docx — the heavyweight script exemplars — ship none; their validators check output, not the script. This is the engineer's single biggest edge over the official corpus.
- *Honesty contract* — the superpowers law is enforced **as a machine-checked schema** (`harness_ran`/`command_output`, `checklist_coverage.minItems:1`) that a downstream conductor re-runs, not just prose the agent may ignore.

**On par.**
- *Red→green discipline* — matches superpowers/addyosmani in spirit and arguably exceeds it in evidence (a saved `red.log` with ≥1 real `FAIL` line, `verification-harness.md:43-48`), though it leans on the same self-discipline to actually run.
- *Pull-the-method* — grounding TDD in the develop-principle KB (`SKILL.md:31-38`) parallels addyosmani's source-driven citing.

**Weaker.**
- *Trigger evaluation* — skill-creator empirically measures trigger-rate with real subagents and a **train/test split** (`run_eval.py`, `run_loop.py`). skill-engineer *describes* subagent trajectory runs (`run-evals.md:46-53`) but ships **no executable trigger-eval runner**; for behavioral skills the "harness" is the agent following prose. The committed `run_all.mjs` only tests the engineer's *own* scaffolder.
- *Packaging / envelope lint* — no analogue to `package_skill.py` (zip to `.skill`) or `quick_validate.py` (name/description length-limit lint). Frontmatter correctness is asserted by hand, not a linter. (Packaging arguably belongs to the zipper, but a `quick_validate`-style gate would catch envelope bugs here.)

## 5. Gaps & recommendations

1. **Ship a trigger-eval runner.** Port skill-creator's `run_eval.py` pattern (real `claude -p`, trigger-rate vs threshold, train/test split) as `evals/trigger_eval.mjs`. Today the #1-driver `trigger` unit (`build-design-units.md:10`) is verified by prose, not measurement — the one thing skill-creator proves empirically.
2. **Bundle a `quick_validate`-style frontmatter linter** the engineer runs before writing the report (kebab name, ≤1024-char description, no angle brackets, allowed keys) — catches envelope bugs the JSON schema doesn't cover.
3. **Borrow XSD-grade output validation as a worked example.** When a target skill emits structured artifacts, point the engineer at the pptx/xlsx `validate.py` pattern (validate output against a schema) so generated skills inherit that habit.
4. **Make the LLM-behavioral path less honor-system.** For lite behavioral skills the gate degrades to self-grading; adopt skill-creator's grader-subagent + `eval_metadata.json` so even no-script skills get an independent, re-runnable judgment.
5. **Persist the regression set as a file artifact.** `run-evals.md:70-75` seeds regression from negative cases but keeps it in-context; write it to `evals/regression.json` so later iterations and the conductor can actually re-run it.

## 6. Verdict

For the *build-and-test* stage this is genuinely industrial-grade and in two respects **ahead of the official corpus**: a spec-driven scaffold generator skill-creator doesn't have, and a mandated import-the-script verification harness that pptx/xlsx/docx never ship. Its gap is empirical *trigger* measurement — skill-creator's `run_eval`/`run_loop` is the one capability the engineer specifies but doesn't yet execute.
