# The build report (handoff to vince-skill-zipper)

The deliverable of this stage. It must validate against
`assets/build-report.schema.json`. Write it to
`<target>/.skill-engineer/build-report.json`. `vince-skill-zipper` reads it cold
to know what was built and what is safe to compress.

## Field guide

- **target** — `path`, `name` of the built skill.
- **source_spec** — `{path}` of the guidance handoff-spec you built from, or
  `null` if the user supplied the design directly.
- **altitude** — carried from the spec; sizes how much the zipper should expect.
- **built.design_units** — one entry per unit you touched: `unit`, `status`
  (`implemented` / `minimal` / `na`), `files`, optional `note`. This tells the
  zipper which units carry real content vs. stubs.
- **built.files_created / files_modified** — every path you wrote, so the zipper
  knows the surface.
- **tests** — `eval_cases` (`id`, `name`, `passed`, `evidence`), `totals`
  (`passed`/`failed`/`total`), `regression_cases`, and `trajectory_checked`
  (did grading inspect tool calls / loaded files / protocol steps, or only final
  text?). `regression_cases` is `[]` on a first build; on later iterations it
  lists the eval-case **ids** you track as known failures or adjacent
  false-triggers.
  `checklist_coverage` is the E-gate map from every spec
  `recommended_design.adversarial_checklist` entry to a real green case:
  `{edge, case_id, passed}`. Copy `edge` verbatim, point `case_id` at an
  existing `eval_cases[].id`, and set `passed: true` only when that case's own
  `passed` is true. Empty, invented, duplicate-only, or failing mappings are
  gate failures.
- **actions_resolved** — every `prioritized_action` id from the spec with
  `status` (`done` / `deferred` / `blocked`) and a `note`. Every P0 should be
  `done` for a clean handoff; a `blocked` P0 must be explained.
- **verification** — `ran` (did evals actually execute?), `all_required_passed`,
  `evidence` (pass counts / command output), and `harness_required`. Set
  `harness_required: true` for any deterministic/script skill or whenever
  `built.files_created/files_modified` touches `scripts/`; then include
  `harness_ran: true`, `harness_path`, and captured `command_output` with real
  `PASS <case>` lines. Set `harness_required: false` only for pure
  LLM-behavioral skills with no scripts. This is the honesty gate: if `ran` is
  false, or a required harness is missing, the build is not done.
- **handoff** — `next_skill: "vince-skill-zipper"`, `notes` (e.g. "SKILL.md is
  long, candidate for Compress/Encapsulate"; point the zipper at what's verbose),
  `blocking` (anything that must be resolved before shipping).

## Validate before finishing

```bash
node -e "JSON.parse(require('fs').readFileSync('<target>/.skill-engineer/build-report.json','utf8'))"
```
Confirm: it parses, every spec P0 action appears in `actions_resolved`,
`verification.ran` is `true` with real evidence, any required harness is
rerunnable, `tests.totals` adds up, and every adversarial checklist edge maps to
an existing passing case. Then print a 3-line summary: tests passed/total, P0s
done/total, checklist covered/total, harness status, and the handoff note.

## Honesty

Do not report `all_required_passed: true` unless the eval cases actually ran and
passed — the whole pipeline trusts this flag. A built-but-untested skill is a
draft; say so in `verification.evidence` and `handoff.blocking` rather than
inflating the report.
